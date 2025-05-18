/**
 * Service for making API calls to the interview analysis backend
 */
 
// Get the API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Send a video for analysis and get detailed feedback
 * 
 * @param videoBlob - The recorded video blob
 * @param question - The interview question that was answered
 * @returns Analysis results from the backend
 */
export async function analyzeInterview(videoBlob: Blob, question: string) {
  try {
    const formData = new FormData();
    formData.append('video', videoBlob, 'interview.webm');
    formData.append('question', question);
    
    console.log(`Sending interview analysis request to ${API_URL}/api/analyze`);
    
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - it will be automatically set with the correct boundary
    });
    
    if (!response.ok) {
      // Try to get error details from the response
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = { message: response.statusText };
      }
      
      throw new Error(`Analysis failed: ${response.status} ${errorDetails.message || errorDetails.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing interview:', error);
    throw error;
  }
}

/**
 * Store analysis results in session storage for transfer between pages
 */
export function storeAnalysisResults(results: any) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('interviewAnalysis', JSON.stringify(results));
  }
}

/**
 * Get analysis results from session storage
 */
export function getAnalysisResults() {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('interviewAnalysis');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing stored analysis results:', e);
      }
    }
  }
  return null;
} 