'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import ReactMarkdown from 'react-markdown';

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
    <main className="min-h-screen bg-background text-foreground font-mono uppercase selection:bg-foreground selection:text-background pb-20">
      <div className="border-b-4 border-foreground mb-12">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href={`/admin/results/${submission.quiz_id}`} className="text-sm font-black hover:underline mb-6 inline-block tracking-widest">
            [ &lt; RETURN TO RESULTS ]
          </Link>
          <h1 className="text-4xl font-black tracking-tighter italic">EVALUATION_PROTOCOL // ROLL: {submission?.roll_number}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black tracking-widest">
              ENTRY_NODE {currentResponseIndex + 1} // {responses.length}
            </span>
          </div>
          <div className="w-full border-2 border-foreground h-6 p-1 bg-background">
            <div
              className="bg-foreground h-full transition-all"
              style={{ width: `${((currentResponseIndex + 1) / responses.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="border-4 border-foreground p-10 bg-card mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-foreground text-background px-4 py-1 text-[10px] font-black tracking-widest">
            VALUATION: {currentResponse.marks} MAX
          </div>
          
          <div className="mb-10 text-foreground normal-case font-normal">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="text-sm leading-relaxed tracking-tight mb-4 whitespace-pre-wrap font-normal" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-black bg-foreground text-background px-2 py-0.5" {...props} />
                ),
                h1: ({ node, ...props }) => (
                  <h1 className="text-xl font-black mb-4 mt-6 border-b-2 border-foreground/30 pb-2 uppercase" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside mb-4 space-y-1 text-sm font-normal" {...props} />
                )
              }}
            >
              {currentResponse.question_text}
            </ReactMarkdown>
          </div>

          {currentResponse.question_type === 'mcq' ? (
            <div className="border-2 border-foreground p-6 bg-secondary/30 mb-8">
              <p className="text-[10px] font-black opacity-50 mb-4 tracking-widest">CAPTURED_DATA (MCQ):</p>
              <p className="text-lg font-black tracking-tight">{currentResponse.selected_option_text || 'NO SELECTION'}</p>
            </div>
          ) : (
            <div className="border-2 border-foreground bg-background text-left font-mono normal-case mb-8">
              <div className="bg-foreground text-background text-xs px-4 py-1 font-black tracking-widest uppercase">
                // STUDENT_CPP_SUBMISSION
              </div>
              <CodeMirror
                value={currentResponse.short_answer_text || '// NO CODE SUBMITTED'}
                extensions={[cpp()]}
                theme="dark"
                editable={false}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  dropCursor: false,
                  highlightActiveLine: false,
                }}
                className="text-sm opacity-90"
              />
            </div>
          )}

          <div className="space-y-8 pt-8 border-t-2 border-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-black mb-3 tracking-widest">CREDITED_VALUE</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={currentResponse.marks}
                    value={currentResponse.marks_obtained || 0}
                    onChange={(e) =>
                      handleUpdateResponse(currentResponseIndex, parseFloat(e.target.value) || 0, currentResponse.admin_notes)
                    }
                    className="w-full px-6 py-4 border-2 border-foreground bg-background focus:bg-foreground focus:text-background transition-all font-black text-xl"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black opacity-50">/ {currentResponse.marks}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black mb-3 tracking-widest">ADMINISTRATOR_NOTES</label>
              <textarea
                value={currentResponse.admin_notes || ''}
                onChange={(e) =>
                  handleUpdateResponse(currentResponseIndex, currentResponse.marks_obtained || 0, e.target.value)
                }
                placeholder="APPEND EVALUATION METADATA..."
                className="w-full px-6 py-4 border-2 border-foreground bg-background focus:bg-foreground focus:text-background transition-all min-h-[100px] resize-none uppercase"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex gap-4 flex-1">
            <button
              onClick={() => setCurrentResponseIndex(Math.max(0, currentResponseIndex - 1))}
              disabled={currentResponseIndex === 0}
              className="flex-1 px-8 py-5 border-2 border-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-20 transition-all"
            >
              [ PREVIOUS ]
            </button>
            <button
              onClick={() => setCurrentResponseIndex(Math.min(responses.length - 1, currentResponseIndex + 1))}
              disabled={currentResponseIndex === responses.length - 1}
              className="flex-1 px-8 py-5 border-2 border-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-20 transition-all"
            >
              [ NEXT ]
            </button>
          </div>
          
          {currentResponseIndex === responses.length - 1 && (
            <button
              onClick={handleSaveAndSubmit}
              disabled={saving}
              className="px-10 py-5 bg-foreground text-background font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity border-2 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              {saving ? 'SYNCHRONIZING...' : 'FINALIZE_VERIFICATION >'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}