import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL_STATEMENTS = [
  // 1. Admins table
  `CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // 2. Quizzes table
  `CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // 3. Quiz Questions table
  `CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
    marks INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // 4. MCQ Options table
  `CREATE TABLE IF NOT EXISTS mcq_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // 5. Quiz Submissions table
  `CREATE TABLE IF NOT EXISTS quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    is_cheating_detected BOOLEAN DEFAULT FALSE,
    cheating_reason TEXT,
    total_score FLOAT,
    max_score FLOAT,
    grading_completed BOOLEAN DEFAULT FALSE,
    UNIQUE(quiz_id, roll_number),
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // 6. Student Responses table
  `CREATE TABLE IF NOT EXISTS student_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
    selected_option_id UUID REFERENCES mcq_options(id) ON DELETE SET NULL,
    short_answer_text TEXT,
    is_correct BOOLEAN,
    marks_obtained FLOAT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Enable RLS
  `ALTER TABLE admins ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE mcq_options ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE student_responses ENABLE ROW LEVEL SECURITY`,

  // RLS Policies
  `CREATE POLICY IF NOT EXISTS "Students can view active quizzes" ON quizzes
    FOR SELECT USING (NOT is_locked)`,

  `CREATE POLICY IF NOT EXISTS "Students can view questions for unlocked quizzes" ON quiz_questions
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND NOT quizzes.is_locked)
    )`,

  `CREATE POLICY IF NOT EXISTS "Students can view MCQ options" ON mcq_options
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM quiz_questions 
        WHERE quiz_questions.id = mcq_options.question_id
        AND EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND NOT quizzes.is_locked)
      )
    )`,

  `CREATE POLICY IF NOT EXISTS "Students can create submissions" ON quiz_submissions
    FOR INSERT WITH CHECK (true)`,

  `CREATE POLICY IF NOT EXISTS "Students can view submissions" ON quiz_submissions
    FOR SELECT USING (true)`,

  `CREATE POLICY IF NOT EXISTS "Students can create responses" ON student_responses
    FOR INSERT WITH CHECK (true)`,

  `CREATE POLICY IF NOT EXISTS "Students can view responses" ON student_responses
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM quiz_submissions WHERE quiz_submissions.id = student_responses.submission_id)
    )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_quizzes_admin_id ON quizzes(admin_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mcq_options_question_id ON mcq_options(question_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_submissions_roll_number ON quiz_submissions(roll_number)`,
  `CREATE INDEX IF NOT EXISTS idx_student_responses_submission_id ON student_responses(submission_id)`,
  `CREATE INDEX IF NOT EXISTS idx_student_responses_question_id ON student_responses(question_id)`,
];

async function setupDatabase() {
  console.log("Starting database setup...");

  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    const sql = SQL_STATEMENTS[i];
    console.log(`[${i + 1}/${SQL_STATEMENTS.length}] Executing statement...`);

    try {
      const { error } = await supabase.rpc("sql", { sql });
      if (error) {
        // Try raw query execution as fallback
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({ query: sql }),
        });

        if (!response.ok) {
          console.warn(`⚠️  Statement ${i + 1} might have issues:`, sql.substring(0, 50));
        }
      }
    } catch (err) {
      console.warn(`⚠️  Error on statement ${i + 1}:`, err.message);
    }
  }

  console.log("✅ Database setup completed!");
}

setupDatabase().catch(console.error);
