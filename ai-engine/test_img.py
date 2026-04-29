import cv2
import numpy as np
import onnxruntime as ort

print("Loading ONNX Model...")
session = ort.InferenceSession("best.onnx", providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name

frame = cv2.imread("test.jpg")
frame = cv2.resize(frame, (640, 640))
img_v8 = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
img_v8 = img_v8.astype(np.float32) / 255.0
img_v8 = np.transpose(img_v8, (2, 0, 1))
img_v8 = np.expand_dims(img_v8, axis=0)

print("Running inference...")
outputs = session.run(None, {input_name: img_v8})
preds = np.squeeze(outputs[0]).T

boxes = preds[:, :4]
scores = preds[:, 4:]
max_scores = np.max(scores, axis=1)
class_ids = np.argmax(scores, axis=1)

print("Max Score:", np.max(max_scores))

PPE_V8_CONF = 0.45
NMS_THRESH = 0.45

mask = max_scores >= PPE_V8_CONF
boxes = boxes[mask]
max_scores = max_scores[mask]
class_ids = class_ids[mask]

print(f"Boxes over threshold: {len(boxes)}")

if len(boxes) > 0:
    x = boxes[:, 0] - boxes[:, 2] / 2
    y = boxes[:, 1] - boxes[:, 3] / 2
    w = boxes[:, 2]
    h = boxes[:, 3]
    
    cv_boxes = np.column_stack((x, y, w, h)).tolist()
    cv_scores = max_scores.tolist()
    
    print("Running NMS...")
    indices = cv2.dnn.NMSBoxes(cv_boxes, cv_scores, PPE_V8_CONF, NMS_THRESH)
    print("Indices:", indices)
    
    if len(indices) > 0:
        for i in indices.flatten():
            print(f"Detected: class {class_ids[i]} at conf {cv_scores[i]}")

