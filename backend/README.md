# Interview Prep API Backend

This backend provides a Flask-based API server for analyzing interview recordings. The system transcribes audio from videos and provides detailed feedback on content, delivery, and structure.

## Features

- Video upload and processing
- Audio transcription using Google Cloud Speech-to-Text
- Natural language processing for content analysis
- Detailed feedback generation on interview performance
- RESTful API for integration with frontend applications

## Setup and Installation

### Prerequisites

- Python 3.9+
- ffmpeg (for audio extraction)
- Google Cloud Speech-to-Text API credentials

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

4. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your credentials.
   
   For Google Cloud credentials, encode your service account JSON with:
   ```bash
   cat path/to/credentials.json | base64
   ```
   And add the output to `GOOGLE_APPLICATION_CREDENTIALS_STRING`.

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
  - **Response**: JSON with transcription and analysis results

## Deployment

For production deployment:

1. Set up environment variables in `.env`
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
- Google Cloud Speech-to-Text: Audio transcription
- TensorFlow/Transformers: Content analysis
- ffmpeg: Audio extraction
- Python data science libraries (NumPy, etc.)

## Extending the Backend

- Custom models can be added in the `services` directory
- New API endpoints can be added to `api/routes.py` 