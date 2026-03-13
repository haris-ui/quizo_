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
    <main className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border rounded-lg hover:bg-secondary"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">My Quizzes</h2>
          <Link
            href="/admin/quizzes/new"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
          >
            Create New Quiz
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : error ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
        ) : quizzes.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <p className="text-muted-foreground mb-4">No quizzes created yet</p>
            <Link
              href="/admin/quizzes/new"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Create Your First Quiz
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-card rounded-lg border p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{quiz.title}</h3>
                      {quiz.is_locked && (
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-700 text-xs font-medium rounded">
                          Locked
                        </span>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="text-muted-foreground text-sm mt-1">{quiz.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Duration: {quiz.duration_minutes} minutes
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/admin/results/${quiz.id}`}
                      className="px-4 py-2 border rounded-lg hover:bg-secondary text-sm"
                    >
                      Results
                    </Link>
                    {!quiz.is_locked && (
                      <>
                        <Link
                          href={`/admin/quizzes/${quiz.id}/edit`}
                          className="px-4 py-2 border rounded-lg hover:bg-secondary text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.is_locked)}
                          className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 text-sm"
                        >
                          Delete
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
