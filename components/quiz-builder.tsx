'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-card rounded-lg border p-8">
        <h1 className="text-3xl font-bold mb-8">
          {quizId ? 'Edit Quiz' : 'Create New Quiz'}
        </h1>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Quiz Details */}
        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mathematics Final Exam"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quiz description (optional)"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              min="1"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Questions ({questions.length})</h2>
          <div className="space-y-6">
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
            className="mt-6 w-full py-3 border-2 border-dashed rounded-lg hover:bg-secondary font-medium"
          >
            + Add Question
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex-1 px-6 py-3 border rounded-lg hover:bg-secondary font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save Quiz'}
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
    <div className="border rounded-lg p-4 bg-secondary/30">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg">Question {index + 1}</h3>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm border border-destructive text-destructive rounded hover:bg-destructive/10"
        >
          Delete
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Question Text *</label>
          <textarea
            value={question.question_text}
            onChange={(e) => onUpdate({ ...question, question_text: e.target.value })}
            placeholder="Enter the question..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Question Type</label>
            <select
              value={question.question_type}
              onChange={(e) => onUpdate({
                ...question,
                question_type: e.target.value as 'mcq' | 'short_answer',
                options: e.target.value === 'short_answer' ? undefined : question.options,
              })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="mcq">Multiple Choice</option>
              <option value="short_answer">Short Answer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Marks</label>
            <input
              type="number"
              value={question.marks}
              onChange={(e) => onUpdate({ ...question, marks: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              min="1"
            />
          </div>
        </div>

        {/* MCQ Options */}
        {question.question_type === 'mcq' && question.options && (
          <div>
            <label className="block text-sm font-medium mb-2">Options</label>
            <div className="space-y-3">
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex gap-3 items-center">
                  <input
                    type="checkbox"
                    checked={option.is_correct}
                    onChange={(e) => {
                      const updatedOptions = [...question.options!];
                      updatedOptions[optIndex] = { ...option, is_correct: e.target.checked };
                      onUpdate({ ...question, options: updatedOptions });
                    }}
                    className="w-4 h-4"
                    title="Mark as correct answer"
                  />
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => {
                      const updatedOptions = [...question.options!];
                      updatedOptions[optIndex] = { ...option, option_text: e.target.value };
                      onUpdate({ ...question, options: updatedOptions });
                    }}
                    placeholder={`Option ${optIndex + 1}`}
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      const updatedOptions = question.options!.filter((_, i) => i !== optIndex);
                      onUpdate({ ...question, options: updatedOptions });
                    }}
                    className="px-3 py-2 text-sm border border-destructive text-destructive rounded hover:bg-destructive/10"
                  >
                    Remove
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
              className="mt-3 px-4 py-2 text-sm border rounded hover:bg-secondary"
            >
              + Add Option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
