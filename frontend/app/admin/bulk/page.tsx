'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Registration {
  id: number
  ticket_no: string
  name: string
  mobile_number: string | null
  email: string | null
  age: number | null
  location: string | null
  company_name: string | null
  registration_for: string
  payment_status: string
  amount: number
  is_primary_booker: boolean
}

interface BulkGroup {
  booking_group_id: string
  primary_booker: {
    id: number
    name: string
    email: string | null
    mobile: string | null
    ticket_no: string
  }
  total_attendees: number
  additional_count: number
  total_amount: number
  payment_status: string
  category_breakdown: { [key: string]: number }
  created_at: string
  registrations: Registration[]
}

export default function BulkRegistrationsAdmin() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [bulkGroups, setBulkGroups] = useState<BulkGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('PAID') // Default to PUBLIC + STUDENTS only
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchBulkRegistrations(token)
  }, [router])

  const fetchBulkRegistrations = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('https://api.bnievent.rfidpro.in/api/bulk-registrations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBulkGroups(data.bulk_groups || [])
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        setError('Failed to fetch bulk registrations')
      }
    } catch (error) {
      setError('Error connecting to server')
      console.error('Error fetching bulk registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/admin')
  }

  const toggleGroupExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const filteredGroups = bulkGroups.filter(group => {
    const matchesSearch =
      group.primary_booker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.booking_group_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.primary_booker.mobile && group.primary_booker.mobile.includes(searchTerm))

    const matchesPayment = paymentFilter === 'ALL' || group.payment_status === paymentFilter

    let matchesCategory = false
    if (categoryFilter === 'ALL') {
      matchesCategory = true
    } else if (categoryFilter === 'PAID') {
      // Show only PUBLIC and STUDENTS (exclude BNI members)
      matchesCategory = Object.keys(group.category_breakdown).some(cat =>
        cat.includes('PUBLIC') || cat.includes('STUDENTS')
      )
    } else {
      matchesCategory = Object.keys(group.category_breakdown).some(cat => cat.includes(categoryFilter))
    }

    return matchesSearch && matchesPayment && matchesCategory
  })

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { bg: '#28a745', text: 'white' }
      case 'PENDING':
        return { bg: '#ffc107', text: '#000' }
      case 'FAILED':
        return { bg: '#dc3545', text: 'white' }
      case 'MIXED':
        return { bg: '#6f42c1', text: 'white' }
      default:
        return { bg: '#6c757d', text: 'white' }
    }
  }

  const getCategoryColor = (category: string) => {
    if (category.includes('STUDENTS')) {
      return { bg: '#17a2b8', text: 'white' }
    } else if (category.includes('PUBLIC')) {
      return { bg: '#28a745', text: 'white' }
    } else if (category.includes('BNI')) {
      return { bg: '#ff6600', text: 'white' }
    }
    return { bg: '#6c757d', text: 'white' }
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
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading Bulk Registrations...</p>
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
              <span style={{ color: '#ff6600' }}>Bulk</span>{' '}
              <span style={{ color: '#000000' }}>Registrations</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6f42c1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
            >
              ← Dashboard
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

      {/* Main Content */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 20px' }}>
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

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            padding: '20px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              Bulk Bookings
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ff6600',
              margin: 0,
            }}>
              {bulkGroups.length}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            padding: '20px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              Total Attendees
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#28a745',
              margin: 0,
            }}>
              {bulkGroups.reduce((sum, group) => sum + group.total_attendees, 0)}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            padding: '20px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              Total Revenue
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#0066cc',
              margin: 0,
            }}>
              ₹{bulkGroups.reduce((sum, group) => sum + group.total_amount, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <input
            type="text"
            placeholder="Search by name, booking ID, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '10px 14px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '150px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="MIXED">Mixed</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '180px',
              cursor: 'pointer',
            }}
          >
            <option value="PAID">Public + Students</option>
            <option value="ALL">All Categories</option>
            <option value="STUDENTS">Students Only</option>
            <option value="PUBLIC">Public Only</option>
            <option value="BNI">BNI Members Only</option>
          </select>
        </div>

        {/* Bulk Groups Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333', width: '40px' }}></th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Booking ID</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Primary Booker</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Mobile</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Attendees</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Categories</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#333' }}>Amount</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Status</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(group => {
                const isExpanded = expandedGroups.has(group.booking_group_id)
                const statusColor = getPaymentStatusColor(group.payment_status)

                return (
                  <>
                    {/* Main Row */}
                    <tr
                      key={group.booking_group_id}
                      style={{
                        borderBottom: '1px solid #e0e0e0',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => toggleGroupExpand(group.booking_group_id)}
                    >
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '16px',
                          color: '#666',
                          transition: 'transform 0.3s ease',
                          display: 'inline-block',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}>
                          ▶
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                        {group.booking_group_id}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '600', color: '#333' }}>
                        {group.primary_booker.name}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#666' }}>
                        {group.primary_booker.mobile || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                        {group.total_attendees}
                        {group.additional_count > 0 && (
                          <span style={{ fontSize: '11px', color: '#28a745', marginLeft: '4px' }}>
                            (+{group.additional_count})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {Object.entries(group.category_breakdown).map(([cat, count]) => {
                            const catColor = getCategoryColor(cat)
                            return (
                              <span
                                key={cat}
                                style={{
                                  padding: '3px 6px',
                                  backgroundColor: catColor.bg,
                                  color: catColor.text,
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                }}
                              >
                                {cat.replace('BNI_', '').replace('_', ' ')}: {count}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                        ₹{group.total_amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {group.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#666', fontSize: '12px' }}>
                        {new Date(group.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, backgroundColor: '#f8f9fa' }}>
                          <div style={{ padding: '15px 20px', borderTop: '2px solid #dee2e6' }}>
                            <h4 style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              marginBottom: '12px',
                              color: '#333',
                            }}>
                              All Attendees in Booking Group {group.booking_group_id}
                            </h4>

                            {/* Nested Table for Details */}
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '12px',
                              backgroundColor: '#fff',
                              border: '1px solid #e0e0e0',
                              borderRadius: '6px',
                              overflow: 'hidden',
                            }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666', width: '80px' }}>Type</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Ticket</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Name</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Mobile</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Email</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Category</th>
                                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Amount</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.registrations.map((reg) => (
                                  <tr
                                    key={reg.id}
                                    style={{
                                      borderBottom: '1px solid #e0e0e0',
                                      backgroundColor: reg.is_primary_booker ? '#e8f5e9' : 'transparent'
                                    }}
                                  >
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 8px',
                                        background: reg.is_primary_booker ? '#4caf50' : '#9e9e9e',
                                        color: 'white',
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                      }}>
                                        {reg.is_primary_booker ? 'PRIMARY' : 'GUEST'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: '600', color: '#333', fontFamily: 'monospace' }}>
                                      {reg.ticket_no}
                                    </td>
                                    <td style={{ padding: '10px', color: '#333' }}>
                                      {reg.name}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666' }}>
                                      {reg.mobile_number || 'N/A'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666', fontSize: '11px' }}>
                                      {reg.email || 'N/A'}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 6px',
                                        backgroundColor: getCategoryColor(reg.registration_for).bg,
                                        color: getCategoryColor(reg.registration_for).text,
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                      }}>
                                        {reg.registration_for.replace('BNI_', '').replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                                      ₹{reg.amount.toLocaleString()}
                                      {reg.is_primary_booker && group.total_attendees > 1 &&
                                       (reg.registration_for === 'PUBLIC' || reg.registration_for === 'STUDENTS') && (
                                        <span style={{
                                          fontSize: '10px',
                                          color: '#666',
                                          marginLeft: '4px',
                                          fontWeight: 'normal'
                                        }}>
                                          (For {group.total_attendees})
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 8px',
                                        backgroundColor: getPaymentStatusColor(reg.payment_status).bg,
                                        color: getPaymentStatusColor(reg.payment_status).text,
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                      }}>
                                        {reg.payment_status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>

          {filteredGroups.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
            }}>
              <p style={{ fontSize: '16px', margin: 0 }}>No bulk registrations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
