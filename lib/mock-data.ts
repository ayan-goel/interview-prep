// Mock data for dashboard

export const mockPracticeHistory = [
  { date: "2023-05-01", score: 65, questionId: "q1" },
  { date: "2023-05-03", score: 70, questionId: "q2" },
  { date: "2023-05-05", score: 68, questionId: "q3" },
  { date: "2023-05-08", score: 72, questionId: "q1" },
  { date: "2023-05-10", score: 75, questionId: "q4" },
  { date: "2023-05-12", score: 73, questionId: "q2" },
  { date: "2023-05-15", score: 78, questionId: "q5" },
  { date: "2023-05-17", score: 76, questionId: "q3" },
  { date: "2023-05-19", score: 80, questionId: "q1" },
  { date: "2023-05-22", score: 79, questionId: "q6" },
  { date: "2023-05-24", score: 82, questionId: "q2" },
  { date: "2023-05-26", score: 81, questionId: "q4" },
  { date: "2023-05-29", score: 85, questionId: "q1" },
]

export const mockQuestionHistory = [
  {
    id: "q1",
    text: "Tell me about yourself and your background.",
    category: "General",
    attempts: 3,
    lastScore: 85,
    scoreHistory: [
      { date: "2023-05-01", score: 65 },
      { date: "2023-05-08", score: 72 },
      { date: "2023-05-29", score: 85 },
    ],
    feedback: [
      {
        date: "2023-05-29",
        score: 85,
        strengths: "Good structure, clear communication, and relevant examples.",
        improvements: "Could be more concise and focus more on recent achievements.",
      },
      {
        date: "2023-05-08",
        score: 72,
        strengths: "Good eye contact and enthusiasm.",
        improvements: "Lacked clear structure and rambled at times.",
      },
      {
        date: "2023-05-01",
        score: 65,
        strengths: "Covered relevant background information.",
        improvements: "Spoke too quickly and didn't highlight key achievements.",
      },
    ],
  },
  {
    id: "q2",
    text: "What are your greatest strengths and weaknesses?",
    category: "General",
    attempts: 3,
    lastScore: 82,
    scoreHistory: [
      { date: "2023-05-03", score: 70 },
      { date: "2023-05-12", score: 73 },
      { date: "2023-05-24", score: 82 },
    ],
    feedback: [
      {
        date: "2023-05-24",
        score: 82,
        strengths: "Honest self-assessment with good examples.",
        improvements: "Could better explain how you're addressing weaknesses.",
      },
      {
        date: "2023-05-12",
        score: 73,
        strengths: "Good balance between strengths and weaknesses.",
        improvements: "Examples were too general and lacked specificity.",
      },
    ],
  },
  {
    id: "q3",
    text: "Why do you want to work for this company?",
    category: "General",
    attempts: 2,
    lastScore: 76,
    scoreHistory: [
      { date: "2023-05-05", score: 68 },
      { date: "2023-05-17", score: 76 },
    ],
    feedback: [
      {
        date: "2023-05-17",
        score: 76,
        strengths: "Good research on company values and mission.",
        improvements: "Could better connect personal goals with company objectives.",
      },
    ],
  },
  {
    id: "q4",
    text: "Describe a challenging situation at work and how you handled it.",
    category: "Behavioral",
    attempts: 2,
    lastScore: 81,
    scoreHistory: [
      { date: "2023-05-10", score: 75 },
      { date: "2023-05-26", score: 81 },
    ],
    feedback: [
      {
        date: "2023-05-26",
        score: 81,
        strengths: "Used STAR method effectively with clear outcome.",
        improvements: "Could emphasize lessons learned more clearly.",
      },
    ],
  },
  {
    id: "q5",
    text: "Tell me about a time when you had to work with a difficult team member.",
    category: "Behavioral",
    attempts: 1,
    lastScore: 78,
    scoreHistory: [{ date: "2023-05-15", score: 78 }],
    feedback: [
      {
        date: "2023-05-15",
        score: 78,
        strengths: "Showed empathy and problem-solving skills.",
        improvements: "Could better highlight conflict resolution techniques used.",
      },
    ],
  },
  {
    id: "q6",
    text: "Where do you see yourself in five years?",
    category: "Career Goals",
    attempts: 1,
    lastScore: 79,
    scoreHistory: [{ date: "2023-05-22", score: 79 }],
    feedback: [
      {
        date: "2023-05-22",
        score: 79,
        strengths: "Clear vision and realistic goals.",
        improvements: "Could better align personal growth with industry trends.",
      },
    ],
  },
]
