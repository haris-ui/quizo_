import { use } from 'react';
import QuizBuilder from '@/components/quiz-builder';

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <QuizBuilder quizId={resolvedParams.id} />;
}
