# System Flow Diagrams

Visual representations of how the Quiz Platform works.

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Quiz Platform                            │
└─────────────────────────────────────────────────────────────────┘
         │                          │                      │
         ▼                          ▼                      ▼
    ┌─────────┐            ┌──────────────┐        ┌─────────────┐
    │ Student │            │    Admin     │        │  Supabase   │
    │ Portal  │            │   Dashboard  │        │  PostgreSQL │
    └─────────┘            └──────────────┘        └─────────────┘
         │                          │                      ▲
         │                          │                      │
         ├──JWT Auth───────────────┬──────JWT Auth────────┤
         │                          │                      │
         ▼                          ▼                      │
    ┌─────────────┐         ┌─────────────────┐           │
    │ Quiz Taker  │         │ Quiz Builder    │           │
    │ Component   │         │ Component       │           │
    │             │         │                 │           │
    │ ✓ Fullscreen│         │ ✓ Create Q      │           │
    │ ✓ Anti-cheat│         │ ✓ Edit Answers  │           │
    │ ✓ Auto-save │         │ ✓ Lock control  │           │
    │ ✓ MCQ grade │         │ ✓ Marks manage  │           │
    └─────────────┘         └─────────────────┘           │
         │                          │                      │
         └──────────┬───────────────┘                      │
                    │                                      │
                    └──RLS Protected API calls─────────────┘
```

## Student Quiz Flow

```
START
  │
  ▼
┌─────────────────────────┐
│ Visit /student          │
│ (Student Portal)        │
└─────────────────────────┘
  │
  ▼
┌─────────────────────────┐
│ Enter Roll Number       │
│                         │
│ Validation:             │
│ ✓ Not empty             │
│ ✓ Check for existing    │
│   submission            │
└─────────────────────────┘
  │
  ├─ Already submitted?
  │  └──▶ SHOW ERROR
  │
  └─ OK
     │
     ▼
┌─────────────────────────┐
│ Fetch Available Quizzes │
│ (Unlocked & Open)       │
└─────────────────────────┘
  │
  ▼
┌─────────────────────────┐
│ Display Quiz List       │
│                         │
│ For each quiz:          │
│ ├─ Title                │
│ ├─ Description          │
│ ├─ Duration             │
│ └─ Start Button         │
└─────────────────────────┘
  │
  ▼
┌─────────────────────────┐
│ Click "Start Quiz"      │
│                         │
│ Actions:                │
│ 1. Create submission    │
│ 2. Enter fullscreen     │
│ 3. Load questions       │
└─────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ FULLSCREEN QUIZ MODE            │
│                                 │
│ Question Display:               │
│ ├─ Progress bar                 │
│ ├─ Current question             │
│ ├─ MCQ: Radio buttons            │
│ └─ Short: Text area              │
│                                 │
│ Events Monitored:               │
│ ├─ visibilitychange (tab)        │
│ ├─ blur (window focus)           │
│ ├─ fullscreenchange (exit)       │
│ ├─ keydown (banned keys)         │
│ └─ Copy/paste blocked            │
└─────────────────────────────────┘
  │
  ├─ Cheating Detected?
  │  │
  │  ▼
  │  ┌────────────────────────────────┐
  │  │ IMMEDIATE ACTION               │
  │  │                                │
  │  │ 1. Mark is_cheating = true     │
  │  │ 2. Auto-submit quiz            │
  │  │ 3. Set score = 0               │
  │  │ 4. Record violation reason     │
  │  │ 5. Show alert message          │
  │  │ 6. Redirect to results         │
  │  └────────────────────────────────┘
  │  │
  │  └─▶ SCORE = 0, END
  │
  └─ Every 5 seconds
     │
     ▼
┌─────────────────────────┐
│ AUTO-SAVE RESPONSE      │
│                         │
│ For each answer:        │
│ ├─ question_id          │
│ ├─ selected_option_id   │
│ │  (MCQ)                │
│ └─ short_answer_text    │
│    (Short Answer)       │
└─────────────────────────┘
  │
  └─ Next Question?
     │
     ├─ YES: Go to next question
     │
     └─ NO: Final Question?
        │
        ├─ NO: Previous Question
        │
        └─ YES: Show "Submit" button
           │
           ▼
        ┌──────────────┐
        │ Click Submit │
        └──────────────┘
           │
           ▼
        ┌─────────────────────────────┐
        │ AUTO-GRADE MCQs             │
        │                             │
        │ For each MCQ question:      │
        │ ├─ Check selected option    │
        │ ├─ Compare with is_correct  │
        │ ├─ If correct: +marks       │
        │ └─ If wrong: +0             │
        │                             │
        │ Calculate total score       │
        └─────────────────────────────┘
           │
           ▼
        ┌──────────────────────────────┐
        │ SAVE SUBMISSION              │
        │                              │
        │ Update quiz_submissions:     │
        │ ├─ submitted_at = NOW()      │
        │ ├─ total_score = calculated  │
        │ ├─ max_score = sum of marks  │
        │ └─ grading_completed = null  │
        │    (admin grades shorts)     │
        └──────────────────────────────┘
           │
           ▼
        ┌──────────────────────┐
        │ QUIZ COMPLETE        │
        │ Thank you message    │
        │ Show score (MCQs)    │
        │ Pending: Short Ans.  │
        └──────────────────────┘
           │
           ▼
        ┌──────────────────────┐
        │ Redirect to /student │
        │ (Portal Home)        │
        └──────────────────────┘
           │
           ▼
        ┌──────────────────────┐
        │ Cannot retake quiz   │
        │ Already submitted    │
        └──────────────────────┘
           │
           ▼
        END
```

## Admin Quiz Creation Flow

```
START
  │
  ▼
┌──────────────────────────┐
│ Admin Login              │
│                          │
│ Validation:              │
│ ✓ Email format           │
│ ✓ Password hash match    │
│ ✓ JWT token generated    │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ Admin Dashboard          │
│                          │
│ Display:                 │
│ ├─ My Quizzes List       │
│ ├─ Create New button     │
│ └─ For each quiz:        │
│    ├─ View Results       │
│    ├─ Edit (if unlock)   │
│    └─ Delete (if unlock) │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ Click "Create New Quiz"  │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────────┐
│ QUIZ BUILDER FORM            │
│                              │
│ Inputs:                      │
│ ├─ Title *                   │
│ ├─ Description               │
│ └─ Duration (minutes)        │
└──────────────────────────────┘
  │
  ▼
┌──────────────────────────────┐
│ ADD QUESTIONS                │
│                              │
│ Click "+ Add Question"       │
│ For each question:           │
│ ├─ Question text *           │
│ ├─ Type: MCQ/Short           │
│ ├─ Marks value               │
│ │                            │
│ ├─ If MCQ:                   │
│ │  ├─ + Add Option           │
│ │  ├─ Option text            │
│ │  ├─ [✓] Mark Correct       │
│ │  └─ (min 2 options)        │
│ │                            │
│ └─ If Short:                 │
│    └─ (No extra fields)      │
└──────────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ Click "Save Quiz"        │
│                          │
│ Validation:              │
│ ✓ Title not empty        │
│ ✓ At least 1 question    │
│ ✓ All MCQs have options  │
│ ✓ All options valid      │
└──────────────────────────┘
  │
  ├─ Validation Error?
  │  └──▶ SHOW ERROR, STAY
  │
  └─ OK
     │
     ▼
┌─────────────────────────────┐
│ INSERT INTO DATABASE        │
│                             │
│ 1. Create quiz row          │
│    admin_id: current admin  │
│    is_locked: false         │
│                             │
│ 2. For each question:       │
│    Create quiz_question row │
│                             │
│ 3. For each MCQ option:     │
│    Create mcq_option row    │
│                             │
│ 4. Create indexes           │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ SUCCESS                     │
│ "Quiz saved successfully!"  │
│                             │
│ Redirect to Dashboard       │
│ Quiz now visible            │
│ Students can take it        │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ FIRST STUDENT SUBMITS       │
│                             │
│ Automatic Action:           │
│ ├─ is_locked = TRUE         │
│ ├─ Cannot edit              │
│ ├─ Cannot delete            │
│ └─ Can view results only    │
└─────────────────────────────┘
     │
     ▼
END
```

## Admin Grading Flow

```
START
  │
  ▼
┌──────────────────────────┐
│ Results Dashboard        │
│ /admin/results/[quizId]  │
│                          │
│ Display:                 │
│ ├─ Quiz title            │
│ ├─ Total submissions     │
│ ├─ CSV Export button     │
│ │                        │
│ └─ Table:                │
│    ├─ Roll Number        │
│    ├─ Score              │
│    ├─ Status             │
│    │  ├─ Pending Review  │
│    │  ├─ Graded          │
│    │  └─ Cheating        │
│    └─ Grade button       │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ For pending submissions: │
│ Click "Grade"            │
│                          │
│ Redirect to:             │
│ /admin/grade/[subId]     │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ GRADING INTERFACE                │
│                                  │
│ Display:                         │
│ ├─ Question 1 of N              │
│ ├─ Progress bar                 │
│ │                               │
│ ├─ Current Question:            │
│ │  ├─ Question text              │
│ │  ├─ Student's answer           │
│ │  │  ├─ MCQ: Selected option    │
│ │  │  └─ Short: Text area        │
│ │  │                             │
│ │  └─ Input fields:              │
│ │     ├─ Marks obtained (0-max)  │
│ │     └─ Admin notes (optional)  │
│ │                               │
│ └─ Navigation:                  │
│    ├─ Previous (disabled at start)
│    ├─ Next (disabled at end)    │
│    └─ Complete Grading button   │
└──────────────────────────────────┘
  │
  ├─ MCQ Question?
  │  └─ Auto-graded
  │     Set marks = full or 0
  │     Cannot change
  │
  └─ Short Answer?
     │
     ▼
┌──────────────────────────┐
│ Review Answer            │
│ Assign Marks             │
│ Add Feedback Notes       │
│                          │
│ Input: marks_obtained    │
│ Range: 0 to question.mark
│                          │
│ Click Next to advance    │
└──────────────────────────┘
  │
  ├─ More questions?
  │  └──▶ Go to next
  │
  └─ All graded?
     │
     ▼
┌──────────────────────────┐
│ Click "Complete Grading" │
│                          │
│ Actions:                 │
│ 1. Update all responses  │
│    with marks_obtained   │
│                          │
│ 2. Calculate total_score │
│    sum(marks_obtained)   │
│                          │
│ 3. Update submission:    │
│    total_score = calc    │
│    max_score = sum marks │
│    grading_completed=YES │
│                          │
│ 4. Show success message  │
│                          │
│ 5. Redirect to Results   │
└──────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ Back to Results          │
│ Submission now shows:    │
│ ├─ Status: Graded        │
│ ├─ Full score            │
│ ├─ Percentage            │
│ └─ View link (review)    │
└──────────────────────────┘
  │
  ▼
END
```

## Anti-Cheating Detection Flow

```
QUIZ ACTIVE
  │
  ├─ Event: visibilitychange
  │  └─ document.hidden = true
  │     │
  │     ▼
  │     ┌────────────────────────────┐
  │     │ CHEATING DETECTED          │
  │     │ Reason: "Tab switch"       │
  │     └────────────────────────────┘
  │
  ├─ Event: blur
  │  └─ Window lost focus
  │     │
  │     ▼
  │     ┌────────────────────────────┐
  │     │ CHEATING DETECTED          │
  │     │ Reason: "Window blur"      │
  │     └────────────────────────────┘
  │
  ├─ Event: fullscreenchange
  │  └─ !document.fullscreenElement
  │     │
  │     ▼
  │     ┌────────────────────────────┐
  │     │ CHEATING DETECTED          │
  │     │ Reason: "Exited fullscreen"│
  │     └────────────────────────────┘
  │
  └─ Event: keydown
     └─ Key in [F11, F12, Esc, Ctrl+C, Ctrl+V, Ctrl+S]
        │
        ▼
        ┌────────────────────────────┐
        │ CHEATING DETECTED          │
        │ Reason: "Banned key pressed│
        └────────────────────────────┘
        │
        ▼
        ALL PATHS CONVERGE:
        │
        ▼
     ┌────────────────────────────────────┐
     │ IMMEDIATE ACTIONS                  │
     │                                    │
     │ 1. Set warningShownRef = true      │
     │    (Prevent duplicate detection)   │
     │                                    │
     │ 2. Update submission:              │
     │    ├─ is_cheating_detected = true  │
     │    ├─ cheating_reason = [reason]   │
     │    ├─ submitted_at = NOW()         │
     │    └─ total_score = 0              │
     │                                    │
     │ 3. Exit fullscreen                 │
     │                                    │
     │ 4. Show alert:                     │
     │    "Cheating detected: [reason]"   │
     │    "Your quiz marked as zero"      │
     │                                    │
     │ 5. Redirect to /student            │
     │                                    │
     │ 6. Database records:               │
     │    Quiz submission has cheating    │
     │    Admin can see reason            │
     │    Cannot appeal/retake            │
     └────────────────────────────────────┘
        │
        ▼
     RESULT: SCORE = 0
             CANNOT RETAKE
             CHEATING LOGGED
```

## Data Flow: Quiz Submission

```
┌─────────────────┐
│ Student Submit  │
└─────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ For each question:               │
│                                  │
│ IF Question Type = MCQ:          │
│ │                                │
│ ├─ Fetch correct answer          │
│ ├─ Compare with student selection│
│ ├─ is_correct = true/false       │
│ └─ marks_obtained = full or 0    │
│                                  │
│ ELSE (Short Answer):             │
│ │                                │
│ └─ Save response as-is           │
│    (Admin reviews later)         │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Calculate Submission Score       │
│                                  │
│ total_score = sum(               │
│   marks_obtained for each Q      │
│ )                                │
│                                  │
│ max_score = sum(                 │
│   marks for each question        │
│ )                                │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Database Updates                 │
│                                  │
│ quiz_submissions:                │
│ ├─ submitted_at = NOW()          │
│ ├─ total_score = calculated      │
│ ├─ max_score = calculated        │
│ └─ is_cheating_detected = false  │
│                                  │
│ student_responses (for each Q):  │
│ ├─ is_correct = (MCQ only)       │
│ ├─ marks_obtained = (MCQ only)   │
│ └─ admin_notes = null            │
│    (Short answers pending)       │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Quiz Automatically Locked        │
│                                  │
│ quizzes.is_locked = true         │
│ (First student submits)          │
│                                  │
│ Prevents:                        │
│ ├─ Admin editing questions       │
│ ├─ Changing answer keys          │
│ └─ Deleting the quiz             │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Admin Reviews Results            │
│                                  │
│ See:                             │
│ ├─ All MCQ scores (final)        │
│ ├─ Short answer responses        │
│ ├─ Student answers               │
│ └─ Pending grading count         │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Admin Grades Short Answers       │
│                                  │
│ For each short answer:           │
│ ├─ Assign marks_obtained         │
│ ├─ Add admin_notes (optional)    │
│ └─ Save to database              │
│                                  │
│ Final totals calculated          │
│ grading_completed = true         │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Final Results Visible            │
│                                  │
│ Student can see:                 │
│ ├─ MCQ results immediately       │
│ └─ All results after grading     │
│                                  │
│ Admin can:                       │
│ ├─ Export all results as CSV     │
│ ├─ See grading history           │
│ └─ View feedback notes           │
└──────────────────────────────────┘
```

## RLS & Security Flow

```
┌─────────────────┐
│ Request Comes   │
└─────────────────┘
         │
         ▼
┌───────────────────────────────────┐
│ Supabase RLS Evaluation           │
│                                   │
│ For quizzes table:                │
│ ├─ SELECT: !is_locked (students) │
│ ├─ INSERT: auth.uid() = admin_id │
│ └─ UPDATE: auth.uid() = admin_id │
│                                   │
│ For quiz_submissions table:       │
│ ├─ SELECT: Any auth user         │
│ ├─ INSERT: Any auth user         │
│ └─ UPDATE: Restricted fields     │
│                                   │
│ For student_responses table:      │
│ ├─ SELECT: Own submission only   │
│ ├─ INSERT: Any auth user         │
│ └─ UPDATE: Admin role only       │
└───────────────────────────────────┘
         │
         ├─ Policy Allows?
         │  └──▶ Proceed
         │
         └─ Policy Denies?
            └──▶ Return Empty/Error
```

---

These flows show how every part of the system works together to create a secure, functional quiz platform.
