'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Submission {
  id: string;
  roll_number: string;
  started_at: string;
  submitted_at: string;
  is_cheating_detected: boolean;
  cheating_reason: string;
  total_score: number;
  max_score: number;
  grading_completed: boolean;
}

export default function ResultsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const resolvedParams = use(params);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    loadResults();
  }, [router, resolvedParams.quizId]);

  const loadResults = async () => {
    try {
      const supabase = createClient();

      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', resolvedParams.quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Load submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('quiz_id', resolvedParams.quizId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);
    } catch (err: any) {
      console.error('[v0] Error loading results:', err);
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('No submissions to export');
      return;
    }

    const csvContent = [
      ['Roll Number', 'Score', 'Max Score', 'Percentage', 'Cheating Detected', 'Started At', 'Submitted At', 'Status'],
      ...submissions.map(sub => [
        sub.roll_number,
        sub.total_score || 0,
        sub.max_score || 0,
        sub.max_score ? ((sub.total_score || 0) / sub.max_score * 100).toFixed(2) : 0,
        sub.is_cheating_detected ? `Yes (${sub.cheating_reason})` : 'No',
        new Date(sub.started_at).toLocaleString(),
        sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Not submitted',
        sub.is_cheating_detected ? 'Cheating' : sub.grading_completed ? 'Graded' : 'Pending',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz?.title || 'quiz'}-results.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground font-mono uppercase selection:bg-foreground selection:text-background pb-20">
      <div className="border-b-4 border-foreground mb-12">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/admin/dashboard" className="text-sm font-black hover:underline mb-6 inline-block tracking-widest">
            [ &lt; RETURN TO BASE ]
          </Link>
          <h1 className="text-4xl font-black tracking-tighter italic">{quiz?.title} // PERFORMANCE_LOG</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="bg-foreground text-background px-6 py-4 border-2 border-foreground font-black tracking-[0.2em] text-sm">
            TOTAL_ENTRIES: {submissions.length}
          </div>
          <button
            onClick={handleExportCSV}
            className="px-10 py-4 border-4 border-foreground bg-background text-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            EXPORT DATA (.CSV)
          </button>
        </div>

        {submissions.length === 0 ? (
          <div className="border-4 border-foreground p-24 text-center bg-card">
            <p className="text-muted-foreground font-black tracking-widest">NO ENTRIES DETECTED IN LOG.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border-4 border-foreground">
            <table className="w-full text-left border-collapse">
              <thead className="bg-foreground text-background border-b-4 border-foreground uppercase text-xs tracking-widest">
                <tr>
                  <th className="px-6 py-5 font-black">ID_NUM</th>
                  <th className="px-6 py-5 font-black">VALUATION</th>
                  <th className="px-6 py-5 font-black">RATIO</th>
                  <th className="px-6 py-5 font-black">INTEGRITY_STATUS</th>
                  <th className="px-6 py-5 font-black">TIMESTAMP</th>
                  <th className="px-6 py-5 font-black">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-foreground">
                {submissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-secondary transition-colors">
                    <td className="px-6 py-5 font-bold">{sub.roll_number}</td>
                    <td className="px-6 py-5 font-black">
                      {sub.is_cheating_detected ? (
                        <span className="text-background bg-foreground px-2 py-1">000 / {sub.max_score}</span>
                      ) : (
                        <span>{String(sub.total_score || 0).padStart(3, '0')} / {sub.max_score || 0}</span>
                      )}
                    </td>
                    <td className="px-6 py-5 font-black">
                      {sub.is_cheating_detected ? (
                        <span className="">0.00%</span>
                      ) : (
                        <span>{((sub.total_score || 0) / (sub.max_score || 1) * 100).toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {sub.is_cheating_detected && (
                        <span className="px-3 py-1 bg-foreground text-background text-[10px] font-black uppercase">
                          [ FAIL: {sub.cheating_reason} ]
                        </span>
                      )}
                      {!sub.is_cheating_detected && !sub.grading_completed && (
                        <span className="px-3 py-1 border-2 border-foreground text-[10px] font-black uppercase">
                          PENDING_VERIFICATION
                        </span>
                      )}
                      {sub.grading_completed && (
                        <span className="px-3 py-1 bg-foreground text-background text-[10px] font-black uppercase">
                          VERIFIED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-[10px] font-black opacity-60">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-5">
                      {!sub.is_cheating_detected && !sub.grading_completed && (
                        <Link
                          href={`/admin/grade/${sub.id}`}
                          className="bg-foreground text-background px-4 py-2 text-xs font-black uppercase hover:opacity-80 transition-opacity"
                        >
                          EVALUATE
                        </Link>
                      )}
                      {sub.is_cheating_detected && (
                        <span className="text-[10px] font-black opacity-30">AUTO_ZERO</span>
                      )}
                      {sub.grading_completed && (
                        <Link
                          href={`/admin/review/${sub.id}`}
                          className="border-2 border-foreground px-4 py-2 text-xs font-black uppercase hover:bg-foreground hover:text-background transition-all"
                        >
                          REVIEW
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
