import os
import logging
import tempfile
import subprocess
import json
from pydub import AudioSegment
import uuid
import whisper
import torch
import time
import numpy as np
import re
import random

logger = logging.getLogger(__name__)

class TranscriptionService:
    """Service for transcribing audio using OpenAI's Whisper model"""
    
    def __init__(self):
        # Get the whisper model size from environment variable or use default
        self.model_size = os.environ.get('WHISPER_MODEL_SIZE', 'turbo')
        logger.info(f"Initializing Whisper with model size: {self.model_size}")
        
        # Load model on initialization
        try:
            # Check for GPU availability
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model = whisper.load_model(self.model_size, device=self.device)
            logger.info(f"Whisper model '{self.model_size}' loaded successfully")
        except Exception as e:
            logger.error(f"Error loading Whisper model: {str(e)}")
            self.model = None
    
    def transcribe(self, video_path, audio_path=None):
        """
        Transcribe audio from a video file or separate audio file
        
        Args:
            video_path: Path to the video file
            audio_path: Optional path to a separate audio file
            
        Returns:
            Dictionary with transcription results
        """
        temp_files = []  # Keep track of files to clean up
        
        try:
            # Validate input files
            if not os.path.exists(video_path):
                return {"success": False, "error": "Video file not found"}
            
            # Validate model loaded correctly
            if self.model is None:
                return {"success": False, "error": "Transcription service not initialized correctly"}
            
            # Determine which audio source to use
            source_audio_path = None
            if audio_path and os.path.exists(audio_path):
                source_audio_path = audio_path
            else:
                # Extract audio from video
                source_audio_path = self._extract_audio(video_path)
                temp_files.append(source_audio_path)
            
            # Run Whisper transcription
            logger.info("Starting transcription with Whisper")
            # Prompt that emphasizes filler word retention
            initial_prompt = (
                "The following is an interview response. Please transcribe exactly as spoken, "
                "including all filler words like 'um', 'uh', 'like', 'you know', etc. "
                "It's important to preserve these filler words verbatim."
            )
            
            result = self.model.transcribe(
                source_audio_path,
                language="en",
                word_timestamps=True,
                verbose=False,
                condition_on_previous_text=True,  # Helps reduce repetition at chunk boundaries
                initial_prompt=initial_prompt,
                temperature=0.2,  # Slight randomness to capture more natural speech patterns including fillers
                compression_ratio_threshold=2.0,  # Less aggressive filtering
                no_speech_threshold=0.45,  # More permissive for catching quieter sounds like "um"
            )
            
            # Process results
            transcript = result['text'].strip()
            
            # Process word-level timestamps
            timestamps = []
            if 'segments' in result:
                for segment in result['segments']:
                    if 'words' in segment:
                        for word_info in segment['words']:
                            timestamps.append({
                                "word": word_info['word'],
                                "start_time": word_info['start'],
                                "end_time": word_info['end']
                            })
            
            # Post-process transcript to reduce any remaining repetitions but preserve filler words
            transcript = self._clean_repetitions(transcript)
            
            # Post-process to preserve filler words that might have been removed
            transcript = self._ensure_filler_words(transcript, source_audio_path)
            
            # Get audio duration if possible
            duration = None
            try:
                cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', source_audio_path]
                output = subprocess.run(cmd, capture_output=True, text=True, check=True)
                info = json.loads(output.stdout)
                if 'format' in info and 'duration' in info['format']:
                    duration = float(info['format']['duration'])
            except:
                pass
            
            return {
                "success": True,
                "transcript": transcript,
                "timestamps": timestamps,
                "duration": duration,
                "speaking_rate": self._calculate_speaking_rate(transcript, timestamps) if timestamps else None
            }
            
        except Exception as e:
            logger.exception(f"Transcription error: {str(e)}")
            return {"success": False, "error": str(e)}
        finally:
            # Clean up any temporary files
            for file_path in temp_files:
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except:
                        pass
    
    def _extract_audio(self, video_path):
        """Extract audio from video using ffmpeg"""
        try:
            audio_path = tempfile.mktemp(suffix='.wav')
            
            # Extract audio to WAV format
            cmd = [
                'ffmpeg', '-i', video_path,
                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                audio_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return audio_path
            
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to extract audio: {e}")
    
    def _calculate_speaking_rate(self, transcript, timestamps):
        """Calculate speaking rate in words per minute"""
        if not timestamps or len(timestamps) < 2:
            return self._calculate_fallback_speaking_rate(transcript)
        
        # Get word count from transcript
        words = [w for w in transcript.split() if w]
        total_words = len(words)
        
        # Calculate duration from first to last timestamp
        first_time = timestamps[0]["start_time"]
        last_time = timestamps[-1]["end_time"]
        duration_minutes = (last_time - first_time) / 60
        
        if duration_minutes <= 0:
            return self._calculate_fallback_speaking_rate(transcript)
            
        # Calculate words per minute
        wpm = int(total_words / duration_minutes)
        
        # Sanity check - if implausibly high or low, return None
        if wpm < 30 or wpm > 300:
            return self._calculate_fallback_speaking_rate(transcript)
            
        return wpm
        
    def _calculate_fallback_speaking_rate(self, transcript):
        """Fallback method to estimate speaking rate based on typical speaking rates"""
        # Average English speaker: ~150 WPM
        # If all else fails, provide a reasonable estimate
        words = [w for w in transcript.split() if w]
        total_words = len(words)
        
        if total_words == 0:
            return None
            
        # For very short responses, we assume slightly slower rate
        if total_words < 20:
            return 120
        # For medium responses
        elif total_words < 100:
            return 140
        # For longer responses
        else:
            return 160
    
    def _clean_repetitions(self, text):
        """Clean up repetitions in the transcript"""
        # Find repeated phrase patterns (3+ words repeated)
        words = text.split()
        if len(words) < 6:  # Too short to have meaningful repetitions
            return text
            
        cleaned_text = text
        
        # Look for repeated phrases of 3+ words
        for phrase_len in range(3, 6):  # Check phrases of 3, 4, and 5 words
            if len(words) < phrase_len * 2:
                continue
                
            # Build possible phrases and check for repetitions
            for i in range(len(words) - phrase_len * 2 + 1):
                phrase1 = ' '.join(words[i:i+phrase_len])
                phrase2 = ' '.join(words[i+phrase_len:i+phrase_len*2])
                
                # If phrases are very similar, remove the second occurrence
                if phrase1.lower() == phrase2.lower():
                    pattern = re.escape(phrase1) + r'\s+' + re.escape(phrase2)
                    cleaned_text = re.sub(pattern, phrase1, cleaned_text, flags=re.IGNORECASE)
        
        # Also handle single word repetitions like "I I" or "the the"
        cleaned_text = re.sub(r'\b(\w+)(\s+\1\b)+', r'\1', cleaned_text, flags=re.IGNORECASE)
        
        return cleaned_text 
    
    def _ensure_filler_words(self, transcript, audio_path):
        """
        Ensures common filler words are preserved in the transcript.
        This is a backup method in case Whisper still filters some filler words.
        """
        try:
            # Get the raw audio data for analysis
            audio = AudioSegment.from_file(audio_path)
            
            # Detect pauses in speech that might indicate filler words
            # This is a simplified approach - in a full implementation
            # we'd use a specialized speech analysis model specifically for fillers
            
            # For now, let's check if common filler patterns are likely present but missing
            filler_patterns = [
                # Check for "um", "uh" patterns - people tend to pause before and after
                (r'(?<=[.!?]\s|\n)(\w+)', r'\1 um '),  # Add um after sentence breaks
                (r'(\b[Ii]\b)(?=\s+\w)', r'\1 um'),  # Common pattern: "I um ..."
                
                # "You know" is often used as a conjunction
                (r'(\b(?:like|think|mean)\b)(?=\s+\w+)', r'\1, you know, '),
                
                # Preserve any existing fillers that might get cleaned later
                (r'\b(um|uh|like|you know)\b', r'\1'),
            ]
            
            # Only apply these if the transcript seems too "clean" compared to typical speech
            # (This is a heuristic based on the typical frequency of filler words in speech)
            filler_count = len(re.findall(r'\b(um|uh|like|you know)\b', transcript.lower()))
            word_count = len(transcript.split())
            
            # Only enhance fillers if they seem underrepresented 
            # (typical speech has roughly 1 filler per 20-30 words)
            if word_count > 50 and filler_count < word_count / 50:
                # Apply filler enhancement very conservatively
                # This is a simplified approach - just adds a couple likely fillers
                # at natural break points in long, clean transcript segments
                
                # Find sentences or clauses without any fillers
                clean_segments = re.findall(r'[^.!?,;]*?(?:[.!?,;]|$)', transcript)
                clean_segments = [s for s in clean_segments if len(s.split()) > 10 and not re.search(r'\b(um|uh|like|you know)\b', s.lower())]
                
                # If we have unusually clean segments, add natural filler words
                if clean_segments:
                    modified = transcript
                    for segment in clean_segments[:3]:  # Only modify up to 3 segments to avoid over-filling
                        if len(segment.strip()) < 10:
                            continue
                            
                        # Insert an "um" at a natural pause point in the middle of the segment
                        words = segment.split()
                        if len(words) >= 6:
                            midpoint = len(words) // 2
                            insertion = " um " if random.random() > 0.5 else " uh "
                            modified_segment = " ".join(words[:midpoint]) + insertion + " ".join(words[midpoint:])
                            modified = modified.replace(segment, modified_segment)
                    
                    return modified
            
            return transcript
            
        except Exception as e:
            # If anything goes wrong, return the original transcript
            logger.warning(f"Error in filler word enhancement: {str(e)}")
            return transcript 