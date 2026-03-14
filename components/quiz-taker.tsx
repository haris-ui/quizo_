'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  marks: number;
  order_index: number;
  options?: {
    id: string;
    option_text: string;
    order_index: number;
  }[];
}

interface QuizTakerProps {
  quizId: string;
  rollNumber: string;
  onSubmit: () => void;
}

export default function QuizTaker({ quizId, rollNumber, onSubmit }: QuizTakerProps) {
  const router = useRouter(); 
  
  // 1. All Standard States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Success/Ban/Fullscreen States
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 3. Timer States
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizDuration, setQuizDuration] = useState<number | null>(null);

  // 4. Refs
  const supabaseRef = useRef(createClient());
  const warningShownRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const submissionRef = useRef<any>(null);
  const responsesRef = useRef(responses);
  const questionsRef = useRef(questions);

  // 5. Syncing Effects
  useEffect(() => {
    submissionRef.current = submission;
  }, [submission]);

  useEffect(() => {
    responsesRef.current = responses;
    questionsRef.current = questions;
  }, [responses, questions]);

  // Anti-cheating detection
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !isSubmittingRef.current) {
        console.log('[v0] Tab visibility changed - cheating detected');
        await markAsCheatingAndSubmit('Tab switch detected');
      }
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isSubmittingRef.current) return;

      const bannedKeys = ['F12', 'F11', 'Escape'];
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (bannedKeys.includes(e.key) || (isCtrlOrCmd && ['s', 'c', 'v'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        console.log('[v0] Banned key pressed - cheating detected');
        await markAsCheatingAndSubmit('Banned key combination pressed');
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && !isSubmittingRef.current) {
        console.log('[v0] Fullscreen exited - cheating detected');
        await markAsCheatingAndSubmit('Exited fullscreen');
      }
    };

    const handleWindowBlur = async () => {
      if (!isSubmittingRef.current) {
        console.log('[v0] Window lost focus - cheating detected');
        await markAsCheatingAndSubmit('Window lost focus');
      }
    };

    const handleClipboard = async (e: ClipboardEvent) => {
      if (!isSubmittingRef.current) {
        e.preventDefault();
        console.log('[v0] Clipboard used - cheating detected');
        await markAsCheatingAndSubmit('Copy/Paste detected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('paste', handleClipboard);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
    };
  }, []); 

  // Request fullscreen explicitly
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
      alert('You must allow fullscreen to take this quiz.');
    }
  };

  // Load questions, duration, and submission
  useEffect(() => {
    const loadQuiz = async () => {
      const supabase = supabaseRef.current;

      try {
        // Fetch dynamic quiz duration
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('duration_minutes')
          .eq('id', quizId)
          .single();

        if (quizError) {
          console.warn('Could not fetch quiz duration, defaulting to 30 mins', quizError);
          setQuizDuration(30);
        } else {
          setQuizDuration(quizData?.duration_minutes || 30);
        }

        // Check for existing submission
        const { data: existingSubmission, error: checkError } = await supabase
          .from('quiz_submissions')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('roll_number', rollNumber)
          .single();

        if (!checkError && existingSubmission) {
          setError('You have already completed this quiz!');
          setLoading(false);
          return;
        }

        // Create new submission
        const { data: newSubmission, error: submitError } = await supabase
          .from('quiz_submissions')
          .insert([{
            quiz_id: quizId,
            roll_number: rollNumber,
            started_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (submitError) throw submitError;
        setSubmission(newSubmission);

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select(`
            id,
            question_text,
            question_type,
            marks,
            order_index,
            mcq_options (
              id,
              option_text,
              order_index
            )
          `)
          .eq('quiz_id', quizId)
          .order('order_index', { ascending: true });

        if (questionsError) throw questionsError;

        const formattedQuestions = questionsData?.map((q: any) => ({
          ...q,
          options: q.mcq_options || [],
        })) || [];

        setQuestions(formattedQuestions);
        setLoading(false);
      } catch (err: any) {
        console.error('[v0] Error loading quiz:', err);
        setError(err.message || 'Failed to load quiz');
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId, rollNumber]);

  // Auto-save responses every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (submission && Object.keys(responses).length > 0) {
        const supabase = supabaseRef.current;

        for (const [questionId, response] of Object.entries(responses)) {
          const question = questions.find(q => q.id === questionId);
          if (!question) continue;

          const existingResponse = await supabase
            .from('student_responses')
            .select('id')
            .eq('submission_id', submission.id)
            .eq('question_id', questionId)
            .single();

          if (existingResponse.data) {
            await supabase
              .from('student_responses')
              .update(response)
              .eq('id', existingResponse.data.id);
          } else {
            await supabase
              .from('student_responses')
              .insert([{
                submission_id: submission.id,
                question_id: questionId,
                question_type: question.question_type,
                ...response,
              }]);
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [submission, responses, questions]);

  const markAsCheatingAndSubmit = async (reason: string) => {
    if (warningShownRef.current || !submissionRef.current) return;
    warningShownRef.current = true;
    isSubmittingRef.current = true; 

    const supabase = supabaseRef.current;

    await supabase
      .from('quiz_submissions')
      .update({
        is_cheating_detected: true,
        cheating_reason: reason,
        submitted_at: new Date().toISOString(),
        total_score: 0,
      })
      .eq('id', submissionRef.current.id);

    setIsBanned(true);
    setBannedReason(reason);

    setTimeout(() => {
      onSubmit();
      router.push('/');
    }, 5000);
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!submissionRef.current) return;

    isSubmittingRef.current = true;
    const supabase = supabaseRef.current;

    let totalScore = 0;
    
    // Using refs safely ensures we catch the latest state when timer auto-submits
    const currentResponses = responsesRef.current;
    const currentQuestions = questionsRef.current;

    for (const [questionId, response] of Object.entries(currentResponses)) {
      const question = currentQuestions.find(q => q.id === questionId);
      if (!question) continue;

      if (question.question_type === 'mcq' && response.selected_option_id) {
        const { data: option } = await supabase
          .from('mcq_options')
          .select('is_correct')
          .eq('id', response.selected_option_id)
          .single();

        if (option?.is_correct) {
          totalScore += question.marks;
        }
      }
    }

    const maxScore = currentQuestions.reduce((sum, q) => sum + q.marks, 0);

    await supabase
      .from('quiz_submissions')
      .update({
        submitted_at: new Date().toISOString(),
        total_score: totalScore,
        max_score: maxScore,
      })
      .eq('id', submissionRef.current.id);

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(console.error);
    }

    setIsSubmitted(true);

    setTimeout(() => {
      onSubmit();
      router.push('/');
    }, 3000);
  };

  // Dynamic Auto-Submit Timer
  useEffect(() => {
    if (!submission || !quizDuration) return;

    const durationMs = quizDuration * 60 * 1000;
    
    // Timezone safe parser
    const dbTime = submission.started_at;
    const safeStartTimeStr = (dbTime.endsWith('Z') || dbTime.includes('+')) ? dbTime : `${dbTime}Z`;
    
    const startTime = new Date(safeStartTimeStr).getTime();
    const endTime = startTime + durationMs;

    const timerInterval = setInterval(() => {
      if (isSubmittingRef.current) {
        clearInterval(timerInterval);
        return;
      }

      const now = new Date().getTime();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearInterval(timerInterval);
        setTimeLeft(0);
        console.log('[v0] Time exhausted - auto submitting');
        handleSubmit(); 
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [submission, quizDuration]);

  // Helper to format the countdown timer
  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // --- RENDER BLOCK --- //

  if (loading) return <div className="flex items-center justify-center h-screen font-mono uppercase tracking-widest bg-background text-foreground">Loading protocol...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-foreground font-black uppercase tracking-widest bg-background p-6 border-4 border-foreground">{error}</div>;

  if (isBanned) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-6 font-mono uppercase">
      <div className="border-4 border-foreground p-12 max-w-2xl w-full text-center">
        <h1 className="text-5xl font-black mb-8 tracking-tighter text-red-600">ASSESSMENT TERMINATED</h1>
        <div className="p-4 bg-foreground text-background mb-8 font-black">
          VIOLATION DETECTED: {bannedReason}
        </div>
        <p className="text-base mb-8 leading-relaxed">
          The environment integrity has been compromised. Your identification has been flagged and your score has been recorded as zero (0).
        </p>
        <p className="text-xs opacity-50 animate-pulse">REDIRECTING TO HOME...</p>
      </div>
    </div>
  );

  if (isSubmitted) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-6 font-mono uppercase">
      <div className="border-4 border-foreground p-12 max-w-2xl w-full text-center">
        <h1 className="text-5xl font-black mb-8 tracking-tighter text-green-600">ASSESSMENT COMPLETE</h1>
        <div className="p-4 bg-foreground text-background mb-8 font-black">
          STATUS: SUCCESSFULLY TRANSMITTED
        </div>
        <p className="text-base mb-8 leading-relaxed">
          Your responses have been securely logged and uploaded to the mainframe.
        </p>
        <p className="text-xs opacity-50 animate-pulse">REDIRECTING TO HOME...</p>
      </div>
    </div>
  );

  if (!isFullscreen) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-6 font-mono uppercase">
      <div className="border-4 border-foreground p-12 max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-8 border-b-4 border-foreground pb-6">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-3xl font-black tracking-tight">SECURE ENVIRONMENT REQUIRED</h1>
        </div>
        <div className="space-y-6 mb-12 text-sm leading-relaxed">
          <p>This assessment requires immediate terminal locking.</p>
          <ul className="list-none space-y-4">
            <li className="flex gap-4"><span className="font-black">[!]</span> <span>EXITING FULLSCREEN = IMMEDIATE FAILURE.</span></li>
            <li className="flex gap-4"><span className="font-black">[!]</span> <span>TAB SWITCHING = IMMEDIATE FAILURE.</span></li>
            <li className="flex gap-4"><span className="font-black">[!]</span> <span>KEYS (ESC, F11, CTRL+C/V) = PROHIBITED.</span></li>
          </ul>
        </div>
        <button
          onClick={enterFullscreen}
          className="w-full py-6 bg-foreground text-background text-xl font-black tracking-widest hover:opacity-90 transition-opacity"
        >
          AUTHORIZE & START &gt;
        </button>
      </div>
    </div>
  );

  if (questions.length === 0) return <div className="flex items-center justify-center h-screen font-mono uppercase bg-background text-foreground">NO DATA DETECTED.</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestion.id] || {};

  return (
    <div
      className="min-h-screen bg-background text-foreground p-8 font-mono uppercase selection:bg-foreground selection:text-background"
      onContextMenu={(e) => e.preventDefault()} 
    >
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-3xl font-black tracking-tighter">QUIZO ASSESSMENT</h2>
              <p className="text-xs text-muted-foreground mt-1">ID: {rollNumber} // ITEM {currentQuestionIndex + 1} OF {questions.length}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              {timeLeft !== null && (
                <div className={`text-xl font-black tracking-widest ${timeLeft < 300000 ? 'text-red-500 animate-pulse' : ''}`}>
                  T-MINUS {formatTime(timeLeft)}
                </div>
              )}
              <span className="text-sm font-black tracking-widest">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% COMPLETE</span>
            </div>
          </div>
          <div className="w-full bg-secondary h-4 border-2 border-foreground">
            <div 
              className="bg-foreground h-full transition-all duration-500"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
        {/* Question Area */}
        <div className="border-4 border-foreground p-10 bg-card mb-8">
          <div className="flex justify-between items-start mb-8 border-b-2 border-foreground pb-4">
            <span className="bg-foreground text-background px-4 py-1 font-black text-sm">ITEM {currentQuestionIndex + 1}</span>
            <span className="font-black text-sm">{currentQuestion.marks} MARKS</span>
          </div>

          <h2 className="text-2xl font-black mb-10 leading-snug tracking-tight italic">"{currentQuestion.question_text}"</h2>

          {currentQuestion.question_type === 'mcq' ? (
            <div className="space-y-4">
              {currentQuestion.options?.map(option => (
                <label
                  key={option.id}
                  className={`flex items-center p-6 border-2 transition-colors cursor-pointer ${currentResponse.selected_option_id === option.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-foreground hover:bg-secondary'
                    }`}
                >
                  <input
                    type="radio"
                    name={`question_${currentQuestion.id}`}
                    value={option.id}
                    checked={currentResponse.selected_option_id === option.id}
                    onChange={(e) => handleResponseChange(currentQuestion.id, { selected_option_id: e.target.value })}
                    className="sr-only"
                  />
                  <span className="text-lg font-bold">{option.option_text}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="border-2 border-foreground bg-background text-left font-mono normal-case">
              <div className="bg-foreground text-background text-xs px-4 py-1 font-black tracking-widest uppercase">
                // CPP_EDITOR_TERMINAL
              </div>
              <CodeMirror
                value={currentResponse.short_answer_text || ''}
                height="350px"
                extensions={[cpp()]}
                onChange={(value) => handleResponseChange(currentQuestion.id, { short_answer_text: value })}
                theme="dark"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                }}
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-10 py-4 border-2 border-foreground font-black text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors disabled:opacity-30"
          >
            &lt; PREVIOUS
          </button>
          <button
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="px-10 py-4 border-2 border-foreground font-black text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors disabled:opacity-30"
          >
            NEXT &gt;
          </button>
          {currentQuestionIndex === questions.length - 1 && (
            <button
              onClick={handleSubmit}
              className="px-10 py-4 bg-foreground text-background font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity ml-auto border-2 border-foreground"
            >
              FINAL SUBMISSION
            </button>
          )}
        </div>

        {/* Security Warning Sticky */}
        <div className="mt-12 text-center">
          <p className="text-[10px] tracking-[0.2em] font-black opacity-30">SECURITY PROTOCOL ACTIVE // CONTINUOUS PERSISTENCE ENABLED</p>
        </div>
      </div>
    </div>
  );
}