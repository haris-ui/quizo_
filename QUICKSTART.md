# Quick Start Guide

Get your quiz platform running in 5 minutes!

## 1. Prerequisites

- Supabase account (free)
- v0 project with this code

## 2. Run Your App

```bash
pnpm install
pnpm dev
```

Your app is running at `http://localhost:3000`

## 3. Initialize Database

1. Visit `http://localhost:3000/setup`
2. Click "Initialize Database" button
3. Wait for success message

## 4. Create Admin Account

1. Go to `http://localhost:3000/admin/login`
2. Click "Create one" to sign up
3. Enter email and password
4. You're now logged in to admin dashboard

## 5. Create Your First Quiz

1. Click "Create New Quiz" button
2. Add quiz details:
   - Title: "Math Quiz"
   - Description: "Basic math questions"
   - Duration: 30 minutes
3. Add questions:
   - Click "+ Add Question"
   - Enter question text
   - Choose question type (MCQ or Short Answer)
   - For MCQ: add options and mark correct one
   - Click next question
4. Save quiz

## 6. Test as Student

1. Open new tab and go to `http://localhost:3000/student`
2. Enter any roll number (e.g., "2024001")
3. Click "Get Available Quizzes"
4. Click "Start Quiz"
5. Answer questions (fullscreen mode activates automatically)
6. Submit quiz

## 7. Grade Submission

1. Go back to admin tab
2. Go to Results for your quiz
3. Click "Grade" on the student's submission
4. Review answers and assign marks for short answers
5. Click "Complete Grading"

## 8. View Results

1. In Results page, you can:
   - See all student scores
   - Identify cheating attempts
   - Export results as CSV

## What Happens If Student Cheats?

Try this to test anti-cheating:
1. As student, start a quiz
2. Switch to another tab
3. Quiz automatically marks as 0 and submits
4. In admin results, you'll see "Tab switch detected"

## Common Tasks

### Edit Quiz
- Before ANY student takes it: Click "Edit" to modify
- After first student: Quiz is locked (can't edit)

### Delete Quiz
- Only before first student takes it
- After first submission: Can't delete

### Export Results
- In Results page, click "Export as CSV"
- Download file with all scores and details

### Manually Grade Short Answer
- After student submits
- In Results, click "Grade"
- Review answer and assign marks
- Add notes (optional)
- Click "Complete Grading"

## Key Features

### Security
- Only can take quiz once per roll number
- Auto-locks after first student starts
- Detects cheating attempts
- Secure password hashing

### Auto-Grading
- MCQs: Automatically graded
- Short Answers: Manual review by admin
- Progress auto-saves every 5 seconds

### Anti-Cheating
- Tab switching = 0 marks
- Window blur = 0 marks
- Fullscreen exit = 0 marks
- Copy/paste disabled = 0 marks

## Need Help?

- Check `README_QUIZ.md` for full documentation
- Check `DEPLOYMENT.md` for deployment help
- See browser console for errors (F12)
- Check Supabase dashboard for database status

## Next Steps

1. Create more quizzes with your content
2. Share student portal link with students
3. Monitor submissions and grade them
4. Export final results for records
5. For production: Deploy to Vercel (see DEPLOYMENT.md)

## Tips

- MCQ questions are auto-graded immediately
- Short answer questions need manual admin review
- Each student can only take each quiz once
- Quiz becomes locked after first student starts (prevents changes)
- Results can be exported as CSV anytime

Enjoy your quiz platform!
