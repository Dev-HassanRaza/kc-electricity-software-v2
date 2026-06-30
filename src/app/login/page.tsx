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
            radial-gradient(ellipse 80% 60% at 30% 40%, #87ceeb 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 70% 30%, #b0e0f8 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1e7fd4 0%, #0a5ba8 60%, #063d7a 100%);
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        }
        .login-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.12) 30%,transparent 55%);
          pointer-events: none;
        }
        .login-window {
          width: 340px;
          border: 2px solid #0a246a;
          box-shadow: 4px 4px 12px rgba(0,0,0,0.5);
          background: #d4d0c8;
          position: relative;
          z-index: 1;
        }
        .login-titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 22px;
          padding: 0 4px 0 6px;
          background: linear-gradient(to right, #0a246a 0%, #3a6ea5 50%, #0a246a 100%);
        }
        .login-titlebar__title {
          color: #fff;
          font-size: 11px;
          font-weight: bold;
        }
        .login-titlebar__controls {
          display: flex;
          gap: 2px;
        }
        .login-titlebar__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 14px;
          border: 1px solid rgba(255,255,255,0.4);
          border-radius: 2px;
          background: linear-gradient(to bottom, #4a7fc0, #2a5fa0);
          color: #fff;
          font-size: 9px;
          font-weight: bold;
          cursor: default;
        }
        .login-titlebar__btn--close {
          background: linear-gradient(to bottom, #e0302a, #b81f1a);
        }
        .login-body {
          padding: 20px 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          background: #d4d0c8;
        }
        .login-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .login-heading {
          font-size: 14px;
          font-weight: bold;
          color: #000;
          margin: 0 0 4px;
        }
        .login-subtitle {
          font-size: 11px;
          color: #444;
          margin: 0 0 16px;
          text-align: center;
        }
        .login-form {
          width: 100%;
        }
        .login-field {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;
        }
        .login-label {
          width: 74px;
          font-size: 11px;
          color: #000;
          text-align: right;
          flex-shrink: 0;
        }
        .login-input {
          flex: 1;
          height: 21px;
          border: 2px inset #808080;
          background: #fff;
          font-size: 11px;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          padding: 0 3px;
          outline: none;
          color: #000;
        }
        .login-input:focus {
          border-color: #316ac5;
        }
        .login-error {
          font-size: 11px;
          color: #c00;
          text-align: center;
          margin: 4px 0 8px;
        }
        .login-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
        }
        .login-btn {
          width: 75px;
          height: 23px;
          font-size: 11px;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          background: linear-gradient(to bottom, #f0f0ea, #d4d0c8);
          border: 1px solid #808080;
          box-shadow: 1px 1px 0 #fff inset, -1px -1px 0 #404040 inset;
          cursor: default;
          color: #000;
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #e8e4de, #c8c4bc);
        }
        .login-btn:active:not(:disabled) {
          box-shadow: 1px 1px 0 #404040 inset, -1px -1px 0 #fff inset;
        }
        .login-btn--primary {
          font-weight: bold;
          border-color: #000;
        }
        .login-btn:disabled {
          color: #808080;
          cursor: default;
        }
        .login-footer {
          font-size: 10px;
          color: #555;
          text-align: center;
          margin-top: 16px;
          border-top: 1px solid #808080;
          padding-top: 8px;
          width: 100%;
        }
      `}</style>
    </div>
  )
}
