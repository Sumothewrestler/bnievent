'use client'

import { useEffect, useState } from 'react'
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
  is_primary_booker: boolean
  primary_booker_name: string | null
  booking_group_id: string | null
  gateway_verified: boolean
}

export default function PaymentReport() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [gatewayFilter, setGatewayFilter] = useState('ALL')

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
      setLoading(true)
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

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const matchesStatus = statusFilter === 'ALL' || reg.payment_status === statusFilter
    const matchesCategory = categoryFilter === 'ALL' || reg.registration_for === categoryFilter
    const matchesGateway = gatewayFilter === 'ALL' ||
      (gatewayFilter === 'VERIFIED' && reg.gateway_verified) ||
      (gatewayFilter === 'MANUAL' && !reg.gateway_verified)
    return matchesStatus && matchesCategory && matchesGateway
  })

  // Calculate statistics
  const totalAmount = filteredRegistrations.reduce((sum, reg) => sum + parseFloat(reg.amount), 0)
  const confirmedAmount = filteredRegistrations
    .filter(r => r.payment_status === 'SUCCESS')
    .reduce((sum, reg) => sum + parseFloat(reg.amount), 0)
  const pendingAmount = filteredRegistrations
    .filter(r => r.payment_status === 'PENDING')
    .reduce((sum, reg) => sum + parseFloat(reg.amount), 0)

  // Group by category
  const categoryStats = [
    'BNI_CHETTINAD',
    'BNI_THALAIVAS',
    'BNI_MADURAI',
    'PUBLIC',
    'STUDENTS'
  ].map(category => {
    const categoryRegs = filteredRegistrations.filter(r => r.registration_for === category)
    const total = categoryRegs.reduce((sum, reg) => sum + parseFloat(reg.amount), 0)
    const confirmed = categoryRegs
      .filter(r => r.payment_status === 'SUCCESS')
      .reduce((sum, reg) => sum + parseFloat(reg.amount), 0)
    return {
      category,
      count: categoryRegs.length,
      total,
      confirmed,
      pending: total - confirmed
    }
  })

  const exportToCSV = () => {
    const headers = [
      'Ticket No',
      'Name',
      'Mobile',
      'Email',
      'Category',
      'Payment Status',
      'Gateway Verified',
      'Amount (₹)',
      'Payment ID',
      'Order ID',
      'Payment Date',
      'Created At'
    ]

    const csvData = filteredRegistrations.map(reg => [
      reg.ticket_no,
      reg.name,
      reg.mobile_number,
      reg.email,
      reg.registration_for || 'N/A',
      reg.payment_status,
      reg.gateway_verified ? 'Yes' : 'No',
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
    a.download = `payment_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
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
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading Payment Report...</p>
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
              <span style={{ color: '#ff0000' }}>PAYMENT</span>{' '}
              <span style={{ color: '#000000' }}>REPORT</span>
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
                fontFamily: "'Inter', sans-serif",
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

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
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

        {/* Summary Cards and Category Breakdown - Side by Side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '20px',
          marginBottom: '25px',
        }}>
          {/* Summary Cards - Compact */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            minWidth: '400px',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ff6600 0%, #ff8c42 100%)',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(255, 102, 0, 0.3)',
              padding: '15px',
              color: 'white',
            }}>
              <h3 style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.9,
              }}>
                Total Registrations
              </h3>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                margin: 0,
              }}>
                {filteredRegistrations.length}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #ff0000 0%, #e63946 100%)',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(255, 0, 0, 0.3)',
              padding: '15px',
              color: 'white',
            }}>
              <h3 style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.9,
              }}>
                Total Amount
              </h3>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                margin: 0,
              }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
              padding: '15px',
              color: 'white',
            }}>
              <h3 style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.9,
              }}>
                Confirmed Amount
              </h3>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                margin: 0,
              }}>
                ₹{confirmedAmount.toLocaleString('en-IN')}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)',
              padding: '15px',
              color: 'white',
            }}>
              <h3 style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.9,
              }}>
                Pending Amount
              </h3>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                margin: 0,
              }}>
                ₹{pendingAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Category Breakdown - Compact */}
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            padding: '15px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#333',
              fontFamily: "'Inter', sans-serif",
            }}>
              Category-wise Payment Breakdown
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: "'Inter', sans-serif",
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '11px', fontWeight: '600', color: '#333' }}>Category</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '11px', fontWeight: '600', color: '#333' }}>Count</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontSize: '11px', fontWeight: '600', color: '#333' }}>Total</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontSize: '11px', fontWeight: '600', color: '#333' }}>Confirmed</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontSize: '11px', fontWeight: '600', color: '#333' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((stat) => (
                    <tr key={stat.category} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                        {stat.category.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', textAlign: 'center', color: '#666' }}>
                        {stat.count}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                        ₹{stat.total.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', textAlign: 'right', fontWeight: '600', color: '#28a745' }}>
                        ₹{stat.confirmed.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', textAlign: 'right', fontWeight: '600', color: '#ffc107' }}>
                        ₹{stat.pending.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Filters and Export */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              minWidth: '180px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="BNI_CHETTINAD">BNI Chettinad</option>
            <option value="BNI_THALAIVAS">BNI Thalaivas</option>
            <option value="BNI_MADURAI">BNI Madurai</option>
            <option value="PUBLIC">Public</option>
            <option value="STUDENTS">Students</option>
          </select>

          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              minWidth: '180px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Payments</option>
            <option value="VERIFIED">🔒 Gateway Verified</option>
            <option value="MANUAL">📝 Manually Marked</option>
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
              marginLeft: 'auto',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
          >
            📊 Export to CSV
          </button>
        </div>

        {/* Payment Details Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '20px',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#333',
            fontFamily: "'Inter', sans-serif",
          }}>
            Payment Details ({filteredRegistrations.length} records)
          </h3>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Inter', sans-serif",
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Ticket No</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Mobile</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Category</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Status</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Gateway</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Amount</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Payment ID</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', color: '#333' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg) => {
                const statusColor = getPaymentStatusColor(reg.payment_status)
                return (
                  <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: '600', color: '#ff6600' }}>
                      {reg.ticket_no}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#333' }}>
                      {reg.name}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#666' }}>
                      {reg.mobile_number}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#0066cc',
                        fontWeight: '500',
                      }}>
                        {reg.registration_for || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '5px 10px',
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'inline-block',
                      }}>
                        {reg.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '18px' }}>
                      {reg.gateway_verified ? '🔒' : '📝'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '700', color: '#333', textAlign: 'right' }}>
                      ₹{parseFloat(reg.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                      {reg.payment_id || '-'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '12px', color: '#666' }}>
                      {new Date(reg.created_at).toLocaleDateString('en-IN')}
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
              No payment records found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
