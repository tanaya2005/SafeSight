import cv2
import time
import logging
import mediapipe as mp # NEW: Import mediapipe
from vit_face_recognition import FaceRecognitionModule, load_database_embeddings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

def main():
    print("="*60)
    print("   SafeSight - ViT Face Recognition (Optimized)")
    print("="*60)
    
    frm = FaceRecognitionModule()
    
    print("\n🌐 Fetching worker faces...")
    database_embeddings = load_database_embeddings(frm)
    
    # NEW: Push the dictionary into the optimized tensor matrix
    frm.update_database(database_embeddings) 
    
    # NEW: Initialize MediaPipe Face Detection (Much more accurate for industrial setups)
    mp_face_detection = mp.solutions.face_detection
    face_detector = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

    print("\n📷 Opening Webcam...")
    cap = cv2.VideoCapture(0)
    
    frame_count = 0
    cached_display_results = []
    
    while True:
        ret, frame = cap.read()
        if not ret: break
            
        frame_count += 1
        h, w, _ = frame.shape
        
        if frame_count % 5 == 0:
            cached_display_results.clear()
            
            # MediaPipe expects RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detector.process(rgb_frame)
            
            if results.detections:
                for detection in results.detections:
                    bboxC = detection.location_data.relative_bounding_box
                    
                    # Convert relative coordinates to absolute pixels
                    x = int(bboxC.xmin * w)
                    y = int(bboxC.ymin * h)
                    box_w = int(bboxC.width * w)
                    box_h = int(bboxC.height * h)
                    
                    # Add padding
                    pad_x, pad_y = int(box_w * 0.1), int(box_h * 0.1)
                    x1 = max(0, x - pad_x)
                    y1 = max(0, y - pad_y)
                    x2 = min(w, x + box_w + pad_x)
                    y2 = min(h, y + box_h + pad_y)
                    
                    face_crop = frame[y1:y2, x1:x2]
                    if face_crop.size == 0: continue
                    
                    try:
                        embedding = frm.get_embedding(face_crop)
                        # NEW: Call the optimized vectorized function
                        worker_id, highest_sim = frm.is_authorized(embedding, threshold=0.45)
                        
                        cached_display_results.append({
                            "bbox": (x1, y1, x2 - x1, y2 - y1),
                            "worker_id": worker_id,
                            "similarity": highest_sim
                        })
                    except Exception as e:
                        logging.error(f"Inference error: {e}")

        # --- UI Drawing Logic Remains the Same Here ---
        for res in cached_display_results:
            bx, by, bw, bh = res["bbox"]
            wid, sim = res["worker_id"], res["similarity"]
            color = (0, 255, 0) if wid else (0, 0, 255)
            label = f"Match: {wid} ({sim:.2f})" if wid else f"UNKNOWN ({sim:.2f})"
            
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), color, 2)
            cv2.putText(frame, label, (bx, max(30, by - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imshow('SafeSight Face Recognition', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()