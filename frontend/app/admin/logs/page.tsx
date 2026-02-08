'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ScanLog {
  id: number
  ticket_no: string
  registration_name: string | null
  registration_mobile: string | null
  registration_email: string | null
  payment_status: string | null
  action: string
  scanned_at: string
  scanned_by: string | null
  notes: string | null
}

export default function ScanLogs() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchLogs(token)
  }, [router])

  const fetchLogs = async (token: string) => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/scan-logs/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        setError('Failed to fetch logs')
      }
    } catch (error) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'SCAN_SUCCESS':
      case 'CHECK_IN':
        return { bg: '#28a745', text: 'white' }
      case 'SCAN_FAILED':
        return { bg: '#dc3545', text: 'white' }
      default:
        return { bg: '#6c757d', text: 'white' }
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.registration_name && log.registration_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.registration_mobile && log.registration_mobile.includes(searchTerm)) ||
      (log.scanned_by && log.scanned_by.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  const exportToCSV = () => {
    const headers = ['Ticket No', 'Name', 'Mobile', 'Email', 'Payment Status', 'Action', 'Scanned At', 'Scanned By', 'Notes']
    const csvData = filteredLogs.map(log => [
      log.ticket_no,
      log.registration_name || 'N/A',
      log.registration_mobile || 'N/A',
      log.registration_email || 'N/A',
      log.payment_status || 'N/A',
      log.action,
      new Date(log.scanned_at).toLocaleString(),
      log.scanned_by || 'N/A',
      log.notes || ''
    ])

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scan_logs_${new Date().toISOString().split('T')[0]}.csv`
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
              <span style={{ color: '#ff0000' }}>Scan</span>{' '}
              <span style={{ color: '#000000' }}>Logs</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
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
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0052a3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0066cc'}
            >
              ← Back to Dashboard
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
            placeholder="Search by ticket no, name, mobile or scanned by..."
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
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
            <option value="ALL">All Actions</option>
            <option value="SCAN_SUCCESS">Scan Success</option>
            <option value="CHECK_IN">Check In</option>
            <option value="SCAN_FAILED">Scan Failed</option>
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

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: '20px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Total Scans
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ff6600',
              margin: 0,
            }}>
              {logs.length}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: '20px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Successful
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#28a745',
              margin: 0,
            }}>
              {logs.filter(l => l.action === 'SCAN_SUCCESS' || l.action === 'CHECK_IN').length}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: '20px',
            border: '1px solid #e0e0e0',
          }}>
            <h3 style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Failed
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#dc3545',
              margin: 0,
            }}>
              {logs.filter(l => l.action === 'SCAN_FAILED').length}
            </p>
          </div>
        </div>

        {/* Logs Table */}
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
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Payment</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Scanned At</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Scanned By</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const actionColor = getActionColor(log.action)
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#333' }}>{log.ticket_no}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{log.registration_name || 'N/A'}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{log.registration_mobile || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      {log.payment_status && (
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: log.payment_status === 'SUCCESS' ? '#28a745' : '#ffc107',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#fff',
                          fontWeight: '500',
                        }}>
                          {log.payment_status}
                        </span>
                      )}
                      {!log.payment_status && 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '5px 12px',
                        backgroundColor: actionColor.bg,
                        color: actionColor.text,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block',
                      }}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {new Date(log.scanned_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>{log.scanned_by || 'N/A'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <p style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
              fontSize: '15px',
              fontFamily: "'Inter', sans-serif",
            }}>
              No scan logs found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
