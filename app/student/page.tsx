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
      setError('IDENTIFICATION REQUIRED.');
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
        setError('NO ASSESSMENTS AVAILABLE.');
      }
    } catch (err: any) {
      console.error('[Quizo] Error fetching quizzes:', err);
      setError(err.message || 'SYSTEM ERROR: FAILED TO FETCH QUERIES');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background font-mono">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <Link href="/">
              <h1 className="text-3xl font-black uppercase tracking-tight hover:underline">Quizo</h1>
            </Link>
            <p className="text-xs mt-1 uppercase tracking-widest text-muted-foreground">Student Access Terminal</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {!showQuizzes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Instructions Panel */}
            <div className="border-2 border-foreground p-8 bg-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6 border-b-2 border-foreground pb-4">
                  <span className="text-3xl">⚠️</span>
                  <h2 className="text-2xl font-black uppercase tracking-wider">Critical Instructions</h2>
                </div>
                
                <ul className="space-y-6 text-sm uppercase tracking-wide leading-relaxed">
                  <li className="flex gap-4">
                    <span className="font-black text-lg">01.</span>
                    <span className="pt-1">Entering an assessment requires full-screen authorization. Browsers may restrict this. You must explicitly click "Start Assessment".</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-black text-lg">02.</span>
                    <span className="pt-1 underline decoration-2 underline-offset-4">Do not exit full-screen mode.</span> Doing so triggers immediate termination and a zero score.
                  </li>
                  <li className="flex gap-4">
                    <span className="font-black text-lg">03.</span>
                    <span className="pt-1">Tab switching, window blurring, and banned keystrokes (Esc, F11, Cmd+C) are constantly monitored and will flag cheating.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 p-4 bg-foreground text-background text-center text-xs font-black tracking-widest">
                VIOLATIONS RESULT IN IMMEDIATE 0 SCORE
              </div>
            </div>

            {/* Login Panel */}
            <div className="border-2 border-foreground p-8 bg-card">
              <div className="mb-8">
                <h2 className="text-2xl font-black uppercase tracking-wider">Authenticate</h2>
                <p className="text-sm mt-2 text-muted-foreground uppercase tracking-wider">Enter Roll Number to proceed</p>
              </div>

              <form onSubmit={handleFetchQuizzes} className="space-y-6">
                <div>
                  <label htmlFor="roll" className="block text-xs font-black mb-2 uppercase tracking-widest">
                    Roll Number
                  </label>
                  <input
                    id="roll"
                    type="text"
                    placeholder="e.g., 24F-1234"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-foreground bg-background focus:outline-none focus:ring-0 focus:border-foreground uppercase"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-4 border-2 border-foreground text-foreground font-bold text-sm uppercase">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background py-4 font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'AUTHENTICATING...' : 'ACCESS TERMINAL >'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-2 border-foreground p-8 bg-card">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b-2 border-foreground">
                <div className="mb-4 md:mb-0">
                  <h1 className="text-3xl font-black uppercase tracking-wider">Available Assessments</h1>
                  <p className="text-sm mt-2 text-muted-foreground uppercase tracking-widest">Active Roll: {rollNumber}</p>
                </div>
                <button
                  onClick={() => {
                    setShowQuizzes(false);
                    setError(null);
                  }}
                  className="px-6 py-2 border-2 border-foreground text-sm font-bold uppercase hover:bg-foreground hover:text-background transition-colors"
                >
                  [ LOGOUT ]
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-foreground">
                  <p className="text-muted-foreground uppercase tracking-widest font-bold">NO PENDING ASSESSMENTS DETECTED.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map(quiz => (
                    <div key={quiz.id} className="border-2 border-foreground p-6 hover:bg-foreground hover:text-background transition-colors group">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="mb-4 md:mb-0">
                          <h3 className="font-black text-xl uppercase tracking-wider">{quiz.title}</h3>
                          <p className="text-sm mt-2 opacity-80 uppercase">{quiz.description}</p>
                          <p className="text-xs mt-3 font-bold uppercase tracking-widest">
                            [ DURATION: {quiz.duration_minutes} MIN ]
                          </p>
                        </div>
                        <Link
                          href={`/student/quiz/${quiz.id}?roll=${encodeURIComponent(rollNumber)}`}
                          className="px-8 py-4 border-2 border-foreground group-hover:border-background group-hover:bg-background group-hover:text-foreground font-black uppercase tracking-widest whitespace-nowrap"
                        >
                          INITIATE &gt;
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
