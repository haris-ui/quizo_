'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const warningShownRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState<string | null>(null);

  // Anti-cheating detection
  useEffect(() => {
    const supabase = supabaseRef.current;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('[v0] Tab visibility changed - cheating detected');
        await markAsCheatingAndSubmit('Tab switch detected');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block sensitive keys
      const bannedKeys = ['F12', 'F11', 'Escape'];
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (bannedKeys.includes(e.key) || (isCtrlOrCmd && ['s', 'c', 'v'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        console.log('[v0] Banned key pressed - cheating detected');
        markAsCheatingAndSubmit('Banned key pressed');
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        console.log('[v0] Fullscreen exited - cheating detected');
        await markAsCheatingAndSubmit('Exited fullscreen');
      }
    };

    const handleWindowBlur = async () => {
      console.log('[v0] Window lost focus - cheating detected');
      await markAsCheatingAndSubmit('Window lost focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [quizId, rollNumber]);

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

  // Load questions and submission
  useEffect(() => {
    const loadQuiz = async () => {
      const supabase = supabaseRef.current;

      try {
        // Create or get submission
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

        // Load questions with options
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
            // Update
            await supabase
              .from('student_responses')
              .update(response)
              .eq('id', existingResponse.data.id);
          } else {
            // Insert
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
    if (warningShownRef.current || !submission) return;
    warningShownRef.current = true;

    const supabase = supabaseRef.current;

    await supabase
      .from('quiz_submissions')
      .update({
        is_cheating_detected: true,
        cheating_reason: reason,
        submitted_at: new Date().toISOString(),
        total_score: 0,
      })
      .eq('id', submission.id);

    setIsBanned(true);
    setBannedReason(reason);
    
    // We delay the redirect so they can see the banned message
    setTimeout(() => {
      onSubmit();
    }, 5000);
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!submission) return;

    const supabase = supabaseRef.current;

    // Calculate score for MCQs
    let totalScore = 0;

    for (const [questionId, response] of Object.entries(responses)) {
      const question = questions.find(q => q.id === questionId);
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

    const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);

    // Submit
    await supabase
      .from('quiz_submissions')
      .update({
        submitted_at: new Date().toISOString(),
        total_score: totalScore,
        max_score: maxScore,
      })
      .eq('id', submission.id);

    onSubmit();
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading quiz...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-600 font-bold">{error}</div>;
  if (isBanned) return (
    <div className="flex flex-col items-center justify-center h-screen bg-destructive/10">
      <h1 className="text-4xl font-bold text-destructive mb-4">Quiz Terminated</h1>
      <p className="text-xl text-center max-w-lg mb-4">
        Cheating detected: <strong>{bannedReason}</strong>
      </p>
      <p className="text-muted-foreground">Your score has been marked as 0. Redirecting...</p>
    </div>
  );
  if (!isFullscreen) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <div className="text-center max-w-lg px-4">
        <h1 className="text-3xl font-bold mb-4">Secure Exam Environment</h1>
        <p className="text-muted-foreground mb-6">
          This quiz requires fullscreen mode. Exiting fullscreen, switching tabs, or using restricted key combinations will immediately terminate your exam and result in a score of zero.
        </p>
        <button
          onClick={enterFullscreen}
          className="px-8 py-3 bg-primary text-primary-foreground text-lg font-semibold rounded-lg hover:opacity-90 shadow-lg"
        >
          Enter Fullscreen & Start Quiz
        </button>
      </div>
    </div>
  );
  if (questions.length === 0) return <div className="flex items-center justify-center h-screen">No questions found</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestion.id] || {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Question {currentQuestionIndex + 1} of {questions.length}</h1>
            <span className="text-sm text-muted-foreground">Roll: {rollNumber}</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-card rounded-lg p-8 mb-8 border">
          <h2 className="text-xl font-semibold mb-6">{currentQuestion.question_text}</h2>

          {currentQuestion.question_type === 'mcq' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map(option => (
                <label key={option.id} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-secondary">
                  <input
                    type="radio"
                    name={`question_${currentQuestion.id}`}
                    value={option.id}
                    checked={currentResponse.selected_option_id === option.id}
                    onChange={(e) => handleResponseChange(currentQuestion.id, { selected_option_id: e.target.value })}
                    className="mr-4"
                  />
                  <span>{option.option_text}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={currentResponse.short_answer_text || ''}
              onChange={(e) => handleResponseChange(currentQuestion.id, { short_answer_text: e.target.value })}
              placeholder="Enter your answer here..."
              className="w-full p-4 border rounded-lg font-mono text-sm min-h-32"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="px-6 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
          {currentQuestionIndex === questions.length - 1 && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg ml-auto"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
