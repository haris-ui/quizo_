import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Quiz Platform</h1>
            <p className="text-muted-foreground text-sm mt-1">Secure exam management system</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/student"
              className="px-6 py-2 rounded-lg hover:bg-secondary border transition text-primary hover:text-primary-foreground"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6 text-balance">
            Secure Quiz Management for Educational Excellence
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive platform designed to administer quizzes with strict anti-cheating detection,
            automated MCQ grading, and flexible admin controls.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/student"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
            >
              Start Quiz
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-card rounded-lg border p-6 hover:shadow-md transition">
            <div className="text-3xl mb-4">🛡️</div>
            <h3 className="font-semibold text-lg mb-2">Anti-Cheating</h3>
            <p className="text-muted-foreground text-sm">
              Detects tab switching, window blur, fullscreen exit, and suspicious key presses. Automatic zero marking.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 hover:shadow-md transition">
            <div className="text-3xl mb-4">✅</div>
            <h3 className="font-semibold text-lg mb-2">Auto-Grading</h3>
            <p className="text-muted-foreground text-sm">
              MCQ questions are automatically graded. Short answers reviewed manually by admins with flexible marking.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 hover:shadow-md transition">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="font-semibold text-lg mb-2">Results Dashboard</h3>
            <p className="text-muted-foreground text-sm">
              Track all submissions, view detailed results, grade short answers, and export data as CSV.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 hover:shadow-md transition">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="font-semibold text-lg mb-2">Secure Access</h3>
            <p className="text-muted-foreground text-sm">
              Admin authentication, Row Level Security, bcrypt password hashing, and JWT tokens for protection.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 hover:shadow-md transition">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="font-semibold text-lg mb-2">Auto-Save</h3>
            <p className="text-muted-foreground text-sm">
              Student responses auto-save every 5 seconds. Never lose progress even if connection drops.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 hover:shadow-md transition">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="font-semibold text-lg mb-2">Flexible Questions</h3>
            <p className="text-muted-foreground text-sm">
              Support for MCQs and short answer questions with custom marks allocation and unlimited options.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-card rounded-lg border p-8 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>

          <div className="max-w-3xl mx-auto">
            {/* For Students */}
            <div>
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                How to Take a Quiz
              </h3>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-6">1.</span>
                  <span>Visit the student portal and enter your roll number</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-6">2.</span>
                  <span>Select an available quiz from the list</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-6">3.</span>
                  <span>Enter fullscreen mode and answer MCQs and short questions</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-6">4.</span>
                  <span>Submit your quiz - responses auto-save every 5 seconds</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-lg border p-8 hover:shadow-md transition text-center">
            <h3 className="text-2xl font-bold mb-3">Are you a Student?</h3>
            <p className="text-muted-foreground mb-6">
              Enter your roll number to view and take available quizzes.
            </p>
            <Link
              href="/student"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition"
            >
              Go to Student Portal →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          <p>Quiz Platform with Anti-Cheating Detection & Secure Grading</p>
          <p className="mt-2">
            For setup and usage guide, see{' '}
            <Link href="/README_QUIZ.md" className="text-primary hover:underline">
              the documentation
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
