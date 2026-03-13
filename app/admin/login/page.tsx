'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token in localStorage
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminId', data.adminId);

      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('[v0] Auth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-mono uppercase selection:bg-foreground selection:text-background">
      <div className="w-full max-w-md bg-card border-4 border-foreground p-10">
        <div className="text-center mb-10 border-b-4 border-foreground pb-6">
          <h1 className="text-4xl font-black tracking-tighter uppercase">ADMIN ACCESS</h1>
          <p className="text-xs mt-2 text-muted-foreground tracking-widest">
            AUTHENTICATION REQUIRED
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="email" className="block text-xs font-black mb-2 tracking-widest">
              TERMINAL EMAIL
            </label>
            <input
              id="email"
              type="email"
              placeholder="ADMIN@QUIZO.SYSTEM"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors uppercase"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-black mb-2 tracking-widest">
              SECURITY KEY
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 border-2 border-foreground bg-background focus:outline-none focus:bg-secondary transition-colors"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-4 border-2 border-foreground bg-foreground text-background font-black text-xs">
              ERROR: {error.toUpperCase()}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background py-4 font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'PROCESSING...' : 'UN LOCK TERMINAL &gt;'}
          </button>
        </form>
      </div>
    </main>
  );
}
