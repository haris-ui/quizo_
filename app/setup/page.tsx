'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleInitializeDatabase = async () => {
    setLoading(true);
    setStatus('loading');
    setMessage('Initializing database...');

    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('✓ Database initialized successfully! You can now start using the platform.');
      } else {
        setStatus('error');
        setMessage(`Error: ${data.message || 'Failed to initialize database'}`);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error: ${error.message || 'An error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-lg border p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Quiz Platform</h1>
          <p className="text-muted-foreground">First-time setup</p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-lg mb-4">Setup Checklist</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold mt-1">✓</span>
                <span>Supabase project created and connected</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold mt-1">→</span>
                <span>Database tables initialized</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold mt-1">3</span>
                <span>Create admin account and start building quizzes</span>
              </li>
            </ul>
          </div>

          {status !== 'idle' && (
            <div
              className={`p-4 rounded-lg ${
                status === 'success'
                  ? 'bg-green-500/20 text-green-700 border border-green-500/30'
                  : status === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/30'
                  : 'bg-blue-500/20 text-blue-700 border border-blue-500/30'
              }`}
            >
              {message}
            </div>
          )}

          <button
            onClick={handleInitializeDatabase}
            disabled={loading || status === 'success'}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              status === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50'
            }`}
          >
            {loading
              ? 'Initializing...'
              : status === 'success'
              ? 'Database Ready!'
              : 'Initialize Database'}
          </button>

          {status === 'success' && (
            <div className="space-y-3">
              <Link
                href="/admin/login"
                className="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium text-center"
              >
                Go to Admin Login
              </Link>
              <Link
                href="/student"
                className="block w-full px-6 py-3 border rounded-lg hover:bg-secondary font-medium text-center"
              >
                Go to Student Portal
              </Link>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={handleInitializeDatabase}
              disabled={loading}
              className="w-full px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 font-medium"
            >
              Try Again
            </button>
          )}

          {status === 'idle' && (
            <div className="text-sm text-muted-foreground">
              <p className="mb-3">Click the button above to initialize your database with the required schema.</p>
              <p>After initialization, you can create your admin account and start building quizzes!</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>For help, see the <Link href="/README_QUIZ.md" className="text-primary hover:underline">
            documentation
          </Link></p>
        </div>
      </div>
    </main>
  );
}
