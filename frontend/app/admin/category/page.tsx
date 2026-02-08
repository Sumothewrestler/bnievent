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
}

interface ScanLog {
  id: number
  ticket_no: string
  action: string
  scanned_at: string
  scanned_by: string | null
  registration: number | null
}

function CategoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [category, setCategory] = useState<string>('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
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
      fetchData(token, cat)
    } else {
      router.replace('/admin/dashboard')
    }

    // Generate current week dates (last 7 days including today)
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date)
    }
    setWeekDates(dates)
    setSelectedDate(dates[dates.length - 1]) // Default to today
  }, [searchParams, router])

  const fetchData = async (token: string, cat: string) => {
    try {
      // Fetch registrations
      const regResponse = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (regResponse.ok) {
        const data = await regResponse.json()
        const filtered = data.filter((reg: Registration) => {
          if (cat === 'NOT_SPECIFIED') {
            return !reg.registration_for || reg.registration_for === ''
          }
          return reg.registration_for === cat
        })
        setRegistrations(filtered)
      } else if (regResponse.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
        return
      } else {
        setError('Failed to fetch registrations')
      }

      // Fetch scan logs
      const logsResponse = await fetch('https://api.bnievent.rfidpro.in/api/scan-logs/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (logsResponse.ok) {
        const logs = await logsResponse.json()
        // Filter only CHECK_IN actions
        setScanLogs(logs.filter((log: ScanLog) => log.action === 'CHECK_IN'))
      }
    } catch (error) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPresent = async (ticketNo: string) => {
    if (!selectedDate) {
      alert('Please select a date first!')
      return
    }

    const token = localStorage.getItem('access_token')
    const registration = registrations.find(r => r.ticket_no === ticketNo.trim())

    if (!registration) {
      alert('Ticket not found in this category!')
      return
    }

    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/scan-logs/log_scan/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_no: ticketNo.trim(),
          action: 'CHECK_IN',
          notes: `Manual check-in by ${localStorage.getItem('username') || 'admin'}`
        }),
      })

      if (response.ok) {
        const newLog = await response.json()
        setScanLogs([...scanLogs, newLog])
        alert(`✓ Marked ${registration.name} as present!`)
        setScannedTicket('')
        // Reload page to refresh data
        window.location.reload()
      } else {
        alert('Failed to mark attendance')
      }
    } catch (error) {
      alert('Error marking attendance')
    }
  }

  const isPresent = (ticketNo: string, date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0]
    return scanLogs.some(log => {
      const logDate = new Date(log.scanned_at).toISOString().split('T')[0]
      return log.ticket_no === ticketNo && logDate === dateStr
    })
  }

  const getAttendanceCount = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0]
    const attendedTickets = new Set<string>()

    scanLogs.forEach(log => {
      const logDate = new Date(log.scanned_at).toISOString().split('T')[0]
      if (logDate === dateStr && registrations.some(r => r.ticket_no === log.ticket_no)) {
        attendedTickets.add(log.ticket_no)
      }
    })

    return attendedTickets.size
  }

  const stats = {
    total: registrations.length,
    paid: registrations.filter(r => r.payment_status === 'SUCCESS').length,
    pending: registrations.filter(r => r.payment_status === 'PENDING').length,
    todayPresent: selectedDate ? getAttendanceCount(selectedDate) : 0,
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
          maxWidth: '1600px',
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
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 20px' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '20px',
          color: '#333',
        }}>
          {categoryNames[category] || category} - Attendance Calendar
        </h2>

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '25px',
        }}>
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Registrations</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#ff6600', margin: 0 }}>{stats.total}</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#28a745', margin: 0 }}>{stats.paid}</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Attendance</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#0066cc', margin: 0 }}>{stats.todayPresent}</p>
          </div>
        </div>

        {/* Week Calendar Selector */}
        <div style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '20px',
          border: '1px solid #e0e0e0',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#333' }}>
            Select Date
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {weekDates.map((date, index) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString()
              const isToday = new Date().toDateString() === date.toDateString()
              const attendanceCount = getAttendanceCount(date)

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    flex: '1',
                    minWidth: '120px',
                    padding: '15px 10px',
                    background: isSelected ? '#ff6600' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#333',
                    border: isToday ? '3px solid #28a745' : '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f8f9fa'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#ffffff'
                    }
                  }}
                >
                  <div style={{ fontSize: '11px', marginBottom: '5px', opacity: 0.8 }}>
                    {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '5px' }}>
                    {date.getDate()} {date.toLocaleDateString('en-IN', { month: 'short' })}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {attendanceCount}/{stats.total}
                  </div>
                  {isToday && (
                    <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '700', color: isSelected ? '#fff' : '#28a745' }}>
                      TODAY
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* QR Scanner */}
        <div style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '20px',
          border: '1px solid #e0e0e0',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#333' }}>
            Mark Attendance for {selectedDate ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Scan or enter ticket number..."
              value={scannedTicket}
              onChange={(e) => setScannedTicket(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && scannedTicket && handleMarkPresent(scannedTicket)}
              style={{
                flex: 1,
                minWidth: '300px',
                padding: '14px 16px',
                border: '2px solid #d0d0d0',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
              }}
              autoFocus
            />
            <button
              onClick={() => scannedTicket && handleMarkPresent(scannedTicket)}
              disabled={!scannedTicket}
              style={{
                padding: '14px 30px',
                backgroundColor: scannedTicket ? '#28a745' : '#e0e0e0',
                color: scannedTicket ? '#ffffff' : '#999',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: scannedTicket ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              ✓ Mark Present
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '20px',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', color: '#333' }}>
            Weekly Attendance Sheet
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 1 }}>S.No</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', position: 'sticky', left: '50px', background: '#f8f9fa', zIndex: 1, minWidth: '180px' }}>Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '120px' }}>Mobile</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '110px' }}>Ticket No</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '80px' }}>Payment</th>
                {weekDates.map((date, index) => (
                  <th key={index} style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontSize: '11px',
                    fontWeight: '600',
                    minWidth: '70px',
                    background: selectedDate?.toDateString() === date.toDateString() ? '#fff3cd' : '#f8f9fa',
                  }}>
                    <div>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '4px' }}>{date.getDate()}/{date.getMonth() + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, index) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#333', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>{index + 1}</td>
                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#333', fontWeight: '600', position: 'sticky', left: '50px', background: '#fff', zIndex: 1 }}>{reg.name}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px' }}>
                    <a href={`tel:${reg.mobile_number}`} style={{
                      color: '#0066cc',
                      textDecoration: 'none',
                      fontWeight: '600',
                    }}>
                      {reg.mobile_number}
                    </a>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#ff6600' }}>{reg.ticket_no}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: reg.payment_status === 'SUCCESS' ? '#28a745' : '#ffc107',
                      color: reg.payment_status === 'SUCCESS' ? 'white' : '#000',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {reg.payment_status === 'SUCCESS' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  {weekDates.map((date, dateIndex) => {
                    const present = isPresent(reg.ticket_no, date)
                    const isSelectedDay = selectedDate?.toDateString() === date.toDateString()

                    return (
                      <td key={dateIndex} style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        background: isSelectedDay ? '#fff9e6' : '#fff',
                      }}>
                        <span style={{
                          fontSize: '1.5rem',
                          color: present ? '#28a745' : '#ddd',
                          fontWeight: '700',
                        }}>
                          {present ? '✓' : '○'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f8f9fa', fontWeight: '700' }}>
                <td colSpan={5} style={{ padding: '12px 8px', textAlign: 'right', fontSize: '13px', borderTop: '2px solid #dee2e6' }}>
                  Daily Total:
                </td>
                {weekDates.map((date, index) => (
                  <td key={index} style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0066cc',
                    borderTop: '2px solid #dee2e6',
                  }}>
                    {getAttendanceCount(date)}
                  </td>
                ))}
              </tr>
            </tfoot>
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
