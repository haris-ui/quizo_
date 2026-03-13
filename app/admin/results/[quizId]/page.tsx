'use client';

import { useState, useEffect } from 'react';
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

export default function ResultsPage({ params }: { params: { quizId: string } }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    loadResults();
  }, [router, params.quizId]);

  const loadResults = async () => {
    try {
      const supabase = createClient();

      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', params.quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Load submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('quiz_id', params.quizId)
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
    <main className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin/dashboard" className="text-primary hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">{quiz?.title} - Results</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="text-muted-foreground">
            Total Submissions: {submissions.length}
          </div>
          <button
            onClick={handleExportCSV}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
          >
            Export as CSV
          </button>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <p className="text-muted-foreground">No submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-secondary border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Roll Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Score</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Percentage</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Submitted At</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} className="border-b hover:bg-secondary/50">
                    <td className="px-6 py-3">{sub.roll_number}</td>
                    <td className="px-6 py-3">
                      {sub.is_cheating_detected ? (
                        <span className="text-destructive font-semibold">0 / {sub.max_score}</span>
                      ) : (
                        <span>{sub.total_score || 0} / {sub.max_score || 0}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {sub.is_cheating_detected ? (
                        <span className="text-destructive font-semibold">0%</span>
                      ) : (
                        <span>{((sub.total_score || 0) / (sub.max_score || 1) * 100).toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {sub.is_cheating_detected && (
                        <span className="px-3 py-1 bg-destructive/20 text-destructive text-xs font-medium rounded">
                          {sub.cheating_reason}
                        </span>
                      )}
                      {!sub.is_cheating_detected && !sub.grading_completed && (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 text-xs font-medium rounded">
                          Pending Review
                        </span>
                      )}
                      {sub.grading_completed && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-700 text-xs font-medium rounded">
                          Graded
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-3">
                      {!sub.is_cheating_detected && !sub.grading_completed && (
                        <Link
                          href={`/admin/grade/${sub.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Grade
                        </Link>
                      )}
                      {sub.is_cheating_detected && (
                        <span className="text-muted-foreground text-sm">Auto-marked 0</span>
                      )}
                      {sub.grading_completed && (
                        <Link
                          href={`/admin/review/${sub.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          View
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
