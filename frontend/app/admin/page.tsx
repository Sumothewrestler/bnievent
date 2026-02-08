'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (response.ok) {
        const data = await response.json()
        // Store token in localStorage
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        // Redirect to dashboard using replace for faster navigation
        router.replace('/admin/dashboard')
      } else {
        setError('Invalid username or password')
      }
    } catch (error) {
      setError('Error connecting to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header Bar with Logo */}
      <div className="header-bar">
        <div className="header-content">
          <a href="/" className="header-logo-link">
            <img
              src="/ez.gif"
              alt="BNI Event"
              className="header-logo"
            />
          </a>
          <h1 className="header-title">
            <span className="bni-text">BNI</span> <span className="chettinad-text">CHETTINAD</span>
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '450px', margin: '0 auto', padding: '20px', paddingTop: '120px', position: 'relative', zIndex: 1 }}>
        <div className="login-form">
          <h2 className="form-title">Admin Login</h2>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c33',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '25px',
          }}>
            <a href="/" style={{
              color: '#ff6600',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              ← Back to Registration
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .header-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 100;
          padding: 15px 0;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-logo-link {
          display: block;
          cursor: pointer;
          text-decoration: none;
        }

        .header-logo {
          height: 60px;
          width: auto;
          object-fit: contain;
          transition: opacity 0.2s ease;
        }

        .header-logo:hover {
          opacity: 0.8;
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          font-family: 'Inter', sans-serif;
        }

        .bni-text {
          color: #ff0000;
        }

        .chettinad-text {
          color: #000000;
        }

        .login-form {
          background: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e0e0e0;
        }

        .form-field {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #333333;
          font-weight: 500;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          background: #ffffff;
        }

        .form-input:focus {
          outline: none;
          border-color: #ff6600;
          box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
        }

        .form-title {
          text-align: center;
          margin: 0 0 30px 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #ff6600;
          font-family: 'Inter', sans-serif;
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #ff6600;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.1s ease;
          margin-top: 10px;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #e55a00;
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .submit-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .header-logo {
            height: 50px;
          }

          .header-title {
            font-size: 1.5rem;
          }

          .login-form {
            padding: 30px 25px;
          }

          .form-title {
            font-size: 1.5rem;
          }

          .form-input {
            padding: 13px 14px;
            font-size: 16px;
          }

          .submit-button {
            padding: 15px;
            font-size: 15px;
          }
        }

        @media (max-width: 480px) {
          .header-logo {
            height: 45px;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .login-form {
            padding: 25px 20px;
          }

          .form-title {
            font-size: 1.25rem;
          }

          .form-field {
            margin-bottom: 20px;
          }

          .form-input {
            padding: 13px 14px;
            font-size: 16px;
          }

          .submit-button {
            padding: 14px;
          }
        }
      `}</style>
    </div>
  )
}
