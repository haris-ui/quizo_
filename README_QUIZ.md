# Quiz Management System

A comprehensive web-based quiz platform with admin quiz creation and student quiz-taking capabilities, featuring strict anti-cheating detection.

## Features

### Student Features
- **Roll Number Login**: Students enter their roll number to access available quizzes
- **Fullscreen Quiz Mode**: Quiz page enforces fullscreen mode with automatic zero scoring if exited
- **Anti-Cheating Detection**:
  - Tab switch detection (visibilitychange)
  - Window blur/focus loss detection
  - Banned key detection (F11, F12, Escape, Ctrl+C, Ctrl+V, Ctrl+S)
  - Fullscreen exit detection
  - All violations result in immediate zero marking and submission
- **Auto-Save**: Responses auto-save every 5 seconds
- **Multiple Question Types**:
  - MCQ (Multiple Choice Questions) - Auto-graded
  - Short Answer - Manual admin grading
- **Progress Tracking**: Visual progress bar showing quiz completion

### Admin Features
- **Quiz Management**:
  - Create new quizzes with title, description, and duration
  - Edit quizzes before first student submission (auto-locked after)
  - Delete quizzes (before first submission)
  - Support for MCQ and short answer questions
- **Quiz Builder**:
  - Add/edit multiple questions
  - Create MCQ options with correct answer marking
  - Set question marks/points
  - Reorder questions
- **Results Dashboard**:
  - View all submissions for each quiz
  - See scores and submission status
  - Identify cheating attempts with reasons
  - Track grading status
- **Manual Grading**:
  - Grade short answer questions one by one
  - Assign marks for each answer
  - Add admin notes/feedback
  - Mark grading as complete
- **Export Results**:
  - Download quiz results as CSV
  - Includes scores, percentages, and cheating detection info

## Technical Stack

- **Frontend**: React 19, Next.js 16, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT + admin email/password
- **Security**: Row Level Security (RLS), bcrypt password hashing

## Setup Instructions

### 1. Database Initialization

The database schema will be created automatically when the app runs. The system creates the following tables:

- `admins` - Admin user accounts
- `quizzes` - Quiz metadata
- `quiz_questions` - Individual questions
- `mcq_options` - Multiple choice options
- `quiz_submissions` - Student submission records
- `student_responses` - Individual student answers

Row Level Security policies are configured to protect data access.

### 2. Environment Variables

Required environment variables (already set if using Supabase integration):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret_key
```

### 3. First Time Setup

1. Start the development server:
   ```bash
   pnpm install
   pnpm dev
   ```

2. Visit `/admin/login` to create your first admin account

3. Login and create your first quiz at `/admin/dashboard`

## Usage Guide

### For Admins

1. **Login**: Visit `/admin/login` and create/signin with your credentials
2. **Create Quiz**:
   - Click "Create New Quiz"
   - Add quiz title, description, and duration
   - Add questions (MCQ or short answer)
   - For MCQ: Add options and mark correct answer(s)
   - Save quiz
3. **View Results**:
   - From dashboard, click "Results" on any quiz
   - See all student submissions
   - Export as CSV for further analysis
4. **Grade Submissions**:
   - From results page, click "Grade" on pending submissions
   - Review short answer responses
   - Assign marks and add notes
   - Complete grading when done

### For Students

1. **Access Quiz**: Visit `/student`
2. **Enter Roll Number**: Enter your unique roll number
3. **Select Quiz**: Choose from available quizzes
4. **Take Quiz**:
   - Full screen mode starts automatically
   - Do not switch tabs or exit fullscreen (= 0 marks)
   - Answer MCQs and short questions
   - Click next/previous to navigate
   - Submit when complete
5. **Result**: Results visible in admin dashboard (after grading for short answers)

## Anti-Cheating System

### Detection Methods

The system monitors for:
- **Tab Switching**: Uses `visibilitychange` event
- **Window Unfocus**: Uses `blur` event
- **Fullscreen Exit**: Uses `fullscreenchange` event
- **Suspicious Keys**: F11, F12, Escape, Ctrl+C/V/S
- **Screenshot/Screen Recording Keys**: Blocked

### Consequences

When cheating is detected:
- Quiz immediately marked as 0
- Submission automatically submitted
- Reason recorded in database
- Admin can view cheating details in results

## Database Schema

### quiz_submissions
- Auto-locked after first student submission
- Tracks cheating detection
- Stores calculated scores
- Prevents duplicate submissions per roll number + quiz

### student_responses
- Stores answers for each question
- MCQ: Selected option ID
- Short Answer: Text response
- Manual grading fields (marks, admin notes)

## API Endpoints

### Admin Authentication
- `POST /api/admin/register` - Create admin account
- `POST /api/admin/login` - Admin login

### Database Setup
- `POST /api/init-db` - Initialize database (run on first startup)

## Security Features

1. **RLS Policies**: Data access controlled at database level
2. **Password Hashing**: bcrypt with salt rounds
3. **JWT Tokens**: Stateless authentication
4. **Admin Verification**: Quiz editing only by quiz creator
5. **Unique Constraint**: One submission per roll number per quiz
6. **Service Role Key**: Used only for sensitive operations

## Troubleshooting

### Quiz appears locked
- Quiz locks after first student submission (by design)
- Can view results but not edit

### Student can't start quiz
- Check if roll number already submitted this quiz
- Quiz must not be locked for editing

### Fullscreen not working
- Some browsers require user interaction first
- Ensure full screen permission is granted

### Grades not saving
- Check that all short answer questions have marks assigned
- Verify admin is logged in with valid token

## Future Enhancements

- Timed quizzes with countdown timer
- Partial marking for MCQs
- Question randomization/shuffling
- Answer masking during grading
- Batch operations (lock/unlock multiple quizzes)
- Analytics and reporting dashboard
- Email notifications for students
- Integration with learning management systems
