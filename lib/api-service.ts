/**
 * Service for making API calls to the interview analysis backend
 */
 
import { supabase } from "@/lib/supabase";

// Get the API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Send a video for analysis and get detailed feedback
 * 
 * @param videoBlob - The recorded video blob
 * @param question - The interview question that was answered
 * @param audioBlob - Optional separate high-quality audio recording
 * @returns Analysis results from the backend
 */
export async function analyzeInterview(videoBlob: Blob, question: string, audioBlob?: Blob) {
  try {
    const formData = new FormData();
    formData.append('video', videoBlob, 'interview.webm');
    formData.append('question', question);
    
    // If a separate audio blob is provided, add it to the request
    if (audioBlob) {
      formData.append('audio', audioBlob, 'interview-audio.webm');
      console.log('Sending separate high-quality audio recording');
    }
    
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

/**
 * Save interview practice results to the database
 * 
 * @param userId - The ID of the user
 * @param results - The analysis results to save
 * @returns The saved practice session data
 */
export async function savePracticeResults(userId: string, results: any) {
  try {
    if (!userId || !results || !results.results) {
      throw new Error("Invalid data for saving practice results");
    }
    
    const { results: analysisResults } = results;
    const question = analysisResults.question;
    
    // First check if this question exists in our questions table
    const { data: existingQuestions, error: questionQueryError } = await supabase
      .from('questions')
      .select('id, text')
      .eq('text', question)
      .limit(1);
      
    if (questionQueryError) {
      throw new Error(`Error checking question: ${questionQueryError.message}`);
    }
    
    let questionId;
    
    if (existingQuestions && existingQuestions.length > 0) {
      // Question exists, use its ID
      questionId = existingQuestions[0].id;
    } else {
      // Question doesn't exist, create it
      const { data: newQuestion, error: createQuestionError } = await supabase
        .from('questions')
        .insert([
          { 
            text: question,
            category: 'General' // Default category, could be determined by AI in future
          }
        ])
        .select('id')
        .single();
        
      if (createQuestionError) {
        throw new Error(`Error creating question: ${createQuestionError.message}`);
      }
      
      questionId = newQuestion.id;
    }
    
    // Save the practice attempt
    const practiceData = {
      user_id: userId,
      question_id: questionId,
      overall_score: analysisResults.scores.overall,
      content_score: analysisResults.scores.content,
      structure_score: analysisResults.scores.structure,
      delivery_score: analysisResults.scores.delivery,
      confidence_score: analysisResults.scores.confidence,
      transcript: analysisResults.transcript,
      raw_transcript: analysisResults.raw_transcript || analysisResults.transcript,
      strengths: JSON.stringify(analysisResults.strengths || []),
      improvements: JSON.stringify(analysisResults.improvements || []),
      speech_metrics: JSON.stringify(analysisResults.speech_metrics || {}),
      body_language: JSON.stringify(analysisResults.body_language || {})
    };
    
    const { data: practiceSession, error: practiceError } = await supabase
      .from('practice_sessions')
      .insert([practiceData])
      .select('*')
      .single();
      
    if (practiceError) {
      throw new Error(`Error saving practice session: ${practiceError.message}`);
    }
    
    return practiceSession;
  } catch (error) {
    console.error('Error saving practice results:', error);
    throw error;
  }
}

/**
 * Get practice history for a user
 * 
 * @param userId - The ID of the user
 * @returns The user's practice history
 */
export async function getUserPracticeHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select(`
        *,
        questions(id, text, category)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`Error fetching practice history: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting user practice history:', error);
    throw error;
  }
}

/**
 * Get statistics for a user's practice sessions
 * 
 * @param userId - The ID of the user
 * @returns Summary stats for the user's practice
 */
export async function getUserStats(userId: string) {
  try {
    // Get total practice sessions
    const { count: totalSessions, error: countError } = await supabase
      .from('practice_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (countError) {
      throw new Error(`Error counting practice sessions: ${countError.message}`);
    }
    
    // Get average overall score
    const { data: scoreData, error: scoreError } = await supabase
      .from('practice_sessions')
      .select('overall_score')
      .eq('user_id', userId);
      
    if (scoreError) {
      throw new Error(`Error fetching scores: ${scoreError.message}`);
    }
    
    // Calculate average score
    let averageScore = 0;
    if (scoreData && scoreData.length > 0) {
      const sum = scoreData.reduce((acc, session) => acc + session.overall_score, 0);
      averageScore = Math.round(sum / scoreData.length);
    }
    
    // Get recent improvement (comparing last 5 with previous 5)
    let improvement = 0;
    if (scoreData && scoreData.length >= 10) {
      const recent5 = scoreData.slice(0, 5);
      const previous5 = scoreData.slice(5, 10);
      
      const recent5Avg = recent5.reduce((acc, session) => acc + session.overall_score, 0) / 5;
      const previous5Avg = previous5.reduce((acc, session) => acc + session.overall_score, 0) / 5;
      
      improvement = Math.round(((recent5Avg - previous5Avg) / previous5Avg) * 100);
    }
    
    // Calculate practice time (rough estimate: 3 minutes per practice session)
    const practiceTimeHours = ((totalSessions || 0) * 3) / 60;
    
    return {
      totalSessions: totalSessions || 0,
      averageScore,
      improvement,
      practiceTimeHours
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Get detailed history for a specific question
 * 
 * @param userId - The ID of the user
 * @param questionId - The ID of the question
 * @returns Detailed history of the question
 */
export async function getQuestionHistory(userId: string, questionId: string) {
  try {
    // Get all practice sessions for this question
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new Error(`Error fetching question history: ${error.message}`);
    }
    
    // Format the data
    const scoreHistory = data.map(session => ({
      date: new Date(session.created_at).toISOString().split('T')[0],
      score: session.overall_score
    }));
    
    // Format feedback
    const feedback = data.map(session => ({
      date: session.created_at,
      score: session.overall_score,
      strengths: JSON.parse(session.strengths).map((s: any) => s.description).join("; "),
      improvements: JSON.parse(session.improvements).map((i: any) => i.description).join("; ")
    }));
    
    return {
      scoreHistory,
      feedback,
      attempts: data.length,
      lastScore: data.length > 0 ? data[data.length - 1].overall_score : 0
    };
  } catch (error) {
    console.error('Error getting question history:', error);
    throw error;
  }
}

/**
 * Get performance by category
 * 
 * @param userId - The ID of the user
 * @returns Performance data by question category
 */
export async function getCategoryPerformance(userId: string) {
  try {
    // Get all practice sessions for user with question data
    const { data, error } = await supabase
      .from('practice_sessions')
      .select(`
        overall_score,
        questions(category)
      `)
      .eq('user_id', userId);
      
    if (error) {
      throw new Error(`Error fetching category performance: ${error.message}`);
    }
    
    // Group by category and calculate averages
    const categoryScores: {[key: string]: {total: number, count: number}} = {};
    
    data.forEach(session => {
      const category = session.questions?.category || 'Uncategorized';
      if (!categoryScores[category]) {
        categoryScores[category] = { total: 0, count: 0 };
      }
      
      categoryScores[category].total += session.overall_score;
      categoryScores[category].count += 1;
    });
    
    // Calculate averages and format
    return Object.entries(categoryScores).map(([name, data]) => ({
      name,
      score: Math.round(data.total / data.count)
    }));
  } catch (error) {
    console.error('Error getting category performance:', error);
    throw error;
  }
} 