export interface InterviewQuestion {
  text: string
  category: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
}

export const interviewQuestions: InterviewQuestion[] = [
  {
    text: "Tell me about yourself and your background.",
    category: "General",
    difficulty: "Beginner",
  },
  {
    text: "What are your greatest strengths and weaknesses?",
    category: "General",
    difficulty: "Beginner",
  },
  {
    text: "Why do you want to work for this company?",
    category: "General",
    difficulty: "Beginner",
  },
  {
    text: "Describe a challenging situation at work and how you handled it.",
    category: "Behavioral",
    difficulty: "Intermediate",
  },
  {
    text: "Tell me about a time when you had to work with a difficult team member.",
    category: "Behavioral",
    difficulty: "Intermediate",
  },
  {
    text: "How do you handle stress and pressure?",
    category: "Behavioral",
    difficulty: "Intermediate",
  },
  {
    text: "Where do you see yourself in five years?",
    category: "Career Goals",
    difficulty: "Intermediate",
  },
  {
    text: "Describe a project where you demonstrated leadership skills.",
    category: "Leadership",
    difficulty: "Advanced",
  },
  {
    text: "How do you stay updated with the latest trends in your field?",
    category: "Professional Development",
    difficulty: "Intermediate",
  },
  {
    text: "What questions do you have for me?",
    category: "General",
    difficulty: "Beginner",
  },
]
