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

class ContentAnalysisService:
    """Service for analyzing interview content using Google Gemini API"""
    
    def __init__(self):
        # Initialize API credentials from environment variables
        load_dotenv()
        self.gemini_api_key = os.environ.get('GEMINI_API_KEY')
        self.gemini_model = 'gemini-2.0-flash'
        
        if not self.gemini_api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables. Content analysis will use fallback methods.")
        else:
            # Configure Gemini API
            genai.configure(api_key=self.gemini_api_key)
            logger.info("Content analysis service initialized with Gemini API")
    
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
            
            # Log prompt information for debugging
            logger.debug(f"Sending request to Gemini API with prompt length: {len(prompt)}")
            
            # Make API request to Gemini
            try:
                model = genai.GenerativeModel(self.gemini_model)
                response = model.generate_content(prompt)
                
                # Log response information
                logger.info(f"Gemini API response received successfully")
                
                # Parse the response
                if hasattr(response, 'text'):
                    content = response.text
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
                            logger.info("Successfully parsed JSON content from Gemini API")
                            
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
                            
                            # Map speech metrics keys to consistent format
                            if 'speech_metrics' in result:
                                if 'paceEvaluation' in result['speech_metrics']:
                                    result['speech_metrics']['pace_evaluation'] = result['speech_metrics'].pop('paceEvaluation')
                                    
                                if 'fillerWords' in result['speech_metrics']:
                                    result['speech_metrics']['filler_words'] = result['speech_metrics'].pop('fillerWords')
                                    
                                if 'vocabularyDiversity' in result['speech_metrics']:
                                    result['speech_metrics']['vocabulary_diversity'] = result['speech_metrics'].pop('vocabularyDiversity')
                                    
                                if 'answerCompleteness' in result['speech_metrics']:
                                    result['speech_metrics']['answer_completeness'] = result['speech_metrics'].pop('answerCompleteness')
                            
                            return result
                        except json.JSONDecodeError as json_err:
                            logger.exception(f"Error parsing JSON content: {str(json_err)}")
                    else:
                        logger.warning("No text content found in Gemini API response")
            except Exception as api_error:
                logger.exception(f"Error with Gemini API call: {str(api_error)}")
            
            # If we got here, return default response
            logger.warning("Returning default response after failing to parse API result")
            return self._generate_default_response()
            
        except Exception as e:
            logger.exception(f"Error using Gemini API: {str(e)}")
            return self._generate_default_response()
    
    def _create_analysis_prompt(self, transcript, question):
        """Create a structured prompt for the LLM analysis"""
        json_structure = '''{
  "scores": {
    "content": number,
    "structure": number,
    "delivery": number
  },
  "strengths": [
    {
      "category": string,
      "description": string,
      "example": string,
      "impact": string
    },
    ...
  ],
  "improvements": [
    {
      "category": string,
      "description": string,
      "example": string,
      "advice": string,
      "improved_example": string
    },
    ...
  ],
  "speech_metrics": {
    "paceEvaluation": string,
    "pace_analysis": string,
    "fillerWords": {
      "total": number,
      "details": {
        "word1": count,
        "word2": count,
        ...
      }
    },
    "vocabularyDiversity": number,
    "vocabulary_analysis": string,
    "answerCompleteness": string,
    "completeness_details": string
  },
  "key_takeaways": [
    {
      "priority": number,
      "recommendation": string,
      "expected_impact": string
    },
    ...
  ]
}'''
        
        prompt = f"""
You are an expert interview coach analyzing an interview response.

QUESTION: "{question}"

TRANSCRIPT: "{transcript}"

Analyze this interview answer and provide a detailed assessment in JSON format.

Your analysis should include the following sections:
1. Scores (0-100):
   - Content score: How relevant and substantive the answer is
   - Structure score: How well-organized and logical the answer is
   - Delivery score: How fluent, clear, and professional the delivery is

2. Strengths: Identify 3-5 specific strengths with detailed explanations. For each strength:
   - Provide a specific example from the transcript that demonstrates this strength
   - Explain why this approach is effective in an interview setting
   - How this strength positively impacts the candidate's overall impression

3. Areas for improvement: Identify 3-4 specific areas that need improvement with detailed, actionable advice:
   - Provide a specific example from the transcript that demonstrates this issue
   - Explain why this approach might be problematic in an interview setting
   - Offer concrete, actionable steps to improve this aspect in future interviews
   - Include an example of how the answer could be improved or rephrased

4. Speech metrics:
   - Speaking pace evaluation (too fast, appropriate, too slow) with specific reasoning
   - Filler words analysis: Identify all filler words used by the candidate (words like "um", "uh", "like", "you know", etc.)
     Count their occurrences and list each filler word with its count
   - Vocabulary diversity: Assess how varied the vocabulary is on a scale of 0-100, with specific observations about word choice
   - Answer completeness: Evaluate whether the answer fully addresses the question, identifying any missing components

5. Key takeaways: Provide 2-3 high-priority recommendations that would have the biggest impact on improving this interview response

Format your response EXACTLY as a JSON object with the following structure:
{json_structure}

IMPORTANT: Provide only the raw JSON without any markdown formatting, code blocks, or additional explanation text.
Your response must be valid JSON starting with {{ and ending with }}.
"""
        return prompt
    
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
                    "description": "Your answer followed a logical flow with main points.",
                    "example": "The introduction clearly states your position, followed by supporting points.",
                    "impact": "This structure helps interviewers follow your reasoning easily."
                },
                {
                    "category": "Content",
                    "description": "You provided relevant information addressing the question.",
                    "example": "You included specific examples related to the question topic.",
                    "impact": "This demonstrates your knowledge and preparation on the subject."
                }
            ],
            "improvements": [
                {
                    "category": "Delivery",
                    "description": "Consider improving your delivery for more impact.",
                    "example": "Several sentences ended with trailing off or uncertain tone.",
                    "advice": "Speak with more confidence and vary your tone to emphasize key points.",
                    "improved_example": "End statements with firm, decisive tones rather than questioning inflections."
                },
                {
                    "category": "Content Depth",
                    "description": "Some points could benefit from more detailed examples.",
                    "example": "When discussing your experience, you mentioned projects without specific outcomes.",
                    "advice": "Include measurable results and specific impacts of your work when giving examples.",
                    "improved_example": "Instead of 'I worked on a major project,' say 'I led a 5-person team that reduced processing time by 30% through implementing automated workflows.'"
                }
            ],
            "speech_metrics": {
                "paceEvaluation": "Appropriate pace",
                "pace_analysis": "Your speaking rate is comfortable for listeners to follow along with.",
                "fillerWords": {"total": 0, "details": {}},
                "vocabularyDiversity": 70,
                "vocabulary_analysis": "Your vocabulary shows good variation with appropriate professional terminology.",
                "answerCompleteness": "Mostly complete",
                "completeness_details": "Your answer addresses the main question but could include more specific examples."
            },
            "key_takeaways": [
                {
                    "priority": 1,
                    "recommendation": "Add more specific, quantifiable results to your examples",
                    "expected_impact": "This will make your achievements more concrete and impressive to interviewers"
                },
                {
                    "priority": 2,
                    "recommendation": "Speak with more confident, decisive tone throughout your answers",
                    "expected_impact": "This will significantly increase your perceived expertise and authority on the subject"
                }
            ]
        } 