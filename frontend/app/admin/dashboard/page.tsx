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
  referred_by: string | null
  registration_for: string | null
  payment_status: string
  payment_id: string | null
  order_id: string | null
  amount: string
  payment_date: string | null
  created_at: string
  is_primary_booker: boolean
  primary_booker_name: string | null
  primary_booker_email: string | null
  primary_booker_mobile: string | null
  gateway_verified: boolean
  message_copied: boolean
  message_copied_at: string | null
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
  const [sharedWhatsApp, setSharedWhatsApp] = useState<Set<number>>(new Set())
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null)
  const [editForm, setEditForm] = useState<Partial<Registration>>({})

  // Load shared WhatsApp status from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('whatsapp_shared')
    if (stored) {
      setSharedWhatsApp(new Set(JSON.parse(stored)))
    }
  }, [])

  // Scan result modal state
  const [showScanResult, setShowScanResult] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    name?: string
    mobile?: string
    payment?: string
    amount?: string
    time: string
    ticket: string
  } | null>(null)

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

      const token = localStorage.getItem('access_token')

      if (registration) {
        // Log the successful scan to backend
        try {
          const response = await fetch(`https://api.bnievent.rfidpro.in/api/scan-logs/log_scan/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticket_no: scannedTicket.trim(),
              action: 'CHECK_IN',
              notes: `Check-in by ${localStorage.getItem('username') || 'admin'}`
            }),
          })

          if (response.ok) {
            console.log('Scan logged successfully')
          } else {
            console.log('Failed to log scan:', await response.text())
          }
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

        // Show colorful success modal
        setScanResult({
          success: true,
          name: registration.name,
          mobile: registration.mobile_number,
          payment: registration.payment_status,
          amount: registration.amount,
          time: timestamp,
          ticket: scannedTicket.trim()
        })
        setShowScanResult(true)
      } else {
        // Log failed scan
        try {
          const response = await fetch(`https://api.bnievent.rfidpro.in/api/scan-logs/log_scan/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticket_no: scannedTicket.trim(),
              action: 'SCAN_FAILED',
              notes: 'Ticket not found in database'
            }),
          })

          if (response.ok) {
            console.log('Failed scan logged successfully')
          } else {
            console.log('Failed to log scan:', await response.text())
          }
        } catch (error) {
          console.log('Logging error:', error)
        }

        // Show colorful failure modal
        setScanResult({
          success: false,
          time: timestamp,
          ticket: scannedTicket.trim()
        })
        setShowScanResult(true)
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

  const handleEdit = (reg: Registration) => {
    setEditingRegistration(reg)
    setEditForm({
      name: reg.name,
      mobile_number: reg.mobile_number,
      email: reg.email,
      age: reg.age,
      location: reg.location,
      company_name: reg.company_name,
      referred_by: reg.referred_by,
      registration_for: reg.registration_for,
      amount: reg.amount,
      payment_status: reg.payment_status,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRegistration) return

    const token = localStorage.getItem('access_token')
    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${editingRegistration.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const updatedReg = await response.json()
        setRegistrations(registrations.map(r => r.id === editingRegistration.id ? updatedReg : r))
        setShowEditModal(false)
        setEditingRegistration(null)
        setEditForm({})
        alert('Registration updated successfully!')
      } else {
        alert('Failed to update registration')
      }
    } catch (error) {
      alert('Error updating registration')
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
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/save-id-card/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const message = `*BNI CHETTINAD - Event Registration Confirmation*\n\n` +
          `Dear ${reg.name},\n\n` +
          `Your registration has been successfully confirmed.\n\n` +
          `*Ticket Number:* ${reg.ticket_no}\n` +
          `*Payment Status:* ${reg.payment_status}\n` +
          `*Amount:* ₹${reg.amount}\n\n` +
          `*Your ID Card:*\n${data.image_url}\n\n` +
          `📍 *Ticket Collection Details:*\n` +
          `Please collect your event ticket on 20th February at the venue,\n` +
          `⏰ between 10:30 AM and 7:30 PM.\n\n` +
          `Kindly save this ID card and present it while collecting your ticket.\n\n` +
          `Thank you for registering. We look forward to seeing you! 😊`

        // Normalize phone number to Indian format (+91)
        let phoneNumber = reg.mobile_number.replace(/\s+/g, '').replace(/^0+/, '')
        // Remove any existing country code
        phoneNumber = phoneNumber.replace(/^\+\d{1,3}/, '')
        // Add +91 prefix
        phoneNumber = `91${phoneNumber}`

        const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')

        // Mark as shared and save to localStorage
        const newShared = new Set(sharedWhatsApp)
        newShared.add(reg.id)
        setSharedWhatsApp(newShared)
        localStorage.setItem('whatsapp_shared', JSON.stringify(Array.from(newShared)))
      } else {
        alert('Failed to generate ID card')
      }
    } catch (error) {
      alert('Error generating ID card')
    }
  }

  const handleCopyWhatsAppMessage = async (reg: Registration) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/save-id-card/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const message = `*BNI CHETTINAD - Event Registration Confirmation*\n\n` +
          `Dear ${reg.name},\n\n` +
          `Your registration has been successfully confirmed.\n\n` +
          `*Ticket Number:* ${reg.ticket_no}\n` +
          `*Payment Status:* ${reg.payment_status}\n` +
          `*Amount:* ₹${reg.amount}\n\n` +
          `*Your ID Card:*\n${data.image_url}\n\n` +
          `📍 *Ticket Collection Details:*\n` +
          `Please collect your event ticket on 20th February at the venue,\n` +
          `⏰ between 10:30 AM and 7:30 PM.\n\n` +
          `Kindly save this ID card and present it while collecting your ticket.\n\n` +
          `Thank you for registering. We look forward to seeing you! 😊`

        // Copy to clipboard
        await navigator.clipboard.writeText(message)

        // Update the registration in state to reflect the copied status
        setRegistrations(prevRegs =>
          prevRegs.map(r =>
            r.id === reg.id
              ? { ...r, message_copied: true, message_copied_at: new Date().toISOString() }
              : r
          )
        )

        // Optional: Show a brief notification
        alert('WhatsApp message copied to clipboard!')
      }
    } catch (error) {
      alert('Error copying message')
    }
  }

  const handleEmailShare = async (reg: Registration) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/save-id-card/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      let idCardUrl = ''
      if (response.ok) {
        const data = await response.json()
        idCardUrl = data.image_url
      }

      const subject = `BNI CHETTINAD Event - Your Ticket (${reg.ticket_no})`
      const body = `Dear ${reg.name},\n\n` +
        `Your registration for BNI CHETTINAD Event is confirmed!\n\n` +
        `Ticket Number: ${reg.ticket_no}\n` +
        `Payment Status: ${reg.payment_status}\n` +
        `Amount: ₹${reg.amount}\n\n` +
        (idCardUrl ? `Your ID Card: ${idCardUrl}\n\n` : '') +
        `Please save this ID card for entry verification at the event.\n\n` +
        `Thank you for registering!\n\n` +
        `Best regards,\n` +
        `BNI CHETTINAD Team`

      const mailtoUrl = `mailto:${reg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.location.href = mailtoUrl
    } catch (error) {
      alert('Error generating ID card for email')
    }
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
    const matchesSearch = (reg.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.ticket_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.mobile_number || '').includes(searchTerm)

    const matchesPayment = paymentFilter === 'ALL' || reg.payment_status === paymentFilter

    return matchesSearch && matchesPayment
  })

  const exportToCSV = () => {
    const headers = ['Ticket No', 'Name', 'Mobile', 'Email', 'Age', 'Location', 'Company', 'Registration For', 'Referred By', 'Registered By', 'Payment Status', 'Amount', 'Payment ID', 'Order ID', 'Payment Date', 'Created At']
    const csvData = filteredRegistrations.map(reg => [
      reg.ticket_no,
      reg.name,
      reg.mobile_number,
      reg.email,
      reg.age || '',
      reg.location || '',
      reg.company_name || '',
      reg.registration_for || '',
      reg.referred_by ? reg.referred_by.replace(/_/g, ' ') : '',
      reg.is_primary_booker ? 'Self' : (reg.primary_booker_name || ''),
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/admin/seats')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6f42c1',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Seats
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
              onClick={() => router.push('/admin/idcard')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#17a2b8',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#138496'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#17a2b8'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              ID Card
            </button>
            <button
              onClick={() => router.push('/admin/sponsors')}
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e55b00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              Sponsors
            </button>
            <button
              onClick={() => router.push('/admin/payment-report')}
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
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Payment Report
            </button>
            <button
              onClick={() => router.push('/admin/bni-bookings')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#9c27b0',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7b1fa2'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#9c27b0'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              BNI Bookings
            </button>
            <button
              onClick={() => router.push('/admin/vip-bookings')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6f42c1',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              VIP Bookings
            </button>
            <button
              onClick={() => router.push('/admin/volunteer-bookings')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f39c12',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e67e22'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f39c12'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Volunteer Bookings
            </button>
            <button
              onClick={() => router.push('/admin/organiser-bookings')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#e74c3c',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              Organiser Bookings
            </button>
            <button
              onClick={() => router.push('/admin/bulk')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#fd7e14',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e8590c'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fd7e14'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="M9 14l2 2 4-4"></path>
              </svg>
              Bulk Registrations
            </button>
            <button
              onClick={() => router.push('/admin/feedback')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6f42c1',
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Feedback from QR
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Logout
            </button>
          </div>
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-in',
        }}
        onClick={() => {
          setShowScanResult(false)
          setScanResult(null)
        }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            animation: scanResult.success ? 'bounceIn 0.5s ease-out' : 'shakeIn 0.5s ease-out',
            border: scanResult.success ? '3px solid #28a745' : '3px solid #dc3545',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowScanResult(false)
                setScanResult(null)
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#666',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#e0e0e0'
                e.currentTarget.style.color = '#000'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#f0f0f0'
                e.currentTarget.style.color = '#666'
              }}
            >
              ×
            </button>

            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '25px',
            }}>
              {scanResult.success ? (
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)',
                }}>
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              ) : (
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  boxShadow: '0 8px 20px rgba(220, 53, 69, 0.3)',
                }}>
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
              )}
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: '15px',
              fontFamily: "'Inter', sans-serif",
              color: scanResult.success ? '#28a745' : '#dc3545',
            }}>
              {scanResult.success ? 'TICKET FOUND!' : 'TICKET NOT FOUND'}
            </h2>

            {/* Details */}
            <div style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '25px',
              marginBottom: '20px',
              border: '1px solid #e0e0e0',
            }}>
              {scanResult.success ? (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginBottom: '5px',
                      color: '#666',
                      fontFamily: "'Inter', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>Name</p>
                    <p style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      margin: 0,
                      fontFamily: "'Inter', sans-serif",
                      color: '#333',
                    }}>{scanResult.name}</p>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <p style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginBottom: '5px',
                      color: '#666',
                      fontFamily: "'Inter', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>Mobile</p>
                    <p style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      margin: 0,
                      fontFamily: "'Inter', sans-serif",
                      color: '#333',
                    }}>{scanResult.mobile}</p>
                  </div>

                  <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginBottom: '5px',
                        color: '#666',
                        fontFamily: "'Inter', sans-serif",
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Payment</p>
                      <p style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        margin: 0,
                        fontFamily: "'Inter', sans-serif",
                        color: scanResult.payment === 'SUCCESS' ? '#28a745' : '#ffc107',
                      }}>{scanResult.payment}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginBottom: '5px',
                        color: '#666',
                        fontFamily: "'Inter', sans-serif",
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Amount</p>
                      <p style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        margin: 0,
                        fontFamily: "'Inter', sans-serif",
                        color: '#333',
                      }}>₹{scanResult.amount}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '5px',
                    color: '#666',
                    fontFamily: "'Inter', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Ticket Number</p>
                  <p style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    color: '#333',
                  }}>{scanResult.ticket}</p>
                </div>
              )}

              <div>
                <p style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '5px',
                  color: '#666',
                  fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Scanned At</p>
                <p style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  color: '#333',
                }}>{scanResult.time}</p>
              </div>
            </div>

            {/* Status Message */}
            <div style={{
              textAlign: 'center',
              background: scanResult.success ? '#e7f7ed' : '#ffe5e5',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              border: scanResult.success ? '1px solid #28a745' : '1px solid #dc3545',
            }}>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                color: scanResult.success ? '#28a745' : '#dc3545',
              }}>
                {scanResult.success ? '✅ Attendance Recorded!' : '⚠️ Scan Logged as Failed'}
              </p>
            </div>

            {/* OK Button */}
            <button
              onClick={() => {
                setShowScanResult(false)
                setScanResult(null)
              }}
              style={{
                width: '100%',
                padding: '16px',
                background: scanResult.success
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                  : 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.2rem',
                fontWeight: '800',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: scanResult.success
                  ? '0 4px 15px rgba(40, 167, 69, 0.3)'
                  : '0 4px 15px rgba(220, 53, 69, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = scanResult.success
                  ? '0 6px 20px rgba(40, 167, 69, 0.4)'
                  : '0 6px 20px rgba(220, 53, 69, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = scanResult.success
                  ? '0 4px 15px rgba(40, 167, 69, 0.3)'
                  : '0 4px 15px rgba(220, 53, 69, 0.3)'
              }}
            >
              OK
            </button>
          </div>

          {/* Animations and Mobile Styles */}
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes bounceIn {
              0% {
                transform: scale(0.3);
                opacity: 0;
              }
              50% {
                transform: scale(1.05);
              }
              70% {
                transform: scale(0.9);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }

            @keyframes shakeIn {
              0% {
                transform: translateX(0) scale(0.3);
                opacity: 0;
              }
              25% {
                transform: translateX(-10px) scale(0.7);
              }
              50% {
                transform: translateX(10px) scale(0.9);
              }
              75% {
                transform: translateX(-5px) scale(1.05);
              }
              100% {
                transform: translateX(0) scale(1);
                opacity: 1;
              }
            }

            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.1);
                opacity: 0.8;
              }
            }

            /* Mobile Responsive Styles */
            @media (max-width: 600px) {
              div[style*="maxWidth: 500px"] {
                margin: 10px !important;
                padding: 25px !important;
                border-radius: 16px !important;
              }

              h2 {
                font-size: 1.5rem !important;
              }

              div[style*="fontSize: 1.3rem"] p,
              p[style*="fontSize: 1.3rem"] {
                font-size: 1.1rem !important;
              }

              div[style*="fontSize: 1.1rem"] p,
              p[style*="fontSize: 1.1rem"] {
                font-size: 0.95rem !important;
              }

              div[style*="fontSize: 1rem"] p,
              p[style*="fontSize: 1rem"] {
                font-size: 0.9rem !important;
              }

              div[style*="fontSize: 0.85rem"] p,
              p[style*="fontSize: 0.85rem"] {
                font-size: 0.75rem !important;
              }

              button[style*="fontSize: 1.2rem"] {
                font-size: 1rem !important;
                padding: 14px !important;
              }

              div[style*="width: 90px"][style*="height: 90px"] {
                width: 70px !important;
                height: 70px !important;
              }

              div[style*="width: 90px"] svg {
                width: 35px !important;
                height: 35px !important;
              }

              div[style*="padding: 40px"] {
                padding: 25px !important;
              }

              div[style*="padding: 25px"][style*="borderRadius"] {
                padding: 18px !important;
              }

              div[style*="marginBottom: 25px"] {
                margin-bottom: 18px !important;
              }

              div[style*="gap: 15px"] {
                gap: 10px !important;
              }
            }

            /* Extra small devices */
            @media (max-width: 400px) {
              h2 {
                font-size: 1.3rem !important;
              }

              div[style*="maxWidth: 500px"] {
                padding: 20px !important;
              }

              button {
                padding: 12px !important;
              }
            }
          `}</style>
        </div>
      )}

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

      {/* Edit Registration Modal */}
      {showEditModal && editingRegistration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
          overflowY: 'auto',
        }}
        onClick={() => {
          setShowEditModal(false)
          setEditingRegistration(null)
          setEditForm({})
        }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '25px',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '15px',
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0,
                color: '#333',
                fontFamily: "'Inter', sans-serif",
              }}>
                Edit Registration
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingRegistration(null)
                  setEditForm({})
                }}
                style={{
                  background: '#f0f0f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#666',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e0e0e0'
                  e.currentTarget.style.color = '#000'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f0f0f0'
                  e.currentTarget.style.color = '#666'
                }}
              >
                ×
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Ticket Number (Read-only) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Ticket Number
                </label>
                <input
                  type="text"
                  value={editingRegistration.ticket_no}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Mobile Number *
                </label>
                <input
                  type="text"
                  value={editForm.mobile_number || ''}
                  onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>

              {/* Age */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Age
                </label>
                <input
                  type="number"
                  value={editForm.age || ''}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value ? parseInt(e.target.value) : null })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>

              {/* Location */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>

              {/* Company Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={editForm.company_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>

              {/* Referred By */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Referred By
                </label>
                <select
                  value={editForm.referred_by || ''}
                  onChange={(e) => setEditForm({ ...editForm, referred_by: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                >
                  <option value="">Select...</option>
                  <option value="BNI_MEMBERS">BNI Members</option>
                  <option value="FLEX">Flex</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                  <option value="FRIENDS">Friends</option>
                </select>
              </div>

              {/* Registration For */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Registration Type
                </label>
                <select
                  value={editForm.registration_for || ''}
                  onChange={(e) => setEditForm({ ...editForm, registration_for: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                >
                  <option value="">Select...</option>
                  <option value="BNI_CHETTINAD">BNI Chettinad</option>
                  <option value="BNI_THALAIVAS">BNI Thalaivas</option>
                  <option value="BNI_MADURAI">BNI Madurai</option>
                  <option value="PUBLIC">Public</option>
                  <option value="STUDENTS">Students</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Payment Status
                </label>
                <select
                  value={editForm.payment_status || ''}
                  onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                >
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Amount
                </label>
                <input
                  type="text"
                  value={editForm.amount || ''}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d0d0d0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                  onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '25px',
              paddingTop: '20px',
              borderTop: '1px solid #f0f0f0',
            }}>
              <button
                onClick={handleSaveEdit}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 3px 10px rgba(40, 167, 69, 0.3)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(40, 167, 69, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(40, 167, 69, 0.3)'
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingRegistration(null)
                  setEditForm({})
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
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
                Cancel
              </button>
            </div>
          </div>
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
                  Confirmed
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

          {/* Gateway Verification Status */}
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
              Gateway Verification
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '6px 14px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  🔒 Verified
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#17a2b8',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {registrations.filter(r => r.gateway_verified).length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '6px 14px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  📝 Manual
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#6c757d',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {registrations.filter(r => !r.gateway_verified && r.payment_status === 'SUCCESS').length}
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
              Total Amount Collected
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
            <option value="SUCCESS">Confirmed</option>
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
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Referred By</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Registered By</th>
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
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span
                        onClick={() => handleCopyWhatsAppMessage(reg)}
                        style={{
                          color: reg.message_copied ? '#28a745' : '#0066cc',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'color 0.3s ease',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {reg.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <a
                        href={`tel:${reg.mobile_number}`}
                        style={{
                          color: '#0066cc',
                          textDecoration: 'none',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {reg.mobile_number}
                      </a>
                    </td>
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
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>
                      {reg.referred_by ? (
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: '#fff3e0',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#ff6600',
                          fontWeight: '500',
                        }}>
                          {reg.referred_by.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>
                      {reg.is_primary_booker ? (
                        <span style={{ color: '#666', fontStyle: 'italic' }}>Self</span>
                      ) : (
                        <span style={{ color: '#0066cc', fontWeight: '500' }}>
                          {reg.primary_booker_name || '-'}
                        </span>
                      )}
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
                            backgroundColor: sharedWhatsApp.has(reg.id) ? '#25D366' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = sharedWhatsApp.has(reg.id) ? '#1da851' : '#c82333'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = sharedWhatsApp.has(reg.id) ? '#25D366' : '#dc3545'}
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

                        {/* Edit Icon */}
                        <button
                          onClick={() => handleEdit(reg)}
                          title="Edit Registration"
                          style={{
                            padding: '8px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0a800'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffc107'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
