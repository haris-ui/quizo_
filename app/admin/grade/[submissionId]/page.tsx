'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  marks: number;
}

interface Response {
  id: string;
  question_id: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  selected_option_id: string;
  selected_option_text: string;
  short_answer_text: string;
  is_correct: boolean;
  marks_obtained: number;
  admin_notes: string;
  marks: number;
}

export default function GradingPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const [submission, setSubmission] = useState<any>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const router = useRouter();

  const resolvedParams = use(params);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    loadSubmission();
  }, [router, resolvedParams.submissionId]);

  const loadSubmission = async () => {
    try {
      const supabase = createClient();

      // Load submission
      const { data: submissionData, error: subError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('id', resolvedParams.submissionId)
        .single();

      if (subError) throw subError;
      setSubmission(submissionData);

      // Load responses
      const { data: responsesData, error: resError } = await supabase
        .from('student_responses')
        .select(`
          id,
          question_id,
          question_type,
          selected_option_id,
          short_answer_text,
          is_correct,
          marks_obtained,
          admin_notes,
          quiz_questions!inner (
            question_text,
            marks
          )
        `)
        .eq('submission_id', resolvedParams.submissionId)
        .order('created_at', { ascending: true });

      if (resError) throw resError;

      const formattedResponses = responsesData?.map((r: any) => ({
        ...r,
        question_text: r.quiz_questions.question_text,
        marks: r.quiz_questions.marks,
      })) || [];

      // Load option text for MCQs
      const responsesWithOptions = await Promise.all(
        formattedResponses.map(async (res: any) => {
          if (res.question_type === 'mcq' && res.selected_option_id) {
            const { data: option } = await supabase
              .from('mcq_options')
              .select('option_text')
              .eq('id', res.selected_option_id)
              .single();

            return {
              ...res,
              selected_option_text: option?.option_text || '',
            };
          }
          return res;
        })
      );

      setResponses(responsesWithOptions);
    } catch (err: any) {
      console.error('[v0] Error loading submission:', err);
      setError(err.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResponse = (index: number, marks: number, notes: string) => {
    const updatedResponses = [...responses];
    updatedResponses[index] = {
      ...updatedResponses[index],
      marks_obtained: marks,
      admin_notes: notes,
    };
    setResponses(updatedResponses);
  };

  const handleSaveAndSubmit = async () => {
    setSaving(true);

    try {
      const supabase = createClient();

      let totalScore = 0;

      // Update all responses
      for (const response of responses) {
        const { error } = await supabase
          .from('student_responses')
          .update({
            marks_obtained: response.marks_obtained || 0,
            admin_notes: response.admin_notes || '',
          })
          .eq('id', response.id);

        if (error) throw error;

        totalScore += response.marks_obtained || 0;
      }

      // Calculate max score
      const maxScore = responses.reduce((sum, r) => sum + (r.marks || 0), 0);

      // Update submission as graded
      const { error: updateError } = await supabase
        .from('quiz_submissions')
        .update({
          total_score: totalScore,
          max_score: maxScore,
          grading_completed: true,
        })
        .eq('id', resolvedParams.submissionId);

      if (updateError) throw updateError;

      alert('Grading completed successfully!');
      router.push(`/admin/results/${submission.quiz_id}`);
    } catch (err: any) {
      console.error('[v0] Error saving grades:', err);
      setError(err.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
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

  if (responses.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">No responses to grade</p>
        </div>
      </div>
    );
  }

  const currentResponse = responses[currentResponseIndex];

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Grading Submission</h1>
          <p className="text-muted-foreground mt-1">Roll: {submission?.roll_number}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Question {currentResponseIndex + 1} of {responses.length}
            </span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentResponseIndex + 1) / responses.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-card rounded-lg border p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">{currentResponse.question_text}</h2>

          {currentResponse.question_type === 'mcq' ? (
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Student's Answer:</p>
              <p className="font-medium">{currentResponse.selected_option_text}</p>
            </div>
          ) : (
            <div className="bg-secondary/50 p-4 rounded-lg min-h-24">
              <p className="text-sm text-muted-foreground mb-2">Student's Answer:</p>
              <p className="font-mono text-sm whitespace-pre-wrap">{currentResponse.short_answer_text || '(No answer)'}</p>
            </div>
          )}

          {/* Grading Input */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Marks Obtained (out of {currentResponse.marks})
              </label>
              <input
                type="number"
                min="0"
                max={currentResponse.marks}
                value={currentResponse.marks_obtained || 0}
                onChange={(e) =>
                  handleUpdateResponse(currentResponseIndex, parseFloat(e.target.value) || 0, currentResponse.admin_notes)
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Admin Notes</label>
              <textarea
                value={currentResponse.admin_notes || ''}
                onChange={(e) =>
                  handleUpdateResponse(currentResponseIndex, currentResponse.marks_obtained || 0, e.target.value)
                }
                placeholder="Add any notes about this answer..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentResponseIndex(Math.max(0, currentResponseIndex - 1))}
            disabled={currentResponseIndex === 0}
            className="px-6 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentResponseIndex(Math.min(responses.length - 1, currentResponseIndex + 1))}
            disabled={currentResponseIndex === responses.length - 1}
            className="px-6 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
          {currentResponseIndex === responses.length - 1 && (
            <button
              onClick={handleSaveAndSubmit}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg ml-auto disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Complete Grading'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
