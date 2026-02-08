'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ticketNo, setTicketNo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')

  useEffect(() => {
    // Get ticket number and payment status from URL params
    const ticket = searchParams.get('ticket_no')
    const status = searchParams.get('status')

    if (ticket && status) {
      setTicketNo(ticket)
      setPaymentStatus(status)
    } else {
      // Redirect to home if no data
      router.replace('/')
    }
  }, [searchParams, router])

  const handleBackToHome = () => {
    router.push('/')
  }

  const handleWhatsAppShare = () => {
    const message = `*BNI CHETTINAD Event Registration*\n\n` +
      `Your registration is confirmed!\n\n` +
      `*Ticket Number:* ${ticketNo}\n` +
      `*Payment Status:* ${paymentStatus}\n\n` +
      `*Venue:*\n` +
      `L.C.T.L Palaniappa Chettiar Memorial Auditorium\n` +
      `Alagappapuram, Karaikudi\n\n` +
      `*Date:* 21 February 2026, Saturday\n` +
      `*Time:* 3:30 PM\n\n` +
      `Please save this ticket for entry.\n\n` +
      `Thank you for registering!`

    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  if (!ticketNo) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header Bar */}
      <div style={{
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '15px 0',
        marginBottom: '40px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          <img
            src="/ez.gif"
            alt="BNI Event"
            style={{
              height: '60px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            margin: 0,
            fontFamily: "'Inter', sans-serif",
          }}>
            <span style={{ color: '#ff0000' }}>BNI</span>{' '}
            <span style={{ color: '#000000' }}>CHETTINAD</span>
          </h1>
        </div>
      </div>

      {/* Success Content */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '0 20px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '40px',
          border: '1px solid #e0e0e0',
          textAlign: 'center',
        }}>
          {/* Success Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 30px',
            background: paymentStatus === 'PENDING' ? '#ffc107' : '#28a745',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#28a745',
            marginBottom: '20px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Registration Successful!
          </h1>

          <div style={{
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px',
          }}>
            <p style={{
              fontSize: '1rem',
              color: '#666',
              marginBottom: '15px',
              fontFamily: "'Inter', sans-serif",
            }}>
              Your ticket number is:
            </p>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ff6600',
              margin: '0 0 20px 0',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '2px',
            }}>
              {ticketNo}
            </p>

            <div style={{
              padding: '15px',
              background: paymentStatus === 'PENDING' ? '#fff3cd' : '#d4edda',
              border: `1px solid ${paymentStatus === 'PENDING' ? '#ffc107' : '#28a745'}`,
              borderRadius: '6px',
              marginBottom: '15px',
            }}>
              <p style={{
                fontSize: '0.95rem',
                color: '#333',
                margin: 0,
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
              }}>
                Payment Status: <span style={{
                  color: paymentStatus === 'PENDING' ? '#856404' : '#155724',
                  fontWeight: '700',
                }}>{paymentStatus}</span>
              </p>
            </div>

            {paymentStatus === 'PENDING' && (
              <p style={{
                fontSize: '0.9rem',
                color: '#856404',
                margin: '10px 0 0 0',
                fontFamily: "'Inter', sans-serif",
                fontStyle: 'italic',
              }}>
                You can complete payment later at the event or contact the organizer.
              </p>
            )}
          </div>

          {/* Event Details */}
          <div style={{
            marginBottom: '25px',
            padding: '20px',
            background: 'linear-gradient(135deg, #fff5f0 0%, #ffe8dc 100%)',
            borderRadius: '8px',
            border: '2px solid #ff6600',
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#ff6600',
              marginBottom: '15px',
              fontFamily: "'Inter', sans-serif",
              textAlign: 'center',
            }}>
              Event Details
            </h3>
            <div style={{
              fontSize: '0.95rem',
              color: '#333',
              lineHeight: '1.8',
              fontFamily: "'Inter', sans-serif",
            }}>
              <p style={{ marginBottom: '10px', fontWeight: '600' }}>
                <strong>📍 Venue:</strong>
              </p>
              <p style={{ marginLeft: '20px', marginBottom: '15px' }}>
                L.C.T.L Palaniappa Chettiar Memorial Auditorium<br />
                Alagappapuram, Karaikudi
              </p>

              <p style={{ marginBottom: '5px' }}>
                <strong>📅 Date:</strong> 21 February 2026, Saturday
              </p>
              <p style={{ margin: 0 }}>
                <strong>⏰ Time:</strong> 3:30 PM
              </p>
            </div>
          </div>

          <div style={{
            marginBottom: '20px',
            textAlign: 'left',
          }}>
            <p style={{
              fontSize: '0.95rem',
              color: '#666',
              marginBottom: '10px',
              fontFamily: "'Inter', sans-serif",
            }}>
              <strong>Important:</strong>
            </p>
            <ul style={{
              fontSize: '0.9rem',
              color: '#666',
              lineHeight: '1.8',
              paddingLeft: '20px',
              fontFamily: "'Inter', sans-serif",
            }}>
              <li>Please save your ticket number for reference</li>
              <li>A confirmation has been sent to your registered email</li>
              <li>Bring a valid ID to the event</li>
              {paymentStatus === 'PENDING' && (
                <li>Complete your payment to confirm your seat</li>
              )}
            </ul>
          </div>

          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={handleWhatsAppShare}
              style={{
                padding: '14px 28px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1da851'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              Share on WhatsApp
            </button>

            <button
              onClick={handleBackToHome}
              style={{
                padding: '14px 32px',
                backgroundColor: '#ff6600',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e55a00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0',
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '15px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Need Help?
          </h3>
          <p style={{
            fontSize: '0.9rem',
            color: '#666',
            margin: '0 0 10px 0',
            fontFamily: "'Inter', sans-serif",
          }}>
            If you have any questions, please contact us:
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <a href="/contact" style={{
              color: '#ff6600',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontFamily: "'Inter', sans-serif",
              fontWeight: '500',
            }}>
              Contact Support
            </a>
            <a href="/terms" style={{
              color: '#ff6600',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontFamily: "'Inter', sans-serif",
              fontWeight: '500',
            }}>
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          h1 {
            font-size: 1.5rem !important;
          }
        }

        @media (max-width: 480px) {
          div[style*="padding: 40px"] {
            padding: 25px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function RegistrationSuccess() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          textAlign: 'center',
          color: '#ff6600',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #ff6600',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }}></div>
          <p>Loading...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
