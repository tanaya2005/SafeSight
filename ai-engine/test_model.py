import cv2
import numpy as np
import onnxruntime as ort

print("Loading ONNX Model...")
session = ort.InferenceSession("best.onnx", providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name
print("Input:", input_name, session.get_inputs()[0].shape)

# Dummy frame (white)
frame = np.ones((640, 640, 3), dtype=np.uint8) * 255
img_v8 = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
img_v8 = img_v8.astype(np.float32) / 255.0
img_v8 = np.transpose(img_v8, (2, 0, 1))
img_v8 = np.expand_dims(img_v8, axis=0)

print("Running inference...")
outputs = session.run(None, {input_name: img_v8})
preds = np.squeeze(outputs[0]).T

print("Raw Preds Shape:", preds.shape)
boxes = preds[:, :4]
scores = preds[:, 4:]
max_scores = np.max(scores, axis=1)

print("Max Score out of all 8400 boxes:", np.max(max_scores))

# Top 5 scorers
top_ind = np.argsort(max_scores)[-5:]
print("Top 5 box max scores:\n", max_scores[top_ind])
print("Top 5 boxes:\n", boxes[top_ind])
print("Classes:\n", np.argmax(scores[top_ind], axis=1))

