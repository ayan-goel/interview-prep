import os
import logging
import requests
import json
import urllib3
import google.generativeai as genai
from dotenv import load_dotenv
# Suppress only the InsecureRequestWarning from urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

class TranscriptCleanupService:
    """Service for cleaning up raw transcripts while preserving filler words"""
    
    def __init__(self):
        # Initialize API credentials from environment variables
        load_dotenv()
        self.gemini_api_key = os.environ.get('GEMINI_API_KEY')
        self.gemini_model = 'gemini-2.0-flash'
        
        if not self.gemini_api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables. Transcript cleanup may not work properly.")
        else:
            # Configure Gemini API
            genai.configure(api_key=self.gemini_api_key)
            logger.info("Transcript cleanup service initialized")
    
    def clean_transcript(self, raw_transcript):
        """
        Clean up a raw transcript while preserving filler words
        
        Args:
            raw_transcript: The raw transcript text
            
        Returns:
            Cleaned transcript
        """
        # If transcript is empty or too short, return as is
        if not raw_transcript or len(raw_transcript.strip()) < 10:
            logger.warning("Transcript too short to clean up")
            return raw_transcript
        
        try:
            # Create prompt for transcript cleanup
            prompt = self._create_cleanup_prompt(raw_transcript)
            
            # Log prompt information for debugging
            logger.debug(f"Sending cleanup request with transcript length: {len(raw_transcript)}")
            
            # Make API request to Gemini API
            try:
                model = genai.GenerativeModel(self.gemini_model)
                response = model.generate_content(prompt)
                
                # Log response information
                logger.info(f"Cleanup API response received successfully")
                
                # Extract content from the API response
                if hasattr(response, 'text'):
                    cleaned_transcript = response.text
                    
                    # Basic validation - if the cleaned version is much shorter, something went wrong
                    if len(cleaned_transcript) < len(raw_transcript) * 0.5:
                        logger.warning(f"Cleaned transcript suspiciously short (raw: {len(raw_transcript)}, cleaned: {len(cleaned_transcript)})")
                        return raw_transcript
                    
                    logger.info(f"Successfully cleaned transcript (raw: {len(raw_transcript)}, cleaned: {len(cleaned_transcript)})")
                    return cleaned_transcript
                else:
                    logger.warning("No text content found in Gemini API response")
            
            except Exception as e:
                logger.exception(f"Error with Gemini API call: {str(e)}")
            
            # If we got here, return the original transcript
            return raw_transcript
            
        except Exception as e:
            logger.exception(f"Error cleaning transcript: {str(e)}")
            return raw_transcript
    
    def _create_cleanup_prompt(self, raw_transcript):
        """Create a prompt for transcript cleanup"""
        return f"""
I need you to clean up this interview transcript to make it clear, logical, and grammatically correct while preserving the essence of what was said.

Here's the raw transcript:
"{raw_transcript}"

Please do the following:
1. Fix any obvious transcription errors, typos, or grammatical issues
2. Add proper punctuation and capitalization where needed
3. Format into complete, coherent sentences and paragraphs
4. Preserve filler words like "um", "uh", "like", "you know", etc.
5. Make the transcript logically coherent
6. Make the transcript read as natural spoken language, NOT formal writing
7. IMPORTANT: The final transcript should read clearly and make complete sense
   while still sounding like the person speaking in an interview setting
8. Replace any personal name introduction with "Jane Doe" - for example, if someone says "My name is John Smith" or "I'm Sarah Johnson", change it to "My name is Jane Doe" or "I'm Jane Doe". This is for privacy reasons.
9. DO NOT add new information the speaker didn't express
10. DO NOT summarize - provide the full cleaned transcript

Output the cleaned transcript directly without any introduction, explanation, or additional commentary.
""" 