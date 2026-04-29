import cv2
import numpy as np
from ultralytics import YOLO
from sklearn.decomposition import PCA
import os
import threading

class RestrictedZoneDetector:
    def __init__(self, models_dir="construction_hazard", nms_threshold=0.45, conf_threshold=0.2):
        self.models = []
        self.conf_threshold = conf_threshold
        self.nms_threshold = nms_threshold
        self.last_polygon = None
        self.frame_count = 0
        self.process_every_n = 3 # Optimize by processing every N frames
        
        # Project mapping for the hazard models
        self.project_classes = {
            6: "Safety Cone",
            5: "Person"
        }

        # Load all 5 models once
        print(f"📦 Loading cone detection models from {models_dir}...")
        model_files = [f for f in os.listdir(models_dir) if f.endswith('.onnx') or f.endswith('.pt')]
        for f in model_files:
            path = os.path.join(models_dir, f)
            try:
                # task='detect' is important for ONNX loading
                m = YOLO(path, task='detect')
                self.models.append(m)
                print(f"  ✅ Loaded {f}")
            except Exception as e:
                print(f"  ❌ Failed to load {f}: {e}")

    def ransac_fit_line(self, points, iterations=2000, threshold=18):
        ptr = np.array(points, dtype=np.float32)
        n = len(ptr)
        if n < 2: return None, None

        best_mask = np.zeros(n, dtype=bool)
        best_count = 0

        for _ in range(iterations):
            idx = np.random.choice(n, 2, replace=False)
            p1, p2 = ptr[idx[0]], ptr[idx[1]]
            direction = p2 - p1
            length = np.linalg.norm(direction)
            if length < 1e-6: continue
            normal = np.array([-direction[1], direction[0]]) / length
            dist = np.abs((ptr - p1) @ normal)
            mask = dist < threshold
            count = mask.sum()
            if count > best_count:
                best_count = count
                best_mask = mask

        inlier_pts = ptr[best_mask]
        if len(inlier_pts) < 2: return None, None

        pca = PCA(n_components=2)
        pca.fit(inlier_pts)
        vx, vy = pca.components_[0]
        x0, y0 = pca.mean_
        return best_mask, (vx, vy, x0, y0)

    def row_endpoints(self, row_pts, vx, vy, x0, y0):
        direction = np.array([vx, vy])
        projs = (row_pts - np.array([x0, y0])) @ direction
        return row_pts[np.argmin(projs)], row_pts[np.argmax(projs)]

    def offset_point(self, pt, normal, dist):
        return pt + normal * dist

    def build_zone_polygon(self, cone_centers, ransac_threshold=18, single_line_buffer=60, shrink_px=8):
        pts = np.array(cone_centers, dtype=np.float32)
        n = len(pts)
        if n < 3: return None

        mask1, line1 = self.ransac_fit_line(pts, threshold=ransac_threshold)
        if line1 is None:
            return cv2.convexHull(pts.reshape(-1, 1, 2).astype(np.int32))

        inlier_ratio = mask1.sum() / n
        vx, vy, x0, y0 = line1

        if inlier_ratio >= 0.75:
            row_pts = pts[mask1]
            left_pt, right_pt = self.row_endpoints(row_pts, vx, vy, x0, y0)
            normal = np.array([-vy, vx], dtype=np.float32)
            buf = single_line_buffer
            tl = self.offset_point(left_pt, normal, buf)
            tr = self.offset_point(right_pt, normal, buf)
            bl = self.offset_point(left_pt, normal, -buf)
            br = self.offset_point(right_pt, normal, -buf)
            polygon = np.array([tl, tr, br, bl], dtype=np.float32)
        else:
            row1_pts = pts[mask1]
            remaining = pts[~mask1]
            if len(remaining) < 2:
                left_pt, right_pt = self.row_endpoints(row1_pts, vx, vy, x0, y0)
                normal = np.array([-vy, vx], dtype=np.float32)
                buf = single_line_buffer
                polygon = np.array([
                    self.offset_point(left_pt, normal, buf),
                    self.offset_point(right_pt, normal, buf),
                    self.offset_point(right_pt, normal, -buf),
                    self.offset_point(left_pt, normal, -buf),
                ], dtype=np.float32)
            else:
                mask2, line2 = self.ransac_fit_line(remaining, threshold=ransac_threshold)
                if line2 is None:
                    row2_pts, vx2, vy2, x02, y02 = remaining, vx, vy, x0, y0
                else:
                    row2_pts = remaining[mask2]
                    vx2, vy2, x02, y02 = line2
                
                left1, right1 = self.row_endpoints(row1_pts, vx, vy, x0, y0)
                left2, right2 = self.row_endpoints(row2_pts, vx2, vy2, x02, y02)
                
                if row1_pts[:, 1].mean() < row2_pts[:, 1].mean():
                    top_l, top_r, bot_l, bot_r = left1, right1, left2, right2
                else:
                    top_l, top_r, bot_l, bot_r = left2, right2, left1, right1
                polygon = np.array([top_l, top_r, bot_r, bot_l], dtype=np.float32)

        if shrink_px > 0:
            center = polygon.mean(axis=0)
            shrunk = []
            for corner in polygon:
                d = center - corner
                norm = np.linalg.norm(d)
                shrunk.append(corner + (d / norm) * shrink_px if norm > 0 else corner)
            polygon = np.array(shrunk, dtype=np.float32)

        return np.int32(polygon)

    def perform_nms(self, boxes, scores, threshold):
        if not boxes: return []
        boxes_np = np.array(boxes)
        scores_np = np.array(scores)
        
        # Standard NMS
        indices = cv2.dnn.NMSBoxes(
            boxes_np.tolist(), 
            scores_np.tolist(), 
            self.conf_threshold, 
            threshold
        )
        return indices.flatten() if len(indices) > 0 else []

    def process(self, frame, worker_centers=None):
        """
        Main pipeline function for real-time processing.
        frame: The current CCTV frame
        worker_centers: List of (x, y, track_id) for intrusion detection
        """
        self.frame_count += 1
        h, w = frame.shape[:2]
        img_draw = frame.copy()
        
        # 1. OPTIMIZATION: Process detection every N frames
        if self.frame_count % self.process_every_n == 0 or self.last_polygon is None:
            # Resize for speed
            blob = cv2.resize(frame, (640, 480))
            
            all_boxes = []
            all_scores = []
            all_centers = []

            # 2. MULTI-MODEL DETECTION
            for model in self.models:
                # verbose=False for real-time performance
                results = model.predict(blob, conf=self.conf_threshold, verbose=False)
                for res in results:
                    for box in res.boxes:
                        cls_id = int(box.cls[0])
                        # Only care about Safety Cone (index 6)
                        if cls_id == 6:
                            x1, y1, x2, y2 = map(float, box.xyxy[0])
                            # Scale back to original frame size
                            x1, y1, x2, y2 = x1 * w / 640, y1 * h / 480, x2 * w / 640, y2 * h / 480
                            all_boxes.append([x1, y1, x2 - x1, y2 - y1]) # [x, y, w, h] for NMS
                            all_scores.append(float(box.conf[0]))
                            all_centers.append([(x1 + x2) / 2, (y1 + y2) / 2])

            # 3. MERGE & NMS
            keep_idx = self.perform_nms(all_boxes, all_scores, self.nms_threshold)
            final_centers = [all_centers[i] for i in keep_idx]
            final_boxes = [all_boxes[i] for i in keep_idx]

            # 4. BUILD POLYGON
            if len(final_centers) >= 3:
                self.last_polygon = self.build_zone_polygon(final_centers)
            else:
                self.last_polygon = None
            
            self.current_cone_boxes = final_boxes

        # 5. DRAW OVERLAYS
        overlay = frame.copy()
        
        # Draw Cone Bounding Boxes
        if hasattr(self, 'current_cone_boxes'):
            for x, y, bw, bh in self.current_cone_boxes:
                cv2.rectangle(img_draw, (int(x), int(y)), (int(x+bw), int(y+bh)), (0, 0, 255), 2)
                cv2.putText(img_draw, "CONE", (int(x), int(y-10)), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        # Draw Restricted Zone
        if self.last_polygon is not None:
            # Draw shaded zone
            cv2.fillPoly(overlay, [self.last_polygon], (0, 0, 255))
            img_draw = cv2.addWeighted(overlay, 0.4, img_draw, 0.6, 0)
            # Draw boundary lines
            cv2.polylines(img_draw, [self.last_polygon], True, (0, 0, 255), 3)

            # 6. INTRUSION DETECTION
            if worker_centers:
                for wx, wy, track_id in worker_centers:
                    # check if point is inside
                    dist = cv2.pointPolygonTest(self.last_polygon, (float(wx), float(wy)), False)
                    if dist >= 0:
                        # ALERT TRIGGER LOGIC (Hooked to existing alert system)
                        # The caller handles the actual alert triggering based on our return
                        cv2.putText(img_draw, "!!! ZONE INTRUSION !!!", (int(wx), int(wy-20)),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                        # We return a flag/list to the processor
                        if not hasattr(self, 'active_violations'): self.active_violations = set()
                        self.active_violations.add(track_id)

        return img_draw
