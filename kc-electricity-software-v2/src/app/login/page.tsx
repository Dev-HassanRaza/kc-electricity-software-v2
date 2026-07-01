'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid username or password.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="login-bg">
      <div className="login-window">
        {/* Window title bar */}
        <div className="login-titlebar">
          <span className="login-titlebar__title">Kareem Centre — Login</span>
        </div>

        {/* Dialog content */}
        <div className="login-body">
          <div className="login-icon" aria-hidden="true">🔒</div>
          <h1 className="login-heading">Kareem Centre</h1>
          <p className="login-subtitle">Please enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="login-username" className="login-label">Username:</label>
              <input
                id="login-username"
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">Password:</label>
              <input
                id="login-password"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <div className="login-actions">
              <button
                id="login-submit"
                type="submit"
                className="login-btn login-btn--primary"
                disabled={loading}
              >
                {loading ? 'Logging in…' : 'OK'}
              </button>
              <button
                id="login-cancel"
                type="button"
                className="login-btn"
                disabled={loading}
                onClick={() => { setUsername(''); setPassword(''); setError('') }}
              >
                Cancel
              </button>
            </div>
          </form>

          <p className="login-footer">POWERED BY: PANJA GROUP (0333-3212904)</p>
        </div>
      </div>

      <style>{`
        .login-bg {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: 
            radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 90% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.1) 0%, transparent 70%),
            #f1f5f9;
          font-family: 'Outfit', sans-serif;
        }
        .login-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 55%);
          pointer-events: none;
        }
        .login-window {
          width: 360px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 20px 25px -5px rgba(100, 116, 139, 0.1), 0 10px 10px -5px rgba(100, 116, 139, 0.04);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          border-radius: 24px;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        .login-titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 38px;
          padding: 0 16px;
          background: rgba(248, 250, 252, 0.5);
          border-b: 1px solid rgba(226, 232, 240, 0.5);
        }
        .login-titlebar__title {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .login-titlebar__controls {
          display: none;
        }
        .login-body {
          padding: 24px 28px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          background: transparent;
        }
        .login-icon {
          font-size: 36px;
          margin-bottom: 12px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
        }
        .login-heading {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 24px;
          text-align: center;
          font-weight: 500;
        }
        .login-form {
          width: 100%;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 14px;
          gap: 6px;
        }
        .login-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          text-align: left;
          flex-shrink: 0;
        }
        .login-input {
          width: 100%;
          height: 38px;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px;
          font-size: 13px;
          padding: 0 14px;
          outline: none;
          color: #0f172a;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .login-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .login-error {
          font-size: 11px;
          color: #ef4444;
          text-align: center;
          margin: 6px 0 10px;
          font-weight: 600;
          background: #fef2f2;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #fee2e2;
          width: 100%;
        }
        .login-actions {
          display: flex;
          justify-content: stretch;
          gap: 10px;
          margin-top: 20px;
          width: 100%;
        }
        .login-btn {
          flex: 1;
          height: 38px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          color: #475569;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-btn:hover:not(:disabled) {
          background: #e2e8f0;
          color: #0f172a;
        }
        .login-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .login-btn--primary {
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
          color: #fff;
          border: none;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
        }
        .login-btn--primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #4338ca 100%);
          color: #fff;
          box-shadow: 0 6px 12px -1px rgba(59, 130, 246, 0.3);
        }
        .login-btn:disabled {
          color: #94a3b8;
          background: #f1f5f9;
          border-color: #e2e8f0;
          cursor: not-allowed;
          box-shadow: none;
        }
        .login-footer {
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          text-align: center;
          margin-top: 24px;
          border-top: 1px solid rgba(226, 232, 240, 0.5);
          padding-top: 12px;
          width: 100%;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  )
}
