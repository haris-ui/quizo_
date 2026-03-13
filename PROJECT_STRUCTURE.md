# Project Structure

Complete guide to the Quiz Platform codebase.

## Directory Overview

```
/
├── app/
│   ├── page.tsx                          # Home page with feature overview
│   ├── setup/
│   │   └── page.tsx                      # Database initialization page
│   ├── student/
│   │   ├── page.tsx                      # Student roll number entry
│   │   └── quiz/[quizId]/
│   │       └── page.tsx                  # Quiz taking page (fullscreen)
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx                  # Admin login/signup page
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Quiz list and management
│   │   ├── quizzes/
│   │   │   ├── new/
│   │   │   │   └── page.tsx              # Create new quiz
│   │   │   └── [id]/edit/
│   │   │       └── page.tsx              # Edit existing quiz
│   │   ├── results/[quizId]/
│   │   │   └── page.tsx                  # Results dashboard (CSV export)
│   │   ├── grade/[submissionId]/
│   │   │   └── page.tsx                  # Grade short answers
│   │   └── review/[submissionId]/
│   │       └── page.tsx                  # View completed grades
│   └── api/
│       ├── init-db/
│       │   └── route.ts                  # Database initialization endpoint
│       └── admin/
│           ├── register/
│           │   └── route.ts              # Admin registration
│           └── login/
│               └── route.ts              # Admin authentication
├── components/
│   ├── quiz-taker.tsx                    # Main quiz taking component (anti-cheating)
│   └── quiz-builder.tsx                  # Quiz creation/editing component
├── lib/
│   ├── auth.ts                           # Password hashing, admin login/registration
│   ├── supabase/
│   │   ├── client.ts                     # Supabase browser client
│   │   ├── server.ts                     # Supabase server client
│   │   └── middleware.ts                 # Session management middleware
├── scripts/
│   ├── create-quiz-tables.sql            # Database schema (SQL)
│   └── setup-db.js                       # Database setup script
├── public/                               # Static assets
├── package.json                          # Dependencies
├── next.config.mjs                       # Next.js configuration
├── tsconfig.json                         # TypeScript config
├── tailwind.config.ts                    # Tailwind CSS config
├── postcss.config.mjs                    # PostCSS config
└── Documentation/
    ├── README_QUIZ.md                    # Full feature documentation
    ├── QUICKSTART.md                     # 5-minute setup guide
    ├── DEPLOYMENT.md                     # Production deployment
    └── PROJECT_STRUCTURE.md              # This file

```

## Key Files Explained

### Frontend Pages

#### `app/page.tsx`
- Landing page with feature overview
- Links to student and admin portals
- How it works guide

#### `app/setup/page.tsx`
- One-click database initialization
- Checks integration status
- Guides new users

#### `app/student/page.tsx`
- Roll number entry form
- Fetches available quizzes
- Prevents duplicate submissions

#### `app/student/quiz/[quizId]/page.tsx`
- Main quiz interface
- Fullscreen mode enforcement
- Routes to QuizTaker component

#### `app/admin/dashboard/page.tsx`
- Admin quiz list
- Create/Edit/Delete controls
- Links to results and grading

#### `app/admin/quizzes/new/page.tsx` & `[id]/edit/page.tsx`
- Quiz builder interface
- MCQ and short answer support
- Question and option management

#### `app/admin/results/[quizId]/page.tsx`
- Submission dashboard
- Score tracking
- CSV export functionality
- Cheating detection display

#### `app/admin/grade/[submissionId]/page.tsx`
- Manual grading interface
- One question at a time
- Marks and notes assignment

### Core Components

#### `components/quiz-taker.tsx`
**The heart of student experience**
- Fullscreen enforcement
- Anti-cheating detection:
  - Tab visibility monitoring
  - Window blur detection
  - Fullscreen exit detection
  - Banned key blocking
- Auto-save every 5 seconds
- Question navigation
- MCQ and short answer rendering
- Auto-grading for MCQs
- Response submission

#### `components/quiz-builder.tsx`
**Admin quiz creation**
- Quiz metadata (title, description, duration)
- Question management (add, edit, delete)
- MCQ option management
- Marks per question
- Question ordering
- Database persistence

### API Routes

#### `app/api/init-db/route.ts`
- Creates all database tables
- Enables RLS
- Creates indexes
- Sets up policies

#### `app/api/admin/register/route.ts`
- Admin account creation
- Password hashing with bcrypt
- JWT token generation

#### `app/api/admin/login/route.ts`
- Admin authentication
- Credential validation
- JWT token creation

### Libraries & Utilities

#### `lib/auth.ts`
- `hashPassword()` - bcrypt hashing
- `verifyPassword()` - bcrypt comparison
- `registerAdmin()` - Create admin account
- `loginAdmin()` - Authenticate admin
- `getAdminById()` - Fetch admin details

#### `lib/supabase/client.ts`
- Browser-side Supabase client
- Used in React components

#### `lib/supabase/server.ts`
- Server-side Supabase client
- Used in API routes

## Database Schema

### Tables

#### `admins`
```
- id (UUID) PRIMARY KEY
- email (TEXT) UNIQUE
- password_hash (TEXT)
- created_at (TIMESTAMP)
```

#### `quizzes`
```
- id (UUID) PRIMARY KEY
- admin_id (UUID) FOREIGN KEY → admins
- title (TEXT)
- description (TEXT)
- duration_minutes (INTEGER)
- is_locked (BOOLEAN) - Locked after first submission
- created_at, updated_at (TIMESTAMP)
```

#### `quiz_questions`
```
- id (UUID) PRIMARY KEY
- quiz_id (UUID) FOREIGN KEY → quizzes
- question_text (TEXT)
- question_type (VARCHAR) - 'mcq' or 'short_answer'
- marks (INTEGER)
- order_index (INTEGER) - Question order
- created_at (TIMESTAMP)
```

#### `mcq_options`
```
- id (UUID) PRIMARY KEY
- question_id (UUID) FOREIGN KEY → quiz_questions
- option_text (TEXT)
- is_correct (BOOLEAN)
- order_index (INTEGER)
- created_at (TIMESTAMP)
```

#### `quiz_submissions`
```
- id (UUID) PRIMARY KEY
- quiz_id (UUID) FOREIGN KEY → quizzes
- roll_number (TEXT)
- started_at (TIMESTAMP)
- submitted_at (TIMESTAMP)
- is_cheating_detected (BOOLEAN)
- cheating_reason (TEXT)
- total_score (FLOAT)
- max_score (FLOAT)
- grading_completed (BOOLEAN)
- UNIQUE(quiz_id, roll_number)
- created_at (TIMESTAMP)
```

#### `student_responses`
```
- id (UUID) PRIMARY KEY
- submission_id (UUID) FOREIGN KEY → quiz_submissions
- question_id (UUID) FOREIGN KEY → quiz_questions
- question_type (VARCHAR)
- selected_option_id (UUID) FOREIGN KEY → mcq_options
- short_answer_text (TEXT)
- is_correct (BOOLEAN)
- marks_obtained (FLOAT)
- admin_notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### Indexes

Created for performance:
- `idx_quizzes_admin_id`
- `idx_quiz_questions_quiz_id`
- `idx_mcq_options_question_id`
- `idx_quiz_submissions_quiz_id`
- `idx_quiz_submissions_roll_number`
- `idx_student_responses_submission_id`
- `idx_student_responses_question_id`

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Students can view active (unlocked) quizzes
- Students can create/view their own submissions
- Admins can manage their quizzes
- Quiz becomes locked after first student submission

## Dependencies

### Core
- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling

### Database
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - SSR support

### Authentication
- `jsonwebtoken` - JWT tokens
- `bcryptjs` - Password hashing

### UI Components
- `@radix-ui/*` - Accessible components
- `lucide-react` - Icons
- `sonner` - Notifications

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
```

## Routing Structure

### Student Routes
```
/ - Home
/student - Roll number entry
/student/quiz/[quizId] - Quiz taking
```

### Admin Routes
```
/admin/login - Authentication
/admin/dashboard - Quiz management
/admin/quizzes/new - Create quiz
/admin/quizzes/[id]/edit - Edit quiz
/admin/results/[quizId] - Results dashboard
/admin/grade/[submissionId] - Grading interface
/admin/review/[submissionId] - View grades
```

### Setup Routes
```
/setup - Database initialization
```

## Data Flow

### Quiz Creation
1. Admin creates quiz with metadata
2. Questions are inserted
3. MCQ options are inserted
4. Quiz becomes editable until first submission

### Quiz Submission
1. Student enters roll number
2. Checks for existing submission (prevents duplicate)
3. Creates submission record
4. Student starts fullscreen quiz
5. Responses auto-save every 5 seconds
6. Student submits quiz
7. MCQs auto-graded immediately
8. Short answers await manual grading

### Grading
1. Admin views results page
2. For pending short answers, clicks Grade
3. Reviews each answer
4. Assigns marks and notes
5. Completes grading
6. Submission marked as graded

### Export
1. Admin in results page
2. Clicks Export CSV
3. Downloads file with all scores and metadata

## Performance Considerations

- Auto-save every 5 seconds (configurable)
- Database indexes on all common queries
- Supabase connection pooling
- RLS reduces data fetching
- API routes serverless

## Security Measures

1. **Authentication**: JWT tokens with expiry
2. **Passwords**: bcrypt hashing (10 salt rounds)
3. **Database**: RLS policies
4. **API**: Service role key for sensitive ops
5. **Data**: Unique constraint on roll+quiz
6. **Client**: No sensitive data in localStorage
7. **Anti-Cheating**: Strict detection and blocking

## Testing Checklist

- [ ] Create admin account
- [ ] Create quiz with MCQs
- [ ] Create quiz with short answers
- [ ] Take quiz as student
- [ ] Test anti-cheating (tab switch)
- [ ] Submit quiz
- [ ] View results as admin
- [ ] Grade short answers
- [ ] Export results as CSV
- [ ] Verify locked quiz can't be edited
- [ ] Prevent duplicate submission

## Future Enhancement Ideas

- Timed quizzes with countdown
- Question randomization
- Partial MCQ marking
- Answer masking during grading
- Live results dashboard
- Email notifications
- Learning Management System integration
- Analytics and reporting
