'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import ReactMarkdown from 'react-markdown';

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

export default function ReviewPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const [submission, setSubmission] = useState<any>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
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
          <p className="text-muted-foreground">No responses found</p>
        </div>
      </div>
    );
  }

  const currentResponse = responses[currentResponseIndex];

  return (
    <main className="min-h-screen bg-background text-foreground font-mono uppercase selection:bg-foreground selection:text-background pb-20">
      <div className="border-b-4 border-foreground mb-12">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/admin/dashboard" className="text-sm font-black hover:underline mb-6 inline-block tracking-widest">
            [ &lt; RETURN TO BASE ]
          </Link>
          <h1 className="text-4xl font-black tracking-tighter italic">REVIEW_PROTOCOL // ROLL: {submission?.roll_number}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Score Summary */}
        <div className="border-4 border-foreground p-8 mb-12 bg-card grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-foreground"></div>
          <div>
            <p className="text-[10px] font-black opacity-50 mb-2 tracking-widest">AGGREGATE_SCORE</p>
            <p className="text-4xl font-black italic">{submission?.total_score || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-black opacity-50 mb-2 tracking-widest">MAX_VALUATION</p>
            <p className="text-4xl font-black italic">{submission?.max_score || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-black opacity-50 mb-2 tracking-widest">SUCCESS_RATIO</p>
            <p className="text-4xl font-black italic">
              {submission?.max_score
                ? ((submission?.total_score || 0) / submission?.max_score * 100).toFixed(2)
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black tracking-widest">
              ENTRY_NODE {currentResponseIndex + 1} // {responses.length}
            </span>
          </div>
          <div className="w-full border-2 border-foreground h-4 p-1">
            <div
              className="bg-foreground h-full transition-all"
              style={{ width: `${((currentResponseIndex + 1) / responses.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="border-4 border-foreground p-10 bg-card mb-12 relative">
          <div className="absolute top-0 right-0 bg-foreground text-background px-4 py-1 text-[10px] font-black tracking-widest">
            NODE_VALUATION: {currentResponse.marks}
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
              <p className="text-[10px] font-black opacity-50 mb-4 tracking-widest">RECORDED_DATA (MCQ):</p>
              <p className="text-lg font-black">{currentResponse.selected_option_text || 'NO SELECTION'}</p>
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
            <div>
              <label className="block text-xs font-black mb-3 tracking-widest">VERIFIED_VALUE</label>
              <div className="bg-foreground text-background p-6 border-2 border-foreground inline-block min-w-[200px]">
                <p className="text-3xl font-black italic">{currentResponse.marks_obtained || 0} / {currentResponse.marks}</p>
              </div>
            </div>

            {currentResponse.admin_notes && (
              <div>
                <label className="block text-xs font-black mb-3 tracking-widest">VERIFICATION_LOG</label>
                <div className="border-2 border-foreground p-6 bg-background">
                  <p className="text-sm font-bold opacity-80 italic">"{currentResponse.admin_notes}"</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentResponseIndex(Math.max(0, currentResponseIndex - 1))}
            disabled={currentResponseIndex === 0}
            className="flex-1 px-8 py-5 border-2 border-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-20 transition-all"
          >
            [ PREVIOUS_NODE ]
          </button>
          <button
            onClick={() => setCurrentResponseIndex(Math.min(responses.length - 1, currentResponseIndex + 1))}
            disabled={currentResponseIndex === responses.length - 1}
            className="flex-1 px-8 py-5 border-2 border-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-20 transition-all"
          >
            [ NEXT_NODE ]
          </button>
        </div>
      </div>
    </main>
  );
}