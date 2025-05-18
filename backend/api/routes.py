from flask import Blueprint, request, jsonify
import logging
import os
from services.transcription import TranscriptionService
from services.content_analysis import ContentAnalysisService
from services.body_language_analysis import BodyLanguageAnalysisService
from utils.file_helper import save_upload, get_file_path, cleanup_file

logger = logging.getLogger(__name__)
api_bp = Blueprint('api', __name__)

# Initialize services
transcription_service = TranscriptionService()
content_analysis_service = ContentAnalysisService()
body_language_service = BodyLanguageAnalysisService()

@api_bp.route('/analyze', methods=['POST'])
def analyze_interview():
    """
    Analyze an interview recording
    
    Expects a POST with:
    - video file upload (field name: video)
    - question text (field name: question)
    """
    file_path = None
    try:
        logger.info("Received analysis request")
        
        # Validate inputs
        if 'video' not in request.files:
            logger.error("No video file provided")
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        if not video_file.filename:
            logger.error("Empty video file")
            return jsonify({"error": "Empty video file"}), 400
            
        question = request.form.get('question')
        if not question:
            logger.error("Question text required")
            return jsonify({"error": "Question text required"}), 400
        
        # Save the uploaded file
        filename = save_upload(video_file)
        file_path = get_file_path(filename)
        
        # Step 1: Transcribe the audio
        logger.info(f"Transcribing audio from {filename}")
        transcription_result = transcription_service.transcribe(file_path)
        
        if not transcription_result['success']:
            return jsonify({"error": "Transcription failed", "details": transcription_result['error']}), 500
        
        # Step 2: Analyze the content
        logger.info("Analyzing interview content")
        content_analysis = content_analysis_service.analyze(
            transcription_result['transcript'], 
            question
        )
        
        # Step 3: Analyze body language
        logger.info("Analyzing body language")
        body_language_analysis = body_language_service.analyze(file_path)
        
        # Step 4: Combine results
        analysis_id = f"analysis-{int(transcription_result['duration'])}"
        
        combined_results = {
            "analysis_id": analysis_id,
            "transcript": transcription_result['transcript'],
            "question": question,
            "scores": {
                "content": content_analysis['scores']['content'],
                "structure": content_analysis['scores']['structure'],
                "delivery": content_analysis['scores']['delivery'],
                "confidence": body_language_analysis['confidence_score'],
                "overall": (
                    content_analysis['scores']['content'] * 0.25 +
                    content_analysis['scores']['structure'] * 0.25 +
                    content_analysis['scores']['delivery'] * 0.25 +
                    body_language_analysis['confidence_score'] * 0.25
                )
            },
            "strengths": content_analysis['strengths'],
            "improvements": content_analysis['improvements'],
            "speech_metrics": {
                "speaking_rate": transcription_result.get('speaking_rate', 0),
                "vocabulary_diversity": content_analysis.get('speech_metrics', {}).get('vocabulary_diversity', 0),
                "answer_completeness": content_analysis.get('speech_metrics', {}).get('answer_completeness', 'Unknown'),
                "filler_words": content_analysis.get('speech_metrics', {}).get('filler_words', {'total': 0, 'details': {}})
            },
            "body_language": {
                "posture": body_language_analysis.get('posture', {'score': 50, 'evaluation': 'Not analyzed'}),
                "eye_contact": body_language_analysis.get('eye_contact', {'score': 50, 'evaluation': 'Not analyzed'}),
                "movement": body_language_analysis.get('movement', {'score': 50, 'evaluation': 'Not analyzed'})
            },
            "timestamps": transcription_result['timestamps'] if 'timestamps' in transcription_result else []
        }
        
        logger.info(f"Analysis completed with ID: {analysis_id}")
        return jsonify({
            "analysis_id": analysis_id,
            "results": combined_results
        }), 200
        
    except Exception as e:
        logger.exception(f"Error processing request: {str(e)}")
        return jsonify({"error": "Failed to process interview analysis", "message": str(e)}), 500
    finally:
        # Clean up the uploaded video file to save disk space
        if file_path and os.path.exists(file_path):
            cleanup_file(file_path) 