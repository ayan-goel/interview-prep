# InterviewPrep App

An AI-powered application to help users prepare for interviews with practice questions, comprehensive feedback, and performance analysis.

## Getting Started

### Prerequisites

#### Frontend
- Node.js (v18 or later recommended)
- NPM or PNPM

#### Backend
- Python 3.9+
- pip

### Installation

#### Frontend
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
   
   Or with PNPM:
   ```bash
   pnpm install
   ```

#### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables in a `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS_STRING=your_base64_encoded_credentials
   GEMINI_API_KEY=your_gemini_api_key
   PORT=5000
   ```

### Supabase Setup

This application uses Supabase for authentication. Follow these steps to set it up:

1. Create a Supabase account at [supabase.com](https://supabase.com/) if you don't have one
2. Create a new Supabase project
3. In your project dashboard, go to Authentication → Settings and configure your authentication as needed
4. Create a `.env.local` file at the root of the project with the following variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

   Replace `your_supabase_url` and `your_supabase_anon_key` with the values from:
   - URL: API Settings → URL
   - Anon Key: API Settings → Project API keys → anon public

### Running the Development Server

#### Frontend
```bash
npm run dev
```

#### Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Features

- User authentication with Supabase (sign up, sign in, sign out)
- Practice interview questions with webcam recording
- AI analysis of interview responses:
  - Speech-to-text transcription using OpenAI Whisper
  - Content analysis using Google Gemini API
  - Body language analysis using TensorFlow:
    - Posture assessment with MoveNet pose estimation
    - Eye contact tracking with face detection
    - Movement and fidgeting analysis with optical flow
- Comprehensive feedback with:
  - Overall performance score
  - Content, structure, and delivery metrics
  - Speech analysis (pace, filler words, vocabulary)
  - Body language assessment
  - Strengths and areas for improvement
  - Full transcript

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Supabase (Authentication)
- Tailwind CSS
- shadcn/ui components

### Backend
- Flask (Python)
- OpenAI Whisper API (transcription)
- Google Gemini API (content analysis)
- TensorFlow & TensorFlow Hub
- OpenCV for video processing

## API Documentation

The backend provides the following API endpoints:

- `GET /health`: Health check endpoint
- `POST /api/analyze`: Analyze an interview recording
  - Expects a multipart form with:
    - `video`: Video file upload
    - `question`: Interview question text
  - Returns comprehensive analysis results 