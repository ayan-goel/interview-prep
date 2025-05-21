# Interview Prep API Backend

This backend provides a Flask-based API server for analyzing interview recordings. The system transcribes audio from videos and provides detailed feedback on content, delivery, and structure.

## Features

- Video upload and processing
- Audio transcription using OpenAI's Whisper speech recognition model
- Natural language processing for content analysis
- Detailed feedback generation on interview performance
- RESTful API for integration with frontend applications

## Setup and Installation

### Prerequisites

- Python 3.9+
- ffmpeg (for audio extraction and processing)
- CUDA-compatible GPU (optional, for faster transcription)

### Installation

1. **Clone this repository**

2. **Create a virtual environment and activate it**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables (optional)**
   You can configure the Whisper model size by setting the environment variable:
   ```bash
   export WHISPER_MODEL_SIZE=turbo  # Default is "turbo", other options: tiny, base, small, medium, large
   ```

5. **Run the application**
   ```bash
   python app.py
   ```
   
   The server will start on http://localhost:5000

## API Endpoints

### Health Check
- **GET /health**
  - Returns status of the API server

### Interview Analysis
- **POST /api/analyze**
  - Analyzes an interview recording
  - **Form data**:
    - `video` - The interview video file (MP4, WebM, etc.)
    - `question` - The interview question text
    - `audio` - Optional separate audio file for better transcription quality
  - **Response**: JSON with transcription and analysis results

## How It Works

The backend uses a simple and efficient pipeline:

1. **Audio Extraction**: Uses ffmpeg to extract audio from uploaded videos
2. **Speech Recognition**: Uses OpenAI's Whisper for accurate transcription
   ```python
   import whisper
   model = whisper.load_model("turbo")
   result = model.transcribe("audio.mp3")
   transcript = result["text"]
   ```
3. **Content Analysis**: Analyzes the transcript for content quality and relevance
4. **Feedback Generation**: Provides detailed feedback on performance

## Deployment

For production deployment:

1. Set up environment variables
2. Run with Gunicorn:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

3. For EC2 deployment, consider using:
   - Nginx as a reverse proxy
   - Supervisor to manage the process
   - SSL certificates for HTTPS

## Technology Stack

- Flask: Web framework
- OpenAI Whisper: Speech-to-text transcription
- TensorFlow/Transformers: Content analysis
- ffmpeg: Audio extraction and processing
- Python data science libraries (NumPy, etc.)

## Extending the Backend

- Custom models can be added in the `services` directory
- New API endpoints can be added to `api/routes.py` 