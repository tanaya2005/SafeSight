# Attribution

## PPE Detection Core Engine

The PPE (Personal Protective Equipment) detection logic in this `ai-engine` directory
is based on and adapted from the open-source project:

**PPE-Detection-YOLO-Deep_SORT** by [AnshulSood11](https://github.com/AnshulSood11)
- Repository: https://github.com/AnshulSood11/PPE-Detection-YOLO-Deep_SORT
- Description: Real-time PPE detection and tracking using YOLO v3 and Deep SORT

### What we used / adapted:
- `yolo.py` — YOLO v3 inference pipeline
- `config.json` — Model configuration
- `object_tracking/` — Deep SORT tracker (application_util + deep_sort modules)
- `utils/` — Bounding box, color, and image utility functions
- Pre-trained model weights: `full_yolo3_helmet_and_person.h5`, `mars-small128.pb`

### What we built on top:
- `processor.py` — Custom integration layer connecting PPE detection to the Safe-Sight backend pipeline (real-time frame processing, WebSocket output, alert triggering)

### Third-party acknowledgements (from the original project):
- [experiencor/keras-yolo3](https://github.com/experiencor/keras-yolo3) — YOLO v3 implementation
- [nwojke/deep_sort](https://github.com/nwojke/deep_sort) — Deep SORT tracking implementation
- [rekon/keras-yolo2](https://github.com/rekon/keras-yolo2) — Training data reference

### Model Weights
The pre-trained model files (`*.h5`, `*.pb`) are **not included in this repository** due to their large size.
Download them from the original project's OneDrive links or contact the team for access.

---
*This attribution is provided in good faith for a hackathon (Hackverse 2.0) academic/non-commercial submission.*
