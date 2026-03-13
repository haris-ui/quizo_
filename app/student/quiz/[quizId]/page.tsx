'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import QuizTaker from '@/components/quiz-taker';

export default function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rollNumber = searchParams.get('roll');
  const [isReady, setIsReady] = useState(false);
  
  // Next 15+ requires unwrapping params Promise using React.use()
  const resolvedParams = use(params);

  useEffect(() => {
    if (!rollNumber) {
      router.push('/student');
    } else {
      setIsReady(true);
    }
  }, [rollNumber, router]);

  if (!isReady || !rollNumber) {
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
  }

  const handleSubmit = () => {
    router.push(`/student?submitted=true&roll=${encodeURIComponent(rollNumber)}`);
  };

  return (
    <QuizTaker 
      quizId={resolvedParams.quizId} 
      rollNumber={rollNumber} 
      onSubmit={handleSubmit}
    />
  );
}
