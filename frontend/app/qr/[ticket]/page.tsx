'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function QRLandingPage() {
  const params = useParams()
  const router = useRouter()
  const ticket = params?.ticket as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ticket) {
      setError('Invalid QR code - no ticket number found')
      setLoading(false)
      return
    }

    // Call the dual-behavior endpoint to determine flow
    fetch(`https://api.bnievent.rfidpro.in/api/scan-qr/${ticket}/`)
      .then(response => response.json())
      .then(data => {
        if (data.flow === 'feedback') {
          // Public member - redirect to feedback form
          router.push(`/feedback?ticket=${ticket}`)
        } else if (data.flow === 'attendance') {
          // Volunteer/admin - show message (they should use scanner app)
          setError('This QR code is for attendance tracking. Please use the scanner app at bnichettinad.cloud/scanner')
          setLoading(false)
        } else if (data.error) {
          setError(data.error)
          setLoading(false)
        } else {
          setError('Unknown response from server')
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('QR scan error:', err)
        setError('Error connecting to server. Please try again.')
        setLoading(false)
      })
  }, [ticket, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '20px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '48px 32px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'spin 1s linear infinite',
          }}>
            🔄
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: '0 0 12px 0',
            color: '#1a1a1a',
            letterSpacing: '-0.5px',
          }}>
            Loading...
          </h1>
          <p style={{
            fontSize: '0.9375rem',
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.5',
          }}>
            Verifying ticket {ticket}
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '20px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '48px 32px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>❌</div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            margin: '0 0 16px 0',
            color: '#dc3545',
            letterSpacing: '-0.5px',
          }}>
            QR Scan Error
          </h1>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <p style={{
              fontSize: '1rem',
              color: '#991b1b',
              margin: 0,
              lineHeight: '1.6',
              fontWeight: '500',
            }}>
              {error}
            </p>
          </div>

          {ticket && (
            <div style={{
              background: '#f3f4f6',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontSize: '0.8125rem',
                color: '#6b7280',
                margin: '0 0 4px 0',
                fontWeight: '600',
              }}>
                Ticket Number:
              </p>
              <p style={{
                fontSize: '1.125rem',
                color: '#1a1a1a',
                margin: 0,
                fontFamily: 'monospace',
                fontWeight: '700',
              }}>
                {ticket}
              </p>
            </div>
          )}

          <button
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              maxWidth: '280px',
              padding: '16px 32px',
              backgroundColor: '#667eea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#5568d3'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#667eea'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  return null
}
