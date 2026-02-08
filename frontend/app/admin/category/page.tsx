'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
  amount: string
  created_at: string
  day1_present: boolean
  day2_present: boolean
}

function CategoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [category, setCategory] = useState('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scanningFor, setScanningFor] = useState<'day1' | 'day2' | null>(null)
  const [scannedTicket, setScannedTicket] = useState('')

  const categoryNames: { [key: string]: string } = {
    'BNI_THALAIVAS': 'BNI Thalaivas',
    'BNI_CHETTINAD': 'BNI Chettinad',
    'BNI_MADURAI': 'BNI Madurai',
    'PUBLIC': 'Public',
    'STUDENTS': 'Students',
    'NOT_SPECIFIED': 'Not Specified'
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }

    const cat = searchParams.get('type')
    if (cat) {
      setCategory(cat)
      fetchRegistrations(token, cat)
    } else {
      router.replace('/admin/dashboard')
    }
  }, [searchParams, router])

  const fetchRegistrations = async (token: string, cat: string) => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const filtered = data.filter((reg: Registration) => {
          if (cat === 'NOT_SPECIFIED') {
            return !reg.registration_for || reg.registration_for === ''
          }
          return reg.registration_for === cat
        })
        setRegistrations(filtered)
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

  const handleMarkPresent = async (ticketNo: string, day: 'day1' | 'day2') => {
    const token = localStorage.getItem('access_token')
    const registration = registrations.find(r => r.ticket_no === ticketNo)

    if (!registration) {
      alert('Ticket not found!')
      return
    }

    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${registration.id}/mark-attendance/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ day }),
      })

      if (response.ok) {
        // Update local state
        setRegistrations(registrations.map(r =>
          r.id === registration.id
            ? { ...r, [day === 'day1' ? 'day1_present' : 'day2_present']: true }
            : r
        ))
        alert(`Marked ${registration.name} as present for ${day === 'day1' ? 'Day 1' : 'Day 2'}`)
        setScannedTicket('')
        setScanningFor(null)
      } else {
        alert('Failed to mark attendance')
      }
    } catch (error) {
      alert('Error marking attendance')
    }
  }

  const handleScan = () => {
    if (scannedTicket && scanningFor) {
      handleMarkPresent(scannedTicket, scanningFor)
    }
  }

  const stats = {
    total: registrations.length,
    paid: registrations.filter(r => r.payment_status === 'SUCCESS').length,
    pending: registrations.filter(r => r.payment_status === 'PENDING').length,
    day1Present: registrations.filter(r => r.day1_present).length,
    day2Present: registrations.filter(r => r.day2_present).length,
  }

  if (loading) {
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
      paddingBottom: '40px',
    }}>
      {/* Header */}
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
            <img src="/ez.gif" alt="BNI Event" style={{ height: '60px', width: 'auto' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>
              <span style={{ color: '#ff0000' }}>BNI</span>{' '}
              <span style={{ color: '#000000' }}>CHETTINAD</span>
            </h1>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ff6600',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '20px',
          color: '#333',
        }}>
          {categoryNames[category] || category}
        </h2>

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px',
        }}>
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Total</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#ff6600', margin: 0 }}>{stats.total}</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Paid</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#28a745', margin: 0 }}>{stats.paid}</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Day 1 Present</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#0066cc', margin: 0 }}>{stats.day1Present}</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Day 2 Present</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#17a2b8', margin: 0 }}>{stats.day2Present}</p>
          </div>
        </div>

        {/* QR Scanner */}
        <div style={{
          background: '#ffffff',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '20px',
          border: '1px solid #e0e0e0',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#333' }}>
            Scan QR Code / Enter Ticket Number
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Scan or enter ticket number..."
              value={scannedTicket}
              onChange={(e) => setScannedTicket(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              style={{
                flex: 1,
                minWidth: '250px',
                padding: '12px 16px',
                border: '1px solid #d0d0d0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              autoFocus
            />
            <button
              onClick={() => setScanningFor('day1')}
              style={{
                padding: '12px 24px',
                backgroundColor: scanningFor === 'day1' ? '#0066cc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Day 1
            </button>
            <button
              onClick={() => setScanningFor('day2')}
              style={{
                padding: '12px 24px',
                backgroundColor: scanningFor === 'day2' ? '#17a2b8' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Day 2
            </button>
            <button
              onClick={handleScan}
              disabled={!scannedTicket || !scanningFor}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: scannedTicket && scanningFor ? 'pointer' : 'not-allowed',
                opacity: scannedTicket && scanningFor ? 1 : 0.6,
              }}
            >
              Mark Present
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '20px',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>S.No</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>Mobile</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>Ticket No</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>Payment</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>Day 1</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600' }}>Day 2</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, index) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{index + 1}</td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.name}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <a href={`tel:${reg.mobile_number}`} style={{
                      color: '#0066cc',
                      textDecoration: 'none',
                      fontWeight: '600',
                    }}>
                      📞 {reg.mobile_number}
                    </a>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#ff6600' }}>{reg.ticket_no}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      backgroundColor: reg.payment_status === 'SUCCESS' ? '#28a745' : '#ffc107',
                      color: reg.payment_status === 'SUCCESS' ? 'white' : '#000',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {reg.payment_status === 'SUCCESS' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '1.5rem',
                      color: reg.day1_present ? '#28a745' : '#ccc',
                    }}>
                      {reg.day1_present ? '✓' : '○'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '1.5rem',
                      color: reg.day2_present ? '#28a745' : '#ccc',
                    }}>
                      {reg.day2_present ? '✓' : '○'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {registrations.length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              No registrations found for this category
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p>Loading...</p>
      </div>
    }>
      <CategoryContent />
    </Suspense>
  )
}
