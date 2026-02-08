'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Registration {
  id: number
  ticket_no: string
  name: string
  mobile_number: string
  email: string
  age: number | null
  location: string | null
  company_name: string | null
  registration_for: string | null
  payment_status: string
  payment_id: string | null
  order_id: string | null
  amount: string
  payment_date: string | null
  created_at: string
}

// QR Code generation function
const generateQRCode = async (text: string): Promise<string> => {
  // Using QR Server API for QR code generation
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [showScanner, setShowScanner] = useState(false)
  const [scannedTicket, setScannedTicket] = useState('')
  const [cameraMode, setCameraMode] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchRegistrations(token)
  }, [router])

  const fetchRegistrations = async (token: string) => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRegistrations(data)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        setError('Failed to fetch registrations')
      }
    } catch (error) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/admin')
  }

  useEffect(() => {
    if (cameraMode && showScanner) {
      // Small delay to ensure DOM element is ready
      const timer = setTimeout(() => {
        const element = document.getElementById('qr-reader')
        if (!element) {
          console.error('QR reader element not found')
          return
        }

        // Dynamically import Html5Qrcode
        import('html5-qrcode').then(({ Html5Qrcode }) => {
          const html5QrCode = new Html5Qrcode('qr-reader')
          scannerRef.current = html5QrCode

          html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              // QR code successfully scanned
              setScannedTicket(decodedText.toUpperCase())
              // Stop scanner
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                  scannerRef.current = null
                  setCameraMode(false)
                }).catch((err: any) => console.error('Error stopping scanner:', err))
              }
            },
            (errorMessage) => {
              // Parse error, ignore
            }
          ).then(() => {
            setScannerReady(true)
          }).catch((err) => {
            console.error('Error starting scanner:', err)
            alert('Unable to access camera. Please check permissions.')
            setCameraMode(false)
          })
        }).catch((err) => {
          console.error('Error loading scanner library:', err)
        })
      }, 100)

      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current = null
          }).catch((err: any) => {
            // Ignore errors on cleanup
            console.log('Scanner cleanup error (safe to ignore):', err)
          })
        }
      }
    }
  }, [cameraMode, showScanner])

  const handleScanTicket = async () => {
    if (scannedTicket) {
      const registration = registrations.find(r => r.ticket_no === scannedTicket.trim())
      const timestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium'
      })

      if (registration) {
        // Log the scan event to backend
        const token = localStorage.getItem('access_token')
        try {
          await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${registration.id}/log-scan/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticket_no: scannedTicket,
              scanned_at: timestamp,
              action: 'SCAN_SUCCESS'
            }),
          }).catch((err) => console.log('Log error:', err))
        } catch (error) {
          console.log('Logging error:', error)
        }

        // Scroll to the registration in the table
        const element = document.getElementById(`reg-${registration.id}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.style.backgroundColor = '#fff3cd'
          setTimeout(() => {
            element.style.backgroundColor = ''
          }, 3000)
        }

        alert(`✓ FOUND\n\nName: ${registration.name}\nMobile: ${registration.mobile_number}\nPayment: ${registration.payment_status}\nAmount: ₹${registration.amount}\n\nTime: ${timestamp}`)
      } else {
        // Log failed scan
        const token = localStorage.getItem('access_token')
        try {
          await fetch(`https://api.bnievent.rfidpro.in/api/scan-logs/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticket_no: scannedTicket,
              scanned_at: timestamp,
              action: 'SCAN_FAILED',
              reason: 'Ticket not found'
            }),
          }).catch((err) => console.log('Log error:', err))
        } catch (error) {
          console.log('Logging error:', error)
        }

        alert(`✗ TICKET NOT FOUND\n\nTicket: ${scannedTicket}\nTime: ${timestamp}`)
      }

      setScannedTicket('')
      setShowScanner(false)
      setCameraMode(false)
    }
  }

  const handleCloseScannerModal = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null
        setShowScanner(false)
        setScannedTicket('')
        setCameraMode(false)
        setScannerReady(false)
      }).catch((err: any) => {
        console.log('Close scanner error (safe to ignore):', err)
        scannerRef.current = null
        setShowScanner(false)
        setScannedTicket('')
        setCameraMode(false)
        setScannerReady(false)
      })
    } else {
      setShowScanner(false)
      setScannedTicket('')
      setCameraMode(false)
      setScannerReady(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this registration?')) {
      return
    }

    const token = localStorage.getItem('access_token')
    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setRegistrations(registrations.filter(r => r.id !== id))
      } else {
        alert('Failed to delete registration')
      }
    } catch (error) {
      alert('Error deleting registration')
    }
  }

  const handleWhatsAppShare = async (reg: Registration) => {
    const qrUrl = await generateQRCode(reg.ticket_no)
    const message = `*BNI CHETTINAD Event Registration*\n\n` +
      `Dear ${reg.name},\n\n` +
      `Your registration is confirmed!\n\n` +
      `*Ticket Number:* ${reg.ticket_no}\n` +
      `*Payment Status:* ${reg.payment_status}\n` +
      `*Amount:* ₹${reg.amount}\n\n` +
      `*QR Code:* ${qrUrl}\n\n` +
      `Please save this ticket for entry.\n\n` +
      `Thank you for registering!`

    const whatsappUrl = `https://web.whatsapp.com/send?phone=${reg.mobile_number}&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleEmailShare = async (reg: Registration) => {
    const qrUrl = await generateQRCode(reg.ticket_no)
    const subject = `BNI CHETTINAD Event - Your Ticket (${reg.ticket_no})`
    const body = `Dear ${reg.name},\n\n` +
      `Your registration for BNI CHETTINAD Event is confirmed!\n\n` +
      `Ticket Number: ${reg.ticket_no}\n` +
      `Payment Status: ${reg.payment_status}\n` +
      `Amount: ₹${reg.amount}\n\n` +
      `Your QR Code: ${qrUrl}\n\n` +
      `Please save this ticket for entry verification at the event.\n\n` +
      `Thank you for registering!\n\n` +
      `Best regards,\n` +
      `BNI CHETTINAD Team`

    const mailtoUrl = `mailto:${reg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { bg: '#28a745', text: 'white' }
      case 'PENDING':
        return { bg: '#ffc107', text: '#000' }
      case 'FAILED':
        return { bg: '#dc3545', text: 'white' }
      default:
        return { bg: '#6c757d', text: 'white' }
    }
  }

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.mobile_number.includes(searchTerm)

    const matchesPayment = paymentFilter === 'ALL' || reg.payment_status === paymentFilter

    return matchesSearch && matchesPayment
  })

  const exportToCSV = () => {
    const headers = ['Ticket No', 'Name', 'Mobile', 'Email', 'Age', 'Location', 'Company', 'Registration For', 'Payment Status', 'Amount', 'Payment ID', 'Order ID', 'Payment Date', 'Created At']
    const csvData = filteredRegistrations.map(reg => [
      reg.ticket_no,
      reg.name,
      reg.mobile_number,
      reg.email,
      reg.age || '',
      reg.location || '',
      reg.company_name || '',
      reg.registration_for || '',
      reg.payment_status,
      reg.amount,
      reg.payment_id || '',
      reg.order_id || '',
      reg.payment_date ? new Date(reg.payment_date).toLocaleString() : '',
      new Date(reg.created_at).toLocaleString()
    ])

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bni_registrations_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!isReady || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#ff6600',
          fontFamily: "'Inter', sans-serif",
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
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: '40px',
    }}>
      {/* Header Bar */}
      <div style={{
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '15px 0',
        marginBottom: '30px',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowScanner(!showScanner)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0066cc',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0052a3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0066cc'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="9" y2="9"></line>
                <line x1="15" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="9" y2="15"></line>
                <line x1="15" y1="15" x2="15" y2="15"></line>
              </svg>
              Scan QR
            </button>
            <button
              onClick={() => router.push('/admin/logs')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              View Logs
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff6600',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e55a00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={handleCloseScannerModal}
        >
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            border: '2px solid #ff6600',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              gap: '10px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="9" y2="9"></line>
                <line x1="15" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="9" y2="15"></line>
                <line x1="15" y1="15" x2="15" y2="15"></line>
              </svg>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0,
                color: '#333',
                fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ color: '#ff0000' }}>Scan</span>{' '}
                <span style={{ color: '#000000' }}>Ticket</span>
              </h3>
            </div>

            <p style={{
              fontSize: '0.875rem',
              color: '#666',
              marginBottom: '20px',
              textAlign: 'center',
              fontFamily: "'Inter', sans-serif",
              lineHeight: '1.4',
            }}>
              Use your camera to scan QR code or enter ticket number manually
            </p>

            {/* Camera Toggle Button */}
            <div style={{ marginBottom: '18px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  if (cameraMode && scannerRef.current) {
                    // Stop scanner before closing
                    scannerRef.current.stop().then(() => {
                      scannerRef.current = null
                      setCameraMode(false)
                    }).catch((err: any) => {
                      console.log('Error closing camera:', err)
                      scannerRef.current = null
                      setCameraMode(false)
                    })
                  } else {
                    setCameraMode(true)
                  }
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: cameraMode ? '#dc3545' : '#ff6600',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  transition: 'all 0.2s ease',
                  boxShadow: cameraMode ? '0 3px 10px rgba(220, 53, 69, 0.3)' : '0 3px 10px rgba(255, 102, 0, 0.3)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = cameraMode ? '0 5px 14px rgba(220, 53, 69, 0.4)' : '0 5px 14px rgba(255, 102, 0, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = cameraMode ? '0 3px 10px rgba(220, 53, 69, 0.3)' : '0 3px 10px rgba(255, 102, 0, 0.3)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                {cameraMode ? 'Close Camera' : 'Open Camera'}
              </button>
            </div>

            {/* QR Code Reader */}
            {cameraMode && (
              <div style={{
                marginBottom: '18px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid #ff6600',
                boxShadow: '0 3px 12px rgba(255, 102, 0, 0.2)',
              }}>
                <div id="qr-reader" style={{ width: '100%' }}></div>
              </div>
            )}

            {/* Manual Entry */}
            <div style={{
              background: '#ffffff',
              borderRadius: '10px',
              padding: '18px',
              marginBottom: '18px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#666',
                marginBottom: '10px',
                fontFamily: "'Inter', sans-serif",
              }}>
                Or enter manually:
              </label>
              <input
                type="text"
                placeholder="BNI12345678..."
                value={scannedTicket}
                onChange={(e) => setScannedTicket(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleScanTicket()}
                autoFocus={!cameraMode}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'center',
                  fontWeight: '600',
                  letterSpacing: '1.2px',
                  transition: 'border-color 0.2s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
            }}>
              <button
                onClick={handleScanTicket}
                disabled={!scannedTicket}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  backgroundColor: scannedTicket ? '#28a745' : '#e0e0e0',
                  color: scannedTicket ? '#ffffff' : '#999',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                  cursor: scannedTicket ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: scannedTicket ? '0 3px 10px rgba(40, 167, 69, 0.3)' : 'none',
                }}
                onMouseOver={(e) => {
                  if (scannedTicket) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 5px 14px rgba(40, 167, 69, 0.4)'
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  if (scannedTicket) {
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(40, 167, 69, 0.3)'
                  }
                }}
              >
                ✓ Search
              </button>
              <button
                onClick={handleCloseScannerModal}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  backgroundColor: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a6268'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6c757d'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                × Cancel
              </button>
            </div>
          </div>

          {/* Mobile Responsive CSS */}
          <style jsx>{`
            @media (max-width: 600px) {
              div[style*="maxWidth: 500px"] {
                padding: 20px !important;
                maxHeight: 90vh !important;
              }
              h3 {
                font-size: 1.3rem !important;
              }
              p {
                font-size: 0.8rem !important;
              }
              button {
                font-size: 13px !important;
                padding: 12px !important;
              }
              input {
                font-size: 14px !important;
                padding: 12px !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '20px',
          color: '#333',
          fontFamily: "'Inter', sans-serif",
        }}>
          Event Registrations
        </h2>

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

        {/* Search and Filter Controls */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search by name, ticket no, email or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              minWidth: '150px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Payments</option>
            <option value="SUCCESS">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={exportToCSV}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
          >
            Export to CSV
          </button>
        </div>

        {/* Statistics Dashboard */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}>
          {/* Total Registrations */}
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: '25px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: "'Inter', sans-serif",
            }}>
              Total Registrations
            </h3>
            <p style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#ff6600',
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}>
              {registrations.length}
            </p>
          </div>

          {/* Payment Status Breakdown */}
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: '25px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '15px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: "'Inter', sans-serif",
            }}>
              Payment Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '6px 14px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Paid
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#28a745',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {registrations.filter(r => r.payment_status === 'SUCCESS').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '6px 14px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Pending
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#ffc107',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {registrations.filter(r => r.payment_status === 'PENDING').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '6px 14px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Failed
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#dc3545',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {registrations.filter(r => r.payment_status === 'FAILED').length}
                </span>
              </div>
            </div>
          </div>

          {/* Total Amount Collected */}
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: '25px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: "'Inter', sans-serif",
            }}>
              Total Amount Paid
            </h3>
            <p style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#28a745',
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}>
              ₹{registrations
                .filter(r => r.payment_status === 'SUCCESS')
                .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                .toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '25px',
          marginBottom: '20px',
          border: '1px solid #e0e0e0',
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#333',
            marginBottom: '20px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Registration Categories
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
          }}>
            <div
              onClick={() => router.push('/admin/category?type=BNI_THALAIVAS')}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '4px solid #ff0000',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '500',
              }}>
                BNI Thalaivas
              </p>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#ff0000',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {registrations.filter(r => r.registration_for === 'BNI_THALAIVAS').length}
              </p>
            </div>

            <div
              onClick={() => router.push('/admin/category?type=BNI_CHETTINAD')}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '4px solid #ff6600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 102, 0, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '500',
              }}>
                BNI Chettinad
              </p>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#ff6600',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {registrations.filter(r => r.registration_for === 'BNI_CHETTINAD').length}
              </p>
            </div>

            <div
              onClick={() => router.push('/admin/category?type=BNI_MADURAI')}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '4px solid #0066cc',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '500',
              }}>
                BNI Madurai
              </p>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#0066cc',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {registrations.filter(r => r.registration_for === 'BNI_MADURAI').length}
              </p>
            </div>

            <div
              onClick={() => router.push('/admin/category?type=PUBLIC')}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '4px solid #6c757d',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '500',
              }}>
                Public
              </p>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#6c757d',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {registrations.filter(r => r.registration_for === 'PUBLIC').length}
              </p>
            </div>

            <div
              onClick={() => router.push('/admin/category?type=STUDENTS')}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '4px solid #17a2b8',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(23, 162, 184, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '500',
              }}>
                Students
              </p>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#17a2b8',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {registrations.filter(r => r.registration_for === 'STUDENTS').length}
              </p>
            </div>

            <div
              onClick={() => router.push('/admin/category?type=NOT_SPECIFIED')}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '4px solid #999',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(153, 153, 153, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '500',
              }}>
                Not Specified
              </p>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#999',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {registrations.filter(r => !r.registration_for || r.registration_for === '').length}
              </p>
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '20px',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Inter', sans-serif",
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Ticket No</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Mobile</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Company</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg) => {
                const statusColor = getPaymentStatusColor(reg.payment_status)
                return (
                  <tr key={reg.id} id={`reg-${reg.id}`} style={{ borderBottom: '1px solid #dee2e6', transition: 'background-color 0.3s ease' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.ticket_no}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.name}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.mobile_number}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.email}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.company_name || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#0066cc',
                        fontWeight: '500',
                      }}>
                        {reg.registration_for || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '5px 12px',
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block',
                      }}>
                        {reg.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      ₹{reg.amount}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {new Date(reg.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* WhatsApp Icon */}
                        <button
                          onClick={() => handleWhatsAppShare(reg)}
                          title="Share via WhatsApp"
                          style={{
                            padding: '8px',
                            backgroundColor: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1da851'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                          </svg>
                        </button>

                        {/* Email Icon */}
                        <button
                          onClick={() => handleEmailShare(reg)}
                          title="Send via Email"
                          style={{
                            padding: '8px',
                            backgroundColor: '#0078D4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0078D4'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                        </button>

                        {/* Delete Icon */}
                        <button
                          onClick={() => handleDelete(reg.id)}
                          title="Delete Registration"
                          style={{
                            padding: '8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredRegistrations.length === 0 && (
            <p style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
              fontSize: '15px',
              fontFamily: "'Inter', sans-serif",
            }}>
              No registrations found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
