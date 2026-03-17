'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface Question {
  id?: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  marks: number;
  order_index: number;
  options?: Option[];
}

interface Option {
  id?: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface QuizBuilderProps {
  quizId?: string;
}

export default function QuizBuilder({ quizId }: QuizBuilderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(quizId ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const supabase = createClient();

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      if (quiz.is_locked) {
        setError('This quiz is locked and cannot be edited');
        return;
      }

      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setDuration(quiz.duration_minutes);

      // Load questions
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
            is_correct,
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
    } catch (err: any) {
      console.error('[v0] Error loading quiz:', err);
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      question_text: '',
      question_type: 'mcq',
      marks: 1,
      order_index: questions.length,
      options: [
        { option_text: '', is_correct: false, order_index: 0 },
        { option_text: '', is_correct: true, order_index: 1 },
      ],
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionId(`temp-${Date.now()}`);
  };

  const handleUpdateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm('Delete this question?')) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      setError('Quiz title is required');
      return;
    }

    if (questions.length === 0) {
      setError('Add at least one question');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const adminId = localStorage.getItem('adminId');

      let quizId_ = quizId;

      if (!quizId_) {
        // Create new quiz
        const { data: newQuiz, error: createError } = await supabase
          .from('quizzes')
          .insert([{
            admin_id: adminId,
            title,
            description,
            duration_minutes: duration,
          }])
          .select()
          .single();

        if (createError) throw createError;
        quizId_ = newQuiz.id;
      } else {
        // Update existing quiz
        const { error: updateError } = await supabase
          .from('quizzes')
          .update({ title, description, duration_minutes: duration })
          .eq('id', quizId_);

        if (updateError) throw updateError;
      }

      // Save questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        let questionId = question.id;

        if (!questionId || questionId.startsWith('temp-')) {
          // Create new question
          const { data: newQuestion, error: qError } = await supabase
            .from('quiz_questions')
            .insert([{
              quiz_id: quizId_,
              question_text: question.question_text,
              question_type: question.question_type,
              marks: question.marks,
              order_index: i,
            }])
            .select()
            .single();

          if (qError) throw qError;
          questionId = newQuestion.id;
        } else {
          // Update existing question
          const { error: qError } = await supabase
            .from('quiz_questions')
            .update({
              question_text: question.question_text,
              question_type: question.question_type,
              marks: question.marks,
              order_index: i,
            })
            .eq('id', questionId);

          if (qError) throw qError;
        }

        // Save MCQ options if applicable
        if (question.question_type === 'mcq' && question.options) {
          // Delete old options
          await supabase.from('mcq_options').delete().eq('question_id', questionId);

          // Insert new options
          const { error: optError } = await supabase
            .from('mcq_options')
            .insert(
              question.options.map((opt, idx) => ({
                question_id: questionId,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
                order_index: idx,
              }))
            );

          if (optError) throw optError;
        }
      }

      alert('Quiz saved successfully!');
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('[v0] Error saving quiz:', err);
      setError(err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-mono uppercase selection:bg-foreground selection:text-background text-foreground">
      <div className="bg-card border-4 border-foreground p-10">
        <div className="flex justify-between items-end mb-10 pb-6 border-b-4 border-foreground">
          <h1 className="text-4xl font-black tracking-tighter italic">
            {quizId ? 'MODIFY PROTOCOL' : 'INITIALIZE NEW PROTOCOL'}
          </h1>
          <p className="text-[10px] font-black opacity-30 tracking-[0.3em]">SECURE_CONFIG_LOCKED: FALSE</p>
        </div>

        {error && (
          <div className="p-6 border-4 border-foreground bg-foreground text-background font-black mb-8 text-sm">
            ERROR DETECTED: {error.toUpperCase()}
          </div>
        )}

        {/* Quiz Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="md:col-span-2">
            <label className="block text-xs font-black mb-3 tracking-widest">PROTOCOL TITLE *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G., ADVANCED ALGORITHMS 101"
              className="w-full px-6 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors font-black text-xl uppercase"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black mb-3 tracking-widest">PROTOCOL DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="DEFINE PROTOCOL PARAMETERS..."
              className="w-full px-6 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors min-h-[120px] resize-none uppercase"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-black mb-3 tracking-widest">TEMPORAL DURATION (MINUTES)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-6 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors font-black"
              min="1"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-foreground">
            <h2 className="text-2xl font-black uppercase tracking-wider italic">ITEM INDEX ({questions.length})</h2>
          </div>
          
          <div className="space-y-8">
            {questions.map((question, index) => (
              <QuestionEditor
                key={index}
                question={question}
                index={index}
                onUpdate={(updated) => handleUpdateQuestion(index, updated)}
                onDelete={() => handleDeleteQuestion(index)}
                isEditing={editingQuestionId === question.id || editingQuestionId === `temp-${index}`}
              />
            ))}
          </div>

          <button
            onClick={handleAddQuestion}
            className="mt-8 w-full py-6 border-4 border-dashed border-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors text-xl"
          >
            + APPEND ITEM TO INDEX
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 pt-8 border-t-4 border-foreground">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex-1 px-8 py-5 border-2 border-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
          >
            ABORT MISSION
          </button>
          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className="flex-1 px-8 py-5 bg-foreground text-background font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {saving ? 'SYNCHRONIZING...' : 'COMMIT PROTOCOL >'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
  isEditing,
}: {
  question: Question;
  index: number;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
  isEditing: boolean;
}) {
  return (
    <div className="border-2 border-foreground p-8 bg-card relative">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-foreground/20">
        <h3 className="font-black text-xs tracking-[0.2em]">ITEM_{String(index + 1).padStart(3, '0')}</h3>
        <button
          onClick={onDelete}
          className="px-4 py-1 border-2 border-foreground font-black text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
        >
          [ PURGE ]
        </button>
      </div>

      <div className="space-y-6">
        <div>
          {/* UPDATED: Added Markdown Support hints and removed uppercase lock */}
          <div className="flex justify-between items-end mb-3">
            <label className="block text-xs font-black tracking-widest text-foreground/50">ITEM TEXT *</label>
            <span className="text-[10px] text-foreground/40 font-mono font-black">SUPPORTS MARKDOWN: **BOLD** | # LARGE | - BULLETS</span>
          </div>
          <textarea
            value={question.question_text}
            onChange={(e) => onUpdate({ ...question, question_text: e.target.value })}
            placeholder="USE **BOLD** FOR EMPHASIS, # FOR HEADINGS, AND - FOR BULLET POINTS..."
            className="w-full px-6 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors min-h-[100px] resize-none font-bold normal-case"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black mb-3 tracking-widest text-foreground/50">ITEM CLASSIFICATION</label>
            <select
              value={question.question_type}
              onChange={(e) => onUpdate({
                ...question,
                question_type: e.target.value as 'mcq' | 'short_answer',
                options: e.target.value === 'short_answer' ? undefined : question.options,
              })}
              className="w-full px-6 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors font-black tracking-widest"
            >
              <option value="mcq">MULTIPLE CHOICE</option>
              <option value="short_answer">EXTENDED RESPONSE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black mb-3 tracking-widest text-foreground/50">VALUATION (MARKS)</label>
            <input
              type="number"
              value={question.marks}
              onChange={(e) => onUpdate({ ...question, marks: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-6 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors font-black"
              min="1"
            />
          </div>
        </div>

        {/* MCQ Options */}
        {question.question_type === 'mcq' && question.options && (
          <div className="pt-6 border-t border-foreground/10">
            <label className="block text-xs font-black mb-4 tracking-widest text-foreground/50">OPTION MATRIX</label>
            <div className="space-y-4">
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex gap-4 items-center">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={option.is_correct}
                      onChange={(e) => {
                        const updatedOptions = [...question.options!];
                        updatedOptions[optIndex] = { ...option, is_correct: e.target.checked };
                        onUpdate({ ...question, options: updatedOptions });
                      }}
                      className="w-8 h-8 border-2 border-foreground appearance-none checked:bg-foreground checked:after:content-['✓'] checked:after:text-background checked:after:absolute checked:after:flex checked:after:items-center checked:after:justify-center cursor-pointer"
                      title="MARK AS VALID"
                    />
                  </div>
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => {
                      const updatedOptions = [...question.options!];
                      updatedOptions[optIndex] = { ...option, option_text: e.target.value };
                      onUpdate({ ...question, options: updatedOptions });
                    }}
                    placeholder={`DATA_${optIndex + 1}`}
                    className="flex-1 px-4 py-3 border-2 border-foreground bg-background focus:outline-none focus:bg-foreground focus:text-background transition-all uppercase text-sm font-bold"
                  />
                  <button
                    onClick={() => {
                      const updatedOptions = question.options!.filter((_, i) => i !== optIndex);
                      onUpdate({ ...question, options: updatedOptions });
                    }}
                    className="px-3 py-3 border-2 border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors text-xs font-black"
                  >
                    [ X ]
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const newOption: Option = {
                  option_text: '',
                  is_correct: false,
                  order_index: (question.options?.length || 0),
                };
                onUpdate({ ...question, options: [...(question.options || []), newOption] });
              }}
              className="mt-6 px-6 py-3 border-2 border-foreground font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors w-full md:w-auto"
            >
              + APPEND OPTION
            </button>
          </div>
        )}
      </div>
    </div>
  );
}