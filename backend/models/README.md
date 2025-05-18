# Body Language Analysis Models

This directory contains models used for the TensorFlow-based body language analysis in the interview prep application.

## Models

1. **Face Detection Model**: `face_detection_model.tflite`
   - Used for eye contact analysis
   - [Original source](https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/face_detection/android/face_detection_full_range_sparse_1.0_uint8.tflite)

2. **MoveNet** (loaded dynamically from TensorFlow Hub)
   - Used for posture analysis
   - Model URL: https://tfhub.dev/google/movenet/singlepose/lightning/4

## Setup Instructions

The face detection model should be automatically downloaded during setup, but if it's missing, run the following command from the project root:

```bash
mkdir -p backend/temp && cd backend/temp && \
curl -L https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/face_detection/android/face_detection_full_range_sparse_1.0_uint8.tflite -o face_detection_model.tflite && \
mv face_detection_model.tflite ../models/
```

The MoveNet model will be downloaded automatically the first time the application runs.

## Note

These models require TensorFlow 2.x. Make sure all dependencies in `requirements.txt` are installed before running the application. 