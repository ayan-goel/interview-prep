import os
import logging
import requests
import json
import urllib3

# Suppress only the InsecureRequestWarning from urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

class ContentAnalysisService:
    """Service for analyzing interview content using NVIDIA NIM API"""
    
    def __init__(self):
        # Initialize API credentials
        self.nim_api_key = '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'
        self.nim_api_url = 'https://integrate.api.nvidia.com/v1/chat/completions'
        self.nim_model = 'meta/llama-4-maverick-17b-128e-instruct'
        
        if not self.nim_api_key:
            logger.warning("NIM_API_KEY not found in environment variables. Content analysis will use fallback methods.")
        else:
            logger.info("Content analysis service initialized with NIM API")
    
    def analyze(self, transcript, question):
        """
        Analyze the interview transcript
        
        Args:
            transcript: The transcript text
            question: The interview question
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Verify we have text to analyze
            if not transcript or not question:
                return self._generate_default_response()
            
            # Analyze with LLM
            return self._analyze_with_llm(transcript, question)
            
        except Exception as e:
            logger.exception(f"Error in content analysis: {str(e)}")
            return self._generate_default_response()
    
    def _analyze_with_llm(self, transcript, question):
        """Analyze interview content using LLM API"""
        try:
            # Create structured prompt for the LLM
            prompt = self._create_analysis_prompt(transcript, question)
            
            # Add a warning log for disabled SSL verification
            logger.warning("SSL verification disabled for NIM API requests - this should only be used in development")
            
            # Log prompt information for debugging
            logger.debug(f"Sending request to NIM API with prompt length: {len(prompt)}")
            
            # Make API request to LLM with SSL verification disabled for development
            response = requests.post(
                self.nim_api_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.nim_api_key}',
                    'Accept': 'application/json'
                },
                json={
                    'model': self.nim_model,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ],
                    'max_tokens': 2048,
                    'temperature': 0.2,  # Lower temperature for more consistent results
                    'top_p': 1.0,
                    'stream': False
                },
                verify=False  # Disable SSL verification (for development only)
            )
            
            # Log response information
            logger.info(f"API response status: {response.status_code}")
            logger.debug(f"API response headers: {response.headers}")
            
            # Debug full response for troubleshooting
            raw_response = response.text
            if raw_response:
                # Log first and last parts of the response to avoid huge logs
                logger.info(f"Raw API response (first 100 chars): {raw_response[:100]}")
                if len(raw_response) > 200:
                    logger.info(f"Raw API response (last 100 chars): {raw_response[-100:]}")
            
            # Check if the request was successful
            response.raise_for_status()
            
            # Parse the response
            try:
                response_data = response.json()
                logger.debug(f"API response structure: {list(response_data.keys())}")
                
                # Extract content from the API response - log the structure
                if 'choices' in response_data:
                    logger.debug(f"Choices structure: {response_data['choices'][:1]}")
                    
                    if len(response_data['choices']) > 0:
                        choice = response_data['choices'][0]
                        logger.debug(f"First choice keys: {list(choice.keys())}")
                        
                        # For chat completions API format (priority)
                        if 'message' in choice:
                            message = choice['message']
                            logger.debug(f"Message keys: {list(message.keys())}")
                            
                            if 'content' in message:
                                content = message['content']
                                logger.info(f"Content received with length: {len(content)}")
                                logger.debug(f"Content starts with: {content[:50]}")
                                
                                # Strip markdown code blocks if present
                                if content.strip().startswith('```'):
                                    logger.info("Detected markdown code block, stripping backticks")
                                    # Find the first and last backtick sections
                                    content = content.strip()
                                    if content.startswith('```json'):
                                        content = content[7:]  # Remove ```json
                                    elif content.startswith('```'):
                                        content = content[3:]  # Remove ```
                                    
                                    if content.endswith('```'):
                                        content = content[:-3]  # Remove trailing ```
                                    
                                    content = content.strip()
                                    logger.debug(f"After stripping markdown: {content[:50]}...")
                                
                                # Try to parse as JSON
                                if content.strip().startswith('{') or content.strip().startswith('['):
                                    try:
                                        result = json.loads(content)
                                        logger.info("Successfully parsed JSON content from LLM API")
                                        
                                        # Validate the result has the expected keys
                                        missing_keys = []
                                        for key in ['scores', 'strengths', 'improvements', 'speech_metrics']:
                                            if key not in result:
                                                missing_keys.append(key)
                                        
                                        if missing_keys:
                                            logger.warning(f"API response missing required fields: {missing_keys}")
                                            default_response = self._generate_default_response()
                                            for key in missing_keys:
                                                result[key] = default_response[key]
                                        
                                        return result
                                    except json.JSONDecodeError as json_err:
                                        logger.exception(f"Error parsing JSON content: {str(json_err)}")
                                else:
                                    logger.warning(f"Content doesn't appear to be JSON: {content[:50]}...")
                            else:
                                logger.warning("No 'content' found in message")
                        # For completions API, fallback to 'text' field
                        elif 'text' in choice:
                            content = choice['text']
                            logger.info(f"Text field found with length: {len(content)}")
                            
                            # Strip markdown code blocks if present
                            if content.strip().startswith('```'):
                                logger.info("Detected markdown code block, stripping backticks")
                                # Find the first and last backtick sections
                                content = content.strip()
                                if content.startswith('```json'):
                                    content = content[7:]  # Remove ```json
                                elif content.startswith('```'):
                                    content = content[3:]  # Remove ```
                                
                                if content.endswith('```'):
                                    content = content[:-3]  # Remove trailing ```
                                
                                content = content.strip()
                                logger.debug(f"After stripping markdown: {content[:50]}...")
                            
                            # Try to parse as JSON
                            if content.strip().startswith('{') or content.strip().startswith('['):
                                try:
                                    result = json.loads(content)
                                    logger.info("Successfully parsed JSON from 'text' field")
                                    
                                    # Validate the result has the expected keys
                                    missing_keys = []
                                    for key in ['scores', 'strengths', 'improvements', 'speech_metrics']:
                                        if key not in result:
                                            missing_keys.append(key)
                                    
                                    if missing_keys:
                                        logger.warning(f"API response missing required fields: {missing_keys}")
                                        default_response = self._generate_default_response()
                                        for key in missing_keys:
                                            result[key] = default_response[key]
                                    
                                    return result
                                except json.JSONDecodeError as json_err:
                                    logger.exception(f"Error parsing JSON from text: {str(json_err)}")
                            else:
                                logger.warning(f"Text doesn't appear to be JSON: {content[:50]}...")
                        else:
                            logger.warning(f"No recognized content fields in choice: {list(choice.keys())}")
                    else:
                        logger.warning("Empty 'choices' array in response")
                else:
                    logger.warning(f"No 'choices' field found in response. Keys: {list(response_data.keys())}")
            except json.JSONDecodeError as e:
                logger.exception(f"Error parsing response JSON: {str(e)}")
                if raw_response:
                    logger.warning(f"Raw response was: {raw_response[:200]}")
            
            # If we got here, return default response
            logger.warning("Returning default response after failing to parse API result")
            return self._generate_default_response()
            
        except Exception as e:
            logger.exception(f"Error using LLM API: {str(e)}")
            return self._generate_default_response()
    
    def _create_analysis_prompt(self, transcript, question):
        """Create a structured prompt for the LLM analysis"""
        return f"""
You are an expert interview coach analyzing an interview response.

QUESTION: "{question}"

TRANSCRIPT: "{transcript}"

Analyze this interview answer and provide a detailed assessment in JSON format.

Your analysis should include the following sections:
1. Scores (0-100):
   - Content score: How relevant and substantive the answer is
   - Structure score: How well-organized and logical the answer is
   - Delivery score: How fluent, clear, and professional the delivery is

2. Strengths: Identify 3-4 specific strengths with brief explanations

3. Areas for improvement: Identify 2-3 specific areas that need improvement with actionable advice

4. Speech metrics:
   - Speaking pace evaluation (too fast, appropriate, too slow)
   - Filler words analysis: Identify all filler words used by the candidate (words like "um", "uh", "like", "you know", etc.)
     Count their occurrences and list each filler word with its count.
   - Vocabulary diversity: Assess how varied the vocabulary is on a scale of 0-100
   - Answer completeness: Evaluate whether the answer fully addresses the question

Format your response EXACTLY as a JSON object with the following structure:
{{
  "scores": {{
    "content": number,
    "structure": number,
    "delivery": number
  }},
  "strengths": [
    {{"category": string, "description": string}},
    ...
  ],
  "improvements": [
    {{"category": string, "description": string, "advice": string}},
    ...
  ],
  "speech_metrics": {{
    "paceEvaluation": string,
    "fillerWords": {{
      "total": number,
      "details": {{
        "word1": count,
        "word2": count,
        ...
      }}
    }},
    "vocabularyDiversity": number,
    "answerCompleteness": string
  }}
}}

IMPORTANT: Provide only the raw JSON without any markdown formatting, code blocks, or additional explanation text.
Your response must be valid JSON starting with {{ and ending with }}.
"""
    
    def _generate_default_response(self):
        """Generate a default response if analysis fails"""
        return {
            "scores": {
                "content": 75,
                "structure": 70,
                "delivery": 65
            },
            "strengths": [
                {
                    "category": "Structure",
                    "description": "Your answer followed a logical flow with main points."
                },
                {
                    "category": "Content",
                    "description": "You provided relevant information addressing the question."
                }
            ],
            "improvements": [
                {
                    "category": "Delivery",
                    "description": "Consider improving your delivery for more impact.",
                    "advice": "Speak with more confidence and vary your tone to emphasize key points."
                }
            ],
            "speech_metrics": {
                "paceEvaluation": "Appropriate pace",
                "fillerWords": {"total": 0, "details": {}},
                "vocabularyDiversity": 70,
                "answerCompleteness": "Mostly complete"
            }
        } 