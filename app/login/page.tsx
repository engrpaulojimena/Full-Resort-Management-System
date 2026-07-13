'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, XCircle, Loader2, AlertTriangle, Mail } from 'lucide-react';;
import { useAuth } from '@/components/providers/AuthProvider';

// useSearchParams() requires a Suspense boundary during prerender —
// split into inner component so the outer page can be a Suspense parent.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin/dashboard';
  const { user, loading: authLoading, refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirect);
    }
  }, [user, authLoading, redirect, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        await refresh();
        router.replace(redirect);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Sora, sans-serif' }}>
          Welcome back
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
          Sign in to your account to continue
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(160,82,60,0.09)',
          border: '1px solid rgba(160,82,60,0.22)',
          borderRadius: '10px',
          padding: '11px 14px',
          fontSize: '13px',
          color: 'var(--red)',
          marginBottom: '18px',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Email */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.01em' }}>
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@resort.com"
              className="input"
              style={{ paddingLeft: '36px', width: '100%', height: '42px', fontSize: '13.5px' }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.01em' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <AlertTriangle size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="input"
              style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%', height: '42px', fontSize: '13.5px' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
            >
              {showPw ? <XCircle size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ height: '42px', fontSize: '14px', fontWeight: 600, marginTop: '4px', width: '100%', justifyContent: 'center' }}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,74,62,0.13) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
      }}>
        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--ink)',
            padding: '32px 36px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          }}>
            <div style={{ position: 'relative', width: '52px', height: '52px' }}>
              <Image src="/icon.png" alt="Kekamiya" fill className="object-contain" sizes="52px" priority />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'white', fontFamily: 'Sora, sans-serif', letterSpacing: '-0.01em' }}>
                Kekamiya Beach Resort
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '3px', fontWeight: 600 }}>
                Staff Portal
              </div>
            </div>
          </div>

          {/* Form wrapped in Suspense — required by useSearchParams() */}
          <Suspense fallback={
            <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Kekamiya Beach Resort · Botolan, Zambales
        </div>
      </div>
    </div>
  );
}
