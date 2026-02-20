'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SeatMonitoring() {
  const router = useRouter()
  const [seatData, setSeatData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/admin')
      return
    }

    fetchSeatData()
    // Refresh every 10 seconds
    const interval = setInterval(fetchSeatData, 10000)
    return () => clearInterval(interval)
  }, [router])

  const fetchSeatData = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/seat_availability/')
      if (response.ok) {
        const data = await response.json()
        setSeatData(data)
        setRegistrationEnabled(data.registration_enabled)
      }
    } catch (error) {
      console.error('Error fetching seat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRegistration = async () => {
    setUpdating(true)
    try {
      const token = localStorage.getItem('access_token')
      console.log('Token:', token ? 'exists' : 'missing')

      const response = await fetch('https://api.bnievent.rfidpro.in/api/settings/1/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          registration_enabled: !registrationEnabled
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        setRegistrationEnabled(!registrationEnabled)
        fetchSeatData() // Refresh data
        alert('Registration status updated successfully!')
      } else {
        const errorMsg = data.error || data.detail || 'Failed to update registration status'
        console.error('Update failed:', errorMsg)
        alert(`Failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error toggling registration:', error)
      alert('Error updating registration status: ' + error)
    } finally {
      setUpdating(false)
    }
  }

  const getPercentage = (booked: number, capacity: number) => {
    return Math.round((booked / capacity) * 100)
  }

  const getColorByPercentage = (percentage: number) => {
    if (percentage >= 80) return '#e74c3c' // Red
    if (percentage >= 60) return '#f39c12' // Orange
    return '#27ae60' // Green
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
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading seat data...</p>
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
              onClick={() => router.push('/admin/dashboard')}
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
              ← Back to Dashboard
            </button>
            <button
              onClick={toggleRegistration}
              disabled={updating}
              style={{
                padding: '12px 24px',
                backgroundColor: registrationEnabled ? '#e74c3c' : '#27ae60',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: updating ? 'not-allowed' : 'pointer',
                opacity: updating ? 0.6 : 1,
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (!updating) {
                  e.currentTarget.style.backgroundColor = registrationEnabled ? '#c0392b' : '#229954'
                }
              }}
              onMouseOut={(e) => {
                if (!updating) {
                  e.currentTarget.style.backgroundColor = registrationEnabled ? '#e74c3c' : '#27ae60'
                }
              }}
            >
              {updating ? 'Updating...' : (registrationEnabled ? '✗ Close Registration' : '✓ Open Registration')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '20px',
          color: '#333',
          fontFamily: "'Inter', sans-serif",
        }}>
          Seat Monitoring & Availability
        </h2>

        {/* Overall Statistics */}
        {seatData && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}>
              {/* Total Capacity */}
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
                  Total Capacity
                </h3>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: '#ff6600',
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {seatData.total.capacity}
                </p>
              </div>

              {/* Booked Seats */}
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
                  Booked Seats
                </h3>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: '#0066cc',
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {seatData.total.booked}
                </p>
              </div>

              {/* Available Seats */}
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
                  Available Seats
                </h3>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: '#28a745',
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {seatData.total.remaining}
                </p>
              </div>

              {/* Occupancy Rate */}
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
                  Occupancy Rate
                </h3>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: getColorByPercentage(getPercentage(seatData.total.booked, seatData.total.capacity)),
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {getPercentage(seatData.total.booked, seatData.total.capacity)}%
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
                Category-wise Seat Status
              </h3>

              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Students Category */}
                <div style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderLeft: '4px solid #17a2b8',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333', fontFamily: "'Inter', sans-serif", fontWeight: '600' }}>Students</h3>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      backgroundColor: seatData.categories.STUDENTS.available ? '#28a745' : '#dc3545',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {seatData.categories.STUDENTS.available ? '✓ Available' : '✗ FULL'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Capacity</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.STUDENTS.capacity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Booked</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.STUDENTS.booked}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Remaining</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.STUDENTS.remaining}</div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '25px', backgroundColor: '#dee2e6', borderRadius: '15px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${getPercentage(seatData.categories.STUDENTS.booked, seatData.categories.STUDENTS.capacity)}%`,
                      height: '100%',
                      backgroundColor: getColorByPercentage(getPercentage(seatData.categories.STUDENTS.booked, seatData.categories.STUDENTS.capacity)),
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {getPercentage(seatData.categories.STUDENTS.booked, seatData.categories.STUDENTS.capacity)}%
                    </div>
                  </div>
                </div>

                {/* Public Category */}
                <div style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderLeft: '4px solid #6c757d',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333', fontFamily: "'Inter', sans-serif", fontWeight: '600' }}>Public</h3>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      backgroundColor: seatData.categories.PUBLIC.available ? '#28a745' : '#dc3545',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {seatData.categories.PUBLIC.available ? '✓ Available' : '✗ FULL'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Capacity</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.PUBLIC.capacity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Booked</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.PUBLIC.booked}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Remaining</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.PUBLIC.remaining}</div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '25px', backgroundColor: '#dee2e6', borderRadius: '15px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${getPercentage(seatData.categories.PUBLIC.booked, seatData.categories.PUBLIC.capacity)}%`,
                      height: '100%',
                      backgroundColor: getColorByPercentage(getPercentage(seatData.categories.PUBLIC.booked, seatData.categories.PUBLIC.capacity)),
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {getPercentage(seatData.categories.PUBLIC.booked, seatData.categories.PUBLIC.capacity)}%
                    </div>
                  </div>
                </div>

                {/* BNI Members Category */}
                <div style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderLeft: '4px solid #ff6600',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333', fontFamily: "'Inter', sans-serif", fontWeight: '600' }}>
                      BNI Members (All Chapters)
                    </h3>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      backgroundColor: seatData.categories.BNI.available ? '#28a745' : '#dc3545',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {seatData.categories.BNI.available ? '✓ Available' : '✗ FULL'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Capacity</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.BNI.capacity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Booked</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.BNI.booked}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Remaining</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745', fontFamily: "'Inter', sans-serif" }}>{seatData.categories.BNI.remaining}</div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '25px', backgroundColor: '#dee2e6', borderRadius: '15px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${getPercentage(seatData.categories.BNI.booked, seatData.categories.BNI.capacity)}%`,
                      height: '100%',
                      backgroundColor: getColorByPercentage(getPercentage(seatData.categories.BNI.booked, seatData.categories.BNI.capacity)),
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {getPercentage(seatData.categories.BNI.booked, seatData.categories.BNI.capacity)}%
                    </div>
                  </div>
                  <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#666', fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>
                    * Shared quota for Thalaivas, Chettinad, and Madurai chapters
                  </p>
                </div>
              </div>
            </div>

            {/* Registration Status & Auto-refresh Info */}
            <div style={{
              background: registrationEnabled ? '#d4edda' : '#f8d7da',
              border: `1px solid ${registrationEnabled ? '#c3e6cb' : '#f5c6cb'}`,
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center',
              color: registrationEnabled ? '#155724' : '#721c24',
              fontFamily: "'Inter', sans-serif",
            }}>
              <strong>Registration Status:</strong> {registrationEnabled ? '✓ OPEN - Users can register' : '✗ CLOSED - Registration disabled'}
              <br />
              <small style={{ fontSize: '0.85rem' }}>Auto-refresh: This page updates every 10 seconds</small>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
