'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function StudentPage() {
  const [rollNumber, setRollNumber] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuizzes, setShowQuizzes] = useState(false);

  const handleFetchQuizzes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      setError('Please enter your roll number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch available quizzes
      const { data: availableQuizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('is_locked', false)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      // Check which quizzes the student has already taken
      const { data: submissions, error: submissionsError } = await supabase
        .from('quiz_submissions')
        .select('quiz_id')
        .eq('roll_number', rollNumber);

      if (submissionsError) throw submissionsError;

      const completedQuizIds = new Set(submissions?.map(s => s.quiz_id) || []);

      // Filter out completed quizzes
      const availableForStudent = availableQuizzes?.filter(
        q => !completedQuizIds.has(q.id)
      ) || [];

      setQuizzes(availableForStudent);
      setShowQuizzes(true);

      if (availableForStudent.length === 0) {
        setError('No quizzes available for you');
      }
    } catch (err: any) {
      console.error('[v0] Error fetching quizzes:', err);
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {!showQuizzes ? (
          <div className="bg-card rounded-lg border p-8 shadow-lg">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Quiz Portal</h1>
              <p className="text-muted-foreground">Enter your roll number to begin</p>
            </div>

            <form onSubmit={handleFetchQuizzes} className="space-y-6">
              <div>
                <label htmlFor="roll" className="block text-sm font-medium mb-2">
                  Roll Number
                </label>
                <input
                  id="roll"
                  type="text"
                  placeholder="e.g., 24F-1234"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Get Available Quizzes'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold">Available Quizzes</h1>
                  <p className="text-muted-foreground mt-1">Roll: {rollNumber}</p>
                </div>
                <button
                  onClick={() => {
                    setShowQuizzes(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-secondary"
                >
                  Change Roll Number
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No quizzes available for you at the moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizzes.map(quiz => (
                    <div key={quiz.id} className="border rounded-lg p-4 hover:bg-secondary transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{quiz.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Duration: {quiz.duration_minutes} minutes
                          </p>
                        </div>
                        <Link
                          href={`/student/quiz/${quiz.id}?roll=${encodeURIComponent(rollNumber)}`}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium whitespace-nowrap"
                        >
                          Start Quiz
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
