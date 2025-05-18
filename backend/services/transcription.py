import os
import logging
import tempfile
import subprocess
from google.cloud import speech_v1p1beta1 as speech
from google.cloud import storage
import json
import base64
from pydub import AudioSegment
import io
import uuid

logger = logging.getLogger(__name__)

class TranscriptionService:
    """Service for transcribing audio from video files using Google Cloud Speech-to-Text"""
    
    def __init__(self):
        # Get credentials file path from environment or use default
        default_credentials_dir = os.path.dirname(os.path.dirname(__file__))
        credentials_filename = os.environ.get('GOOGLE_CREDENTIALS_FILENAME', 'google.json')
        credentials_file = os.path.join(default_credentials_dir, credentials_filename)
        
        if os.path.exists(credentials_file):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_file
            logger.info(f"Using Google credentials from file: {credentials_file}")
        else:
            logger.error(f"Credentials file not found: {credentials_file}")
        
        # Initialize the Google Cloud Speech client
        self.client = speech.SpeechClient()
        # Initialize the Google Cloud Storage client
        self.storage_client = storage.Client()
        self.bucket_name = "interview-pro"
        logger.info("Transcription service initialized")
    
    def transcribe(self, video_path):
        """
        Transcribe audio from a video file
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Dictionary with transcription results
        """
        audio_path = None
        try:
            # Extract audio from video
            audio_path = self._extract_audio(video_path)
            
            # Get the audio duration
            audio_duration = self._get_audio_duration(audio_path)
            logger.info(f"Audio duration: {audio_duration} seconds")
            
            # Configure the speech recognition request
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="en-US",
                enable_word_time_offsets=True,
                enable_automatic_punctuation=True,
                model="video",
                use_enhanced=True,
            )
            
            # If audio is longer than 60 seconds, use long_running_recognize with GCS
            if audio_duration and audio_duration > 60:
                logger.info("Audio longer than 60 seconds, using long_running_recognize with GCS")
                
                # Upload audio to GCS
                gcs_uri = self._upload_to_gcs(audio_path)
                logger.info(f"Audio uploaded to GCS: {gcs_uri}")
                
                # Create RecognitionAudio object with URI
                audio = speech.RecognitionAudio(uri=gcs_uri)
                
                # Use long_running_recognize for longer audio
                operation = self.client.long_running_recognize(config=config, audio=audio)
                logger.info("Long running transcription started, waiting for results...")
                response = operation.result(timeout=600)  # Wait up to 10 minutes
                
                # Delete the file from GCS after processing
                self._delete_from_gcs(gcs_uri)
            else:
                # For shorter audio, use synchronous recognize as before
                logger.info("Audio shorter than 60 seconds, using synchronous recognize")
                with open(audio_path, 'rb') as audio_file:
                    audio_content = audio_file.read()
                audio = speech.RecognitionAudio(content=audio_content)
                logger.info("Sending request to Google Cloud Speech-to-Text")
                response = self.client.recognize(config=config, audio=audio)
            
            # Format the results
            result = self._format_transcription_result(response, audio_path)
            
            return result
            
        except Exception as e:
            logger.exception(f"Error in transcription: {str(e)}")
            return {"success": False, "error": str(e)}
        finally:
            # Always clean up temporary files
            if audio_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                    logger.info(f"Cleaned up temporary audio file: {audio_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary file {audio_path}: {str(cleanup_error)}")
    
    def _upload_to_gcs(self, local_file_path):
        """Upload a file to Google Cloud Storage and return the gs:// URI"""
        try:
            bucket = self.storage_client.bucket(self.bucket_name)
            
            # Generate a unique blob name using uuid
            destination_blob_name = f"audio/{uuid.uuid4()}.wav"
            
            blob = bucket.blob(destination_blob_name)
            blob.upload_from_filename(local_file_path)
            
            gcs_uri = f"gs://{self.bucket_name}/{destination_blob_name}"
            logger.info(f"File {local_file_path} uploaded to {gcs_uri}")
            
            return gcs_uri
        except Exception as e:
            logger.exception(f"Error uploading to GCS: {str(e)}")
            raise
    
    def _delete_from_gcs(self, gcs_uri):
        """Delete a file from Google Cloud Storage"""
        try:
            # Parse the URI to get the blob name
            prefix = f"gs://{self.bucket_name}/"
            if gcs_uri.startswith(prefix):
                blob_name = gcs_uri[len(prefix):]
                
                bucket = self.storage_client.bucket(self.bucket_name)
                blob = bucket.blob(blob_name)
                blob.delete()
                
                logger.info(f"Deleted file from GCS: {gcs_uri}")
            else:
                logger.warning(f"Invalid GCS URI format: {gcs_uri}")
        except Exception as e:
            logger.warning(f"Error deleting from GCS: {str(e)}")
            # Continue even if deletion fails
    
    def _extract_audio(self, video_path):
        """Extract audio from video using ffmpeg"""
        try:
            logger.info(f"Extracting audio from {video_path}")
            audio_path = tempfile.mktemp(suffix='.wav')
            
            # Use ffmpeg to extract audio
            cmd = [
                'ffmpeg', '-i', video_path, '-vn',
                '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                audio_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            logger.info(f"Audio extracted to {audio_path}")
            return audio_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Error extracting audio: {e.stderr.decode('utf-8')}")
            raise Exception(f"Failed to extract audio: {e}")
    
    def _format_transcription_result(self, response, audio_path):
        """Format the transcription results"""
        transcript = ""
        timestamps = []
        
        # Process each chunk of transcription
        for result in response.results:
            alternative = result.alternatives[0]
            transcript += f"{alternative.transcript} "
            
            # Process word-level timestamps
            for word_info in alternative.words:
                start_time = word_info.start_time.total_seconds()
                end_time = word_info.end_time.total_seconds()
                
                timestamps.append({
                    "word": word_info.word,
                    "start_time": start_time,
                    "end_time": end_time
                })
        
        # Calculate speaking rate (wpm)
        speaking_rate = self._calculate_speaking_rate(transcript, timestamps)
        
        # Get audio duration
        duration = self._get_audio_duration(audio_path)
        
        return {
            "success": True,
            "transcript": transcript.strip(),
            "timestamps": timestamps,
            "speaking_rate": speaking_rate,
            "duration": duration
        }
    
    def _calculate_speaking_rate(self, transcript, timestamps):
        """Calculate speaking rate in words per minute"""
        if not timestamps or len(timestamps) == 0:
            return None
        
        # Count words (improved over simple splitting)
        words = [w for w in transcript.split() if len(w) > 0]
        total_words = len(words)
        
        # Calculate total duration in minutes
        first_word_start = timestamps[0]["start_time"]
        last_word_end = timestamps[-1]["end_time"]
        duration_minutes = (last_word_end - first_word_start) / 60
        
        if duration_minutes > 0:
            # Calculate words per minute
            return int(total_words / duration_minutes)
        else:
            return None
    
    def _get_audio_duration(self, audio_path):
        """Get the duration of the audio file in seconds"""
        try:
            audio = AudioSegment.from_file(audio_path)
            return audio.duration_seconds
        except Exception as e:
            logger.warning(f"Error getting audio duration: {str(e)}")
            return None 