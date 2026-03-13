'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  is_locked: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('adminToken');
    const adminId = localStorage.getItem('adminId');

    if (!token || !adminId) {
      router.push('/admin/login');
      return;
    }

    loadQuizzes();
  }, [router]);

  const loadQuizzes = async () => {
    try {
      const supabase = createClient();
      const adminId = localStorage.getItem('adminId');

      const { data, error: err } = await supabase
        .from('quizzes')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setQuizzes(data || []);
    } catch (err: any) {
      console.error('[v0] Error loading quizzes:', err);
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminId');
    router.push('/admin/login');
  };

  const handleDeleteQuiz = async (quizId: string, isLocked: boolean) => {
    if (isLocked) {
      alert('Cannot delete a locked quiz');
      return;
    }

    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete quiz');
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-mono uppercase selection:bg-foreground selection:text-background">
      <div className="border-b-4 border-foreground bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">ADMIN TERMINAL // DASHBOARD</h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 border-2 border-background font-black text-sm uppercase tracking-widest hover:bg-background hover:text-foreground transition-colors"
          >
            [ DISCONNECT ]
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12 pb-6 border-b-2 border-foreground">
          <h2 className="text-2xl font-black uppercase tracking-wider">ACTIVE PROTOCOLS</h2>
          <Link
            href="/admin/quizzes/new"
            className="px-8 py-4 bg-foreground text-background font-black uppercase tracking-widest hover:opacity-90 transition-opacity border-2 border-foreground"
          >
            CREATE NEW ASSESSMENT +
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-24 text-xl font-black tracking-widest">INITIALIZING DATA...</div>
        ) : error ? (
          <div className="p-6 border-4 border-foreground bg-foreground text-background font-black mb-8 uppercase text-sm">
            ERROR DETECTED: {error}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="border-4 border-foreground p-24 text-center bg-card">
            <p className="text-muted-foreground mb-8 font-black uppercase tracking-widest text-lg">NO PROTOCOLS DEFINED.</p>
            <Link
              href="/admin/quizzes/new"
              className="inline-block px-10 py-5 bg-foreground text-background font-black uppercase tracking-widest hover:opacity-90 transition-opacity border-2 border-foreground"
            >
              INITIALIZE FIRST ASSESSMENT
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="border-4 border-foreground p-8 bg-card hover:bg-secondary transition-colors group">
                <div className="flex flex-col md:flex-row justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-2xl font-black uppercase tracking-tight">{quiz.title}</h3>
                      {quiz.is_locked ? (
                        <span className="px-3 py-1 bg-foreground text-background text-[10px] font-black uppercase tracking-widest">
                          [ STATUS: LOCKED ]
                        </span>
                      ) : (
                        <span className="px-3 py-1 border-2 border-foreground text-[10px] font-black uppercase tracking-widest">
                          [ STATUS: ACTIVE ]
                        </span>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="text-sm opacity-70 mb-4 max-w-2xl">{quiz.description}</p>
                    )}
                    <div className="flex gap-6 text-[10px] font-black tracking-[0.2em] opacity-50">
                      <span>DURATION: {quiz.duration_minutes}M</span>
                      <span>CREATED: {new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6 md:mt-0">
                    <Link
                      href={`/admin/results/${quiz.id}`}
                      className="px-6 py-3 border-2 border-foreground font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
                    >
                      VIEW RESULTS
                    </Link>
                    {!quiz.is_locked && (
                      <>
                        <Link
                          href={`/admin/quizzes/${quiz.id}/edit`}
                          className="px-6 py-3 border-2 border-foreground font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
                        >
                          EDIT
                        </Link>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.is_locked)}
                          className="px-6 py-3 border-2 border-foreground bg-background text-foreground font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
                        >
                          DELETE
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
