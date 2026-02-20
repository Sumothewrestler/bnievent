'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ScannerPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scannedTicket, setScannedTicket] = useState('')
  const [cameraMode, setCameraMode] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef<any>(null)
  const isProcessingRef = useRef<boolean>(false)  // lock: prevents rapid-fire duplicate API calls
  const [showScanResult, setShowScanResult] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    name?: string
    mobile?: string
    payment?: string
    amount?: string
    time: string
    ticket: string
    message?: string
    already_checked_in?: boolean
    first_time?: boolean
    first_scan_time?: string
  } | null>(null)

  const SCANNER_PIN = '5555'

  useEffect(() => {
    // Check if already authenticated in this session
    const authenticated = sessionStorage.getItem('scanner_authenticated')
    if (authenticated === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (cameraMode && showScanner) {
      const timer = setTimeout(() => {
        const element = document.getElementById('qr-reader')
        if (element && !scannerRef.current) {
          import('html5-qrcode').then(({ Html5Qrcode }) => {
            const html5QrCode = new Html5Qrcode('qr-reader')
            scannerRef.current = html5QrCode

            html5QrCode.start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                // Lock: ignore if already processing a scan
                if (isProcessingRef.current) return
                isProcessingRef.current = true

                // Stop camera immediately to prevent more callbacks
                if (scannerRef.current) {
                  scannerRef.current.stop().catch(() => {})
                  scannerRef.current = null
                }
                setShowScanner(false)
                setCameraMode(false)
                setScannerReady(false)
                setScannedTicket(decodedText)
                handleScanTicketAuto(decodedText)
              },
              (errorMessage) => {
                // Ignore decode errors
              }
            ).then(() => {
              setScannerReady(true)
            }).catch((err) => {
              console.error('Camera start error:', err)
              alert('Failed to start camera. Please ensure camera permissions are granted.')
              setCameraMode(false)
            })
          })
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [cameraMode, showScanner])

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === SCANNER_PIN) {
      setIsAuthenticated(true)
      sessionStorage.setItem('scanner_authenticated', 'true')
      setPinError('')
    } else {
      setPinError('Invalid PIN. Please try again.')
      setPin('')
    }
  }

  const handleScanTicketAuto = async (ticket: string) => {
    if (ticket) {
      try {
        // Extract ticket number from full URL if QR contains a URL
        // e.g. "https://bnichettinad.cloud/qr/BNI414" → "BNI414"
        let ticketNo = ticket.trim()
        const qrMatch = ticketNo.match(/\/qr\/([A-Z0-9]+)/i)
        if (qrMatch) {
          ticketNo = qrMatch[1].toUpperCase()
        }

        // Use the public scan endpoint - no authentication required
        const response = await fetch(`https://api.bnievent.rfidpro.in/api/scan/${ticketNo}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (response.ok) {
          setScanResult({
            success: true,
            name: data.name,
            mobile: data.mobile,
            payment: data.payment_status,
            amount: data.amount,
            time: new Date().toLocaleTimeString(),
            ticket: ticketNo,
            message: data.message,
            already_checked_in: data.already_checked_in,
            first_time: data.first_time,
            first_scan_time: data.first_scan_time,
          })
          setShowScanResult(true)

          // Play success or warning sound based on duplicate status
          if (data.already_checked_in) {
            // Play warning sound for duplicate scan
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjo77RgGwU7k9r0yoIsBS6Ay/DajDwKE2S36+ygUhELTKXm87tiGwU7lNr0yYEsBTCFzvHYijgKGGq88O2aUQ0QVK7n8bJeHAc8mNv0xm8qBSp+zPDckjsLD2O26+mjURELTqfn9LdhGgYslNjzyoMrBTGDzfHajTgKGWu98OyaUA0PVa/n8bJeHAc8mdv0xW8qBSh+zPDdkjoLD2K16+mjUREKTqfn9LdhGgYslNjzyoQrBTGEzfDajDgJGGu98OyZUA0PVbDn8bJeHAg8mtz0xG4qBSh9zPDdkzkLD2G16+mjUhEKTqjn9LdgGgYsldjzyoQrBDKEzfDZjDgJF2q88OyZUA0PVbDn8bJdHAg9mtz0xG4pBCh9zPDdkzkLD2C16+mjUhEKTajn9LdgGgUsldjzyoMrBDKDzfDZizgJF2m88OuZTw0PVLDn8rJdHAg9mdz0w24pBCh9y/DdkzkKD2C16+mjUhEKTajn9LdgGgUslNjzyoMrBDKDzfDZizgJF2m88OuYTw0OVLDn8rJdGwg9mdz0w24pBCd9y/DdkjkKDl+16umjUhEKTajn9LdgGgQslNjzyoIrBDKDzfDZijcJF2m88OuYTgwOVLDn8rJdGwg9mNz0w24oBCd9y/DdkjkKDl+16umjUREKTajn9LdgGgQslNjzyoIrBDKDzfDZijcJFmm88OuYTgwOVLDn8rJdGgg9mNz0wm4oBCZ9y/DdkTkKDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9l9z0wm4oBCZ9y/DdkTkJDV+16umjUBEKTKjn9LdgGgQrldrzyo IrA==')
            audio.play().catch(() => {})
          } else {
            // Play success sound for first-time scan
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjo77RgGwU7k9r0yoIsBS6Ay/DajDwKE2S36+ygUhELTKXm87tiGwU7lNr0yYEsBTCFzvHYijgKGGq88O2aUQ0QVK7n8bJeHAc8mNv0xm8qBSp+zPDckjsLD2O26+mjURELTqfn9LdhGgcslNjzyoMrBTGDzfHajTgKGWu98OyaUA0PVa/n8bJeHAc8mdv0xW8qBSh+zPDdkjoLD2K16+mjUREKTqfn9LdhGgYslNjzyoQrBTGEzfDajDgJGGu98OyZUA0PVbDn8bJeHAg8mtz0xG4qBSh9zPDdkzkLD2G16+mjUhEKTqjn9LdgGgYsldjzyoQrBDKEzfDZjDgJGGu98OyZTw0PVbDn8bJeHAg9mtz0xG4pBCh9zPDdkzkLD2C16+mjUhEKTqjn9LdgGgUsldjzyoMrBDKEzfDZizgJF2q88OyZTw0PVLDn8bJdHAg9mdz0xG4pBCh9y/DdkzkKD2C16+mjUhEKTajn9LdgGgUslNjzyoMrBDKDzfDZizgJF2q88OuZTw0PVLDn8rJdHAg9mdz0w24pBCh9y/DdkjkKD2C16umjUhEKTajn9LdgGgUslNjzyoIrBDKDzfDZizgJF2m88OuZTw0OVLDn8rJdGwg9mdz0w24pBCd9y/DdkjkKDl+16umjUhEKTajn9LdgGgUslNjzyoIrBDKDzfDZijcJF2m88OuYTw0OVLDn8rJdGwg9mNz0w24oBCd9y/DdkjkKDl+16umjUREKTajn9LdgGgQslNjzyoIrBDKDzfDZijcJF2m88OuYTgwOVLDn8rJdGwg9mNz0w24oBCd9y/DdkTkKDl+16umjUREKTKjn9LdgGgQslNjzyYIrBDKDzfDZijcJFmm88OuYTgwOVLDn8rJdGgg9mNz0w24oBCd9y/DdkTkKDV+16umjUREKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTgwOVLDn8rJdGgg9mNz0wm4oBCd9y/DdkTkKDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9mNz0wm4oBCZ9y/DdkTkKDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9mNz0wm4oBCZ9y/DdkTkKDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9l9z0wm4oBCZ9y/DdkTkKDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9l9z0wm4oBCZ9y/DdkTkJDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9l9z0wm4oBCZ9y/DdkTkJDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9l9z0wm4oBCZ9y/DdkTkJDV+16umjUBEKTKjn9LdgGgQrldrzyo IrA==')
            audio.play().catch(() => {})
          }
        } else {
          setScanResult({
            success: false,
            time: new Date().toLocaleTimeString(),
            ticket: ticketNo,
            message: data.error || 'Scan failed',
          })
          setShowScanResult(true)

          // Play error sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjo77RgGwU7k9r0yoIsBS6Ay/DajDwKE2S36+ygUhELTKXm87tiGwU7lNr0yYEsBTCFzvHYijgKGGq88O2aUQ0QVK7n8bJeHAc8mNv0xm8qBSp+zPDckjsLD2O26+mjURELTqfn9LdhGgYslNjzyoMrBTGDzfHajTgKGWu98OyaUA0PVa/n8bJeHAc8mdv0xW8qBSh+zPDdkjoLD2K16+mjUREKTqfn9LdhGgYslNjzyoQrBTGEzfDajDgJGGu98OyZUA0PVbDn8bJeHAg8mtz0xG4qBSh9zPDdkzkLD2G16+mjUhEKTqjn9LdgGgYsldjzyoQrBDKEzfDZjDgJF2q88OyZUA0PVbDn8bJdHAg9mtz0xG4pBCh9zPDdkzkLD2C16+mjUhEKTajn9LdgGgUsldjzyoMrBDKDzfDZizgJF2m88OuZTw0PVLDn8rJdHAg9mdz0w24pBCh9y/DdkzkKD2C16+mjUhEKTajn9LdgGgUslNjzyoMrBDKDzfDZizgJF2m88OuYTw0OVLDn8rJdGwg9mdz0w24pBCd9y/DdkjkKDl+16umjUhEKTajn9LdgGgQslNjzyoIrBDKDzfDZijcJF2m88OuYTgwOVLDn8rJdGwg9mNz0w24oBCd9y/DdkjkKDl+16umjUREKTajn9LdgGgQslNjzyoIrBDKDzfDZijcJFmm88OuYTgwOVLDn8rJdGgg9mNz0wm4oBCZ9y/DdkTkKDV+16umjUBEKTKjn9LdgGgQrldrzyo IrBDKDzfDZiTcJFmm88OqYTQwOVLDn8rJdGgg9l9z0wm4oBCZ9y/DdkTkJDV+16umjUBEKTKjn9LdgGgQrldrzyo IrA==')
          audio.play().catch(() => {})
        }

        setScannedTicket('')
      } catch (error) {
        console.error('Scan error:', error)
        setScanResult({
          success: false,
          time: new Date().toLocaleTimeString(),
          ticket: ticket,
          message: 'Error connecting to server',
        })
        setShowScanResult(true)
      }
    }
  }

  const closeScanner = () => {
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

  const handleLogout = () => {
    sessionStorage.removeItem('scanner_authenticated')
    setIsAuthenticated(false)
    setPin('')
  }

  // PIN Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '15px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '32px 24px',
          maxWidth: '420px',
          width: '100%',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src="/ez.gif"
              alt="BNI Event"
              style={{
                height: '70px',
                width: 'auto',
                objectFit: 'contain',
                marginBottom: '16px',
              }}
            />
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#1a1a1a',
              letterSpacing: '-0.5px',
            }}>
              QR Scanner
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.5',
            }}>
              Enter your 4-digit PIN to continue
            </p>
          </div>

          <form onSubmit={handlePinSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#374151',
                textAlign: 'left',
              }}>
                Security PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: pinError ? '2px solid #ef4444' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'center',
                  letterSpacing: '12px',
                  fontSize: '28px',
                  fontWeight: '700',
                  backgroundColor: '#f9fafb',
                  color: '#1a1a1a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  if (!pinError) {
                    e.currentTarget.style.border = '2px solid #667eea'
                    e.currentTarget.style.backgroundColor = '#ffffff'
                  }
                }}
                onBlur={(e) => {
                  if (!pinError) {
                    e.currentTarget.style.border = '2px solid #e5e7eb'
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }
                }}
                autoFocus
              />
              {pinError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ef4444',
                  fontSize: '13px',
                  marginTop: '10px',
                  fontWeight: '500',
                }}>
                  <span>⚠</span>
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#667eea',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
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
              Access Scanner
            </button>
          </form>

          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: 0,
            }}>
              Secure access for authorized personnel only
            </p>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 480px) {
            div[style*="padding: 32px 24px"] {
              padding: 24px 20px !important;
            }
            h1 {
              font-size: 1.35rem !important;
            }
            input[type="password"] {
              font-size: 24px !important;
              padding: 14px 16px !important;
              letter-spacing: 10px !important;
            }
          }
        `}</style>
      </div>
    )
  }

  // Scanner Screen
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/ez.gif"
              alt="BNI Event"
              style={{
                height: '50px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <h1 style={{
              fontSize: '1.35rem',
              fontWeight: '700',
              margin: 0,
            }}>
              <span style={{ color: '#ff0000' }}>QR</span>{' '}
              <span style={{ color: '#000000' }}>Scanner</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#c82333'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px 16px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          {!showScanner ? (
            <>
              <div style={{
                fontSize: '64px',
                marginBottom: '16px',
              }}>
                📷
              </div>
              <h2 style={{
                fontSize: '1.35rem',
                fontWeight: '700',
                marginBottom: '8px',
                color: '#1a1a1a',
                letterSpacing: '-0.3px',
              }}>
                Ready to Scan
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}>
                Tap the button below to activate your camera and start scanning QR codes
              </p>
              <button
                onClick={() => {
                  setShowScanner(true)
                  setCameraMode(true)
                }}
                style={{
                  width: '100%',
                  maxWidth: '280px',
                  padding: '16px 32px',
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#218838'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)'
                }}
              >
                Start Scanning
              </button>
            </>
          ) : (
            <>
              <div id="qr-reader" style={{
                width: '100%',
                maxWidth: '500px',
                margin: '0 auto 20px',
                border: '3px solid #667eea',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
              }}></div>
              <button
                onClick={closeScanner}
                style={{
                  width: '100%',
                  maxWidth: '200px',
                  padding: '12px 24px',
                  backgroundColor: '#dc3545',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#c82333'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 53, 69, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc3545'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)'
                }}
              >
                Close Scanner
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scan Result Modal */}
      {showScanResult && scanResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px 24px',
            textAlign: 'center',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{
              fontSize: '56px',
              marginBottom: '16px',
            }}>
              {scanResult.success
                ? (scanResult.already_checked_in ? '⚠️' : '✅')
                : '❌'}
            </div>

            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: '700',
              marginBottom: '16px',
              color: scanResult.success
                ? (scanResult.already_checked_in ? '#dc3545' : '#28a745')
                : '#dc3545',
              letterSpacing: '-0.3px',
            }}>
              {scanResult.success
                ? (scanResult.already_checked_in ? 'Already Checked In' : 'Welcome!')
                : 'Scan Failed'}
            </h2>

            {scanResult.success ? (
              <>
                {/* Duplicate Scan Warning */}
                {scanResult.already_checked_in && (
                  <div style={{
                    marginBottom: '16px',
                    background: '#fef2f2',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '2px solid #fecaca',
                    textAlign: 'center',
                  }}>
                    <p style={{
                      color: '#991b1b',
                      fontSize: '15px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                    }}>
                      {scanResult.message}
                    </p>
                    <p style={{
                      color: '#dc2626',
                      fontSize: '13px',
                      margin: 0,
                      fontWeight: '500',
                    }}>
                      This ticket was already scanned.
                    </p>
                  </div>
                )}

                {/* First Time Welcome Message */}
                {scanResult.first_time && (
                  <div style={{
                    marginBottom: '16px',
                    background: '#d1fae5',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '2px solid #6ee7b7',
                    textAlign: 'center',
                  }}>
                    <p style={{
                      color: '#065f46',
                      fontSize: '17px',
                      fontWeight: '700',
                      margin: 0,
                    }}>
                      {scanResult.message}
                    </p>
                  </div>
                )}

                <div style={{
                  textAlign: 'left',
                  marginBottom: '24px',
                  background: scanResult.already_checked_in ? '#fef2f2' : '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  border: scanResult.already_checked_in ? '1px solid #fecaca' : '1px solid #e5e7eb',
                }}>
                <div style={{
                  marginBottom: '12px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <strong style={{ color: '#6b7280' }}>Name:</strong>
                  <span style={{ color: '#1a1a1a', fontWeight: '500' }}>{scanResult.name}</span>
                </div>
                <div style={{
                  marginBottom: '12px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <strong style={{ color: '#6b7280' }}>Mobile:</strong>
                  <span style={{ color: '#1a1a1a', fontWeight: '500' }}>{scanResult.mobile}</span>
                </div>
                <div style={{
                  marginBottom: '12px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <strong style={{ color: '#6b7280' }}>Payment:</strong>
                  <span style={{
                    fontWeight: '600',
                    padding: '4px 8px',
                    backgroundColor: scanResult.payment === 'Paid' ? '#d1fae5' : '#fee2e2',
                    color: scanResult.payment === 'Paid' ? '#065f46' : '#991b1b',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}>{scanResult.payment}</span>
                </div>
                <div style={{
                  marginBottom: '12px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <strong style={{ color: '#6b7280' }}>Amount:</strong>
                  <span style={{ color: '#28a745', fontWeight: '700', fontSize: '15px' }}>₹{scanResult.amount}</span>
                </div>
                <div style={{
                  marginBottom: '12px',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <strong style={{ color: '#6b7280' }}>Ticket:</strong>
                  <span style={{
                    color: '#1a1a1a',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    backgroundColor: '#f3f4f6',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}>{scanResult.ticket}</span>
                </div>
                <div style={{
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <strong style={{ color: '#6b7280' }}>Time:</strong>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>{scanResult.time}</span>
                </div>
              </div>
              </>
            ) : (
              <div style={{
                marginBottom: '24px',
                background: '#fef2f2',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
              }}>
                <p style={{
                  color: '#991b1b',
                  fontSize: '14px',
                  marginBottom: '10px',
                  fontWeight: '500',
                }}>
                  {scanResult.message || 'Unable to verify this ticket'}
                </p>
                <p style={{
                  color: '#9ca3af',
                  fontSize: '11px',
                  marginTop: '10px',
                  fontFamily: 'monospace',
                  backgroundColor: '#ffffff',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                }}>
                  {scanResult.ticket}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                isProcessingRef.current = false  // unlock for next scan
                setShowScanResult(false)
                setScanResult(null)
                setShowScanner(true)
                setCameraMode(true)
              }}
              style={{
                width: '100%',
                maxWidth: '240px',
                padding: '14px 32px',
                backgroundColor: '#667eea',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
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
              Scan Next
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 480px) {
          h1 {
            font-size: 1.15rem !important;
          }
          img[alt="BNI Event"] {
            height: 40px !important;
          }
          button[style*="Logout"] {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
          div[style*="padding: 32px 24px"] {
            padding: 20px 16px !important;
          }
          h2 {
            font-size: 1.15rem !important;
          }
        }
      `}</style>
    </div>
  )
}
