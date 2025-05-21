from flask import Blueprint, request, jsonify
import logging
import os
import time
from services.transcription import TranscriptionService
from services.content_analysis import ContentAnalysisService
from services.body_language_analysis import BodyLanguageAnalysisService
from services.transcript_cleanup import TranscriptCleanupService
from utils.file_helper import save_upload, get_file_path, cleanup_file

logger = logging.getLogger(__name__)
api_bp = Blueprint('api', __name__)

# Initialize services
transcription_service = TranscriptionService()
content_analysis_service = ContentAnalysisService()
body_language_service = BodyLanguageAnalysisService()
transcript_cleanup_service = TranscriptCleanupService()

@api_bp.route('/analyze', methods=['POST'])
def analyze_interview():
    """
    Analyze an interview recording
    
    Expects a POST with:
    - video file upload (field name: video)
    - question text (field name: question)
    - optional audio file upload (field name: audio) - for higher quality transcription
    """
    video_path = None
    audio_path = None
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
        
        # Save the uploaded video file
        video_filename = save_upload(video_file)
        video_path = get_file_path(video_filename)
        
        # Check if a separate audio file was provided
        if 'audio' in request.files and request.files['audio'].filename:
            logger.info("Separate high-quality audio file provided")
            audio_file = request.files['audio']
            audio_filename = save_upload(audio_file, prefix="audio_")
            audio_path = get_file_path(audio_filename)
            logger.info(f"Saved audio file: {audio_path}")
        
        # Step 1: Transcribe the audio (using separate audio file if provided)
        logger.info(f"Transcribing audio from {'separate audio file' if audio_path else 'video'}")
        transcription_result = transcription_service.transcribe(video_path, audio_path)
        
        if not transcription_result['success']:
            return jsonify({"error": "Transcription failed", "details": transcription_result['error']}), 500
        
        # Store the raw transcript for debugging and comparison
        raw_transcript = transcription_result['transcript']
        
        # Step 1.5: Clean up the transcript if it's not empty
        if raw_transcript and len(raw_transcript.strip()) > 0:
            logger.info("Cleaning up transcript with NIM API")
            cleaned_transcript = transcript_cleanup_service.clean_transcript(raw_transcript)
            
            # Log both versions for comparison
            logger.info(f"Raw transcript ({len(raw_transcript)} chars): {raw_transcript[:100]}...")
            logger.info(f"Cleaned transcript ({len(cleaned_transcript)} chars): {cleaned_transcript[:100]}...")
            
            # Update the transcript in the results
            transcription_result['raw_transcript'] = raw_transcript
            transcription_result['transcript'] = cleaned_transcript
        else:
            logger.warning("Empty transcript, skipping cleanup")
        
        # Step 2: Analyze the content
        logger.info("Analyzing interview content")
        content_analysis = content_analysis_service.analyze(
            transcription_result['transcript'], 
            question
        )
        
        # Step 3: Analyze body language
        logger.info("Analyzing body language")
        body_language_analysis = body_language_service.analyze(video_path)
        
        # Step 4: Combine results
        # Use timestamp instead of duration to prevent None errors
        timestamp = int(time.time())
        analysis_id = f"analysis-{timestamp}"
        
        combined_results = {
            "analysis_id": analysis_id,
            "transcript": transcription_result['transcript'],
            "raw_transcript": transcription_result.get('raw_transcript', ''),
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
                "vocabulary_analysis": content_analysis.get('speech_metrics', {}).get('vocabulary_analysis', ''),
                "pace_analysis": content_analysis.get('speech_metrics', {}).get('pace_analysis', ''),
                "completeness_details": content_analysis.get('speech_metrics', {}).get('completeness_details', ''),
                "filler_words": content_analysis.get('speech_metrics', {}).get('filler_words', {'total': 0, 'details': {}})
            },
            "body_language": {
                "posture": body_language_analysis.get('posture', {'score': 50, 'evaluation': 'Not analyzed'}),
                "eye_contact": body_language_analysis.get('eye_contact', {'score': 50, 'evaluation': 'Not analyzed'}),
                "movement": body_language_analysis.get('movement', {'score': 50, 'evaluation': 'Not analyzed'})
            },
            "timestamps": transcription_result['timestamps'] if 'timestamps' in transcription_result else []
        }
        
        # Add key takeaways if available
        if 'key_takeaways' in content_analysis:
            combined_results['key_takeaways'] = content_analysis['key_takeaways']
        
        logger.info(f"Analysis completed with ID: {analysis_id}")
        return jsonify({
            "analysis_id": analysis_id,
            "results": combined_results
        }), 200
        
    except Exception as e:
        logger.exception(f"Error processing request: {str(e)}")
        return jsonify({"error": "Failed to process interview analysis", "message": str(e)}), 500
    finally:
        # Clean up the uploaded files to save disk space
        if video_path and os.path.exists(video_path):
            cleanup_file(video_path)
        if audio_path and os.path.exists(audio_path):
            cleanup_file(audio_path)

@api_bp.route('/test-transcribe', methods=['POST'])
def test_transcription():
    """
    Test endpoint for transcription only
    
    Expects a POST with:
    - audio file upload (field name: audio)
    """
    audio_path = None
    try:
        logger.info("Received test transcription request")
        
        # Validate inputs
        if 'audio' not in request.files:
            logger.error("No audio file provided")
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        if not audio_file.filename:
            logger.error("Empty audio file")
            return jsonify({"error": "Empty audio file"}), 400
        
        # Save the uploaded audio file
        audio_filename = save_upload(audio_file, prefix="test_")
        audio_path = get_file_path(audio_filename)
        logger.info(f"Saved test audio file: {audio_path}")
        
        # Get file size and log it
        file_size = os.path.getsize(audio_path) / (1024 * 1024)  # Size in MB
        logger.info(f"Test audio file size: {file_size:.2f} MB")
        
        # Transcribe the audio
        logger.info("Testing transcription with audio file")
        
        # Need to pass both video_path and audio_path
        # We'll use the same file for both
        transcription_result = transcription_service.transcribe(audio_path, audio_path)
        
        # Add debug info to the response
        debug_info = {
            "file_path": audio_path,
            "file_size_mb": file_size
        }
        
        if not transcription_result.get("success", False):
            return jsonify({
                "success": False,
                "error": transcription_result.get("error", "Unknown error"),
                "debug_info": debug_info
            }), 500
        
        transcription_result["debug_info"] = debug_info
        
        return jsonify(transcription_result), 200
        
    except Exception as e:
        logger.exception(f"Error processing test transcription request: {str(e)}")
        return jsonify({"error": "Failed to process test transcription", "message": str(e)}), 500
    finally:
        # Clean up the uploaded file
        if audio_path and os.path.exists(audio_path):
            cleanup_file(audio_path) 