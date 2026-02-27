'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllFeedback } from '@/lib/api'
import type { EventFeedback, FeedbackListResponse } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  BNI_CHETTINAD: 'BNI Chettinad',
  BNI_THALAIVAS: 'BNI Thalaivas',
  BNI_MADURAI: 'BNI Madurai',
  PUBLIC: 'Public',
  STUDENTS: 'Students',
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: '#999', fontSize: '13px' }}>-</span>
  return (
    <span style={{ color: '#f59e0b', fontSize: '16px' }}>
      {'★'.repeat(rating)}
      <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function NPSBadge({ score, category }: { score: number | null; category: string | null }) {
  if (score === null) return <span style={{ color: '#999', fontSize: '13px' }}>-</span>
  const color = category === 'Promoter' ? '#28a745' : category === 'Passive' ? '#ffc107' : '#dc3545'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <span style={{ fontWeight: '700', fontSize: '14px', color }}>{score}</span>
      <span style={{
        padding: '2px 6px',
        backgroundColor: color,
        color: '#fff',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
      }}>{category}</span>
    </span>
  )
}

function AttendBadge({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#999', fontSize: '13px' }}>-</span>
  const colors: Record<string, string> = { YES: '#28a745', NO: '#dc3545', MAYBE: '#ffc107' }
  const bg = colors[value] || '#6c757d'
  return (
    <span style={{
      padding: '3px 8px',
      backgroundColor: bg,
      color: '#fff',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    }}>
      {value}
    </span>
  )
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [data, setData] = useState<any | null>(null)
  const [feedbackList, setFeedbackList] = useState<EventFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [selectedFeedback, setSelectedFeedback] = useState<EventFeedback | null>(null)
  const [feedbackToDelete, setFeedbackToDelete] = useState<EventFeedback | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchFeedback()
  }, [router])

  const fetchFeedback = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getAllFeedback()
      setData(result)
      setFeedbackList(result.feedback)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error connecting to server'
      if (msg !== 'Unauthorized') setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/feedback/delete/${feedbackToDelete.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setFeedbackToDelete(null)
        fetchFeedback() // Refresh the list
        alert('Feedback deleted successfully')
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        alert('Failed to delete feedback')
      }
    } catch (error) {
      alert('Error connecting to server')
    } finally {
      setDeleting(false)
    }
  }

  const filteredFeedback = feedbackList.filter((fb) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      fb.ticket_no.toLowerCase().includes(term) ||
      fb.attendee_name.toLowerCase().includes(term)

    const matchesCategory =
      categoryFilter === 'ALL' || fb.registration_category === categoryFilter

    const matchesRating =
      ratingFilter === 'ALL' || fb.overall_rating === parseInt(ratingFilter)

    return matchesSearch && matchesCategory && matchesRating
  })

  const exportToCSV = () => {
    const headers = [
      'S.no', 'Ticket No', 'Name', 'Mobile', 'Category', 'Submitted At',
      'Overall Rating', 'Speaker Rating', 'Join BNI?', 'Average Rating',
    ]
    const rows = filteredFeedback.map((fb, i) => [
      i + 1,
      fb.ticket_no,
      fb.attendee_name,
      fb.attendee_mobile,
      CATEGORY_LABELS[fb.registration_category] || fb.registration_category,
      new Date(fb.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      fb.overall_rating,
      fb.speaker_rating ?? '',
      fb.attend_future ?? '',
      fb.average_rating?.toFixed(2) ?? '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        <div style={{ textAlign: 'center', color: '#6f42c1', fontFamily: "'Inter', sans-serif" }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6f42c1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }} />
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading Feedback...</p>
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
      {/* Header */}
      <div style={{
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
            <img src="/ez.gif" alt="BNI Event" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>
              <span style={{ color: '#6f42c1' }}>Event</span>{' '}
              <span style={{ color: '#000000' }}>Feedback</span>
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

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {error && (
          <div style={{
            padding: '12px 16px',
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

        {/* Stats Row */}
        {data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {[
              { label: 'Total Responses', value: data.total_feedback, color: '#6f42c1' },
              { label: 'Avg Overall', value: `${data.average_rating?.toFixed(2) || 0} ★`, color: '#f59e0b' },
              { label: 'Avg Speaker', value: `${data.average_speaker_rating?.toFixed(2) || 0} ★`, color: '#17a2b8' },
              { label: 'Want to Join (Yes)', value: data.join_bni?.yes || 0, color: '#28a745' },
              { label: 'Want to Join (Maybe)', value: data.join_bni?.maybe || 0, color: '#ffc107' },
              { label: 'Want to Join (No)', value: data.join_bni?.no || 0, color: '#dc3545' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                padding: '20px',
                border: '1px solid #e0e0e0',
              }}>
                <p style={{
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#666',
                  margin: '0 0 8px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>{stat.label}</p>
                <p style={{ fontSize: '1.75rem', fontWeight: '700', color: stat.color, margin: 0 }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search by ticket no or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              minWidth: '160px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              minWidth: '140px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>
            ))}
          </select>
          <button
            onClick={exportToCSV}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: '#fff',
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
            Export CSV
          </button>
          <button
            onClick={fetchFeedback}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: '#fff',
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
            Refresh
          </button>
        </div>

        {/* Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '20px',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            Showing <strong>{filteredFeedback.length}</strong> of <strong>{feedbackList.length}</strong> responses
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                {['#', 'Ticket', 'Name', 'Mobile', 'Category', 'Overall', 'Speaker', 'Join BNI?', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 10px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#333',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.map((fb, index) => (
                <tr
                  key={fb.id}
                  style={{ borderBottom: '1px solid #dee2e6', transition: 'background 0.15s' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '10px', fontSize: '13px', color: '#666' }}>{index + 1}</td>
                  <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>{fb.ticket_no}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#333', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.attendee_name}</td>
                  <td style={{ padding: '10px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    <a
                      href={`tel:${fb.attendee_mobile}`}
                      style={{
                        color: '#0066cc',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '500',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      <span style={{ fontSize: '16px' }}>📞</span>
                      {fb.attendee_mobile}
                    </a>
                  </td>
                  <td style={{ padding: '10px', fontSize: '12px', color: '#555', whiteSpace: 'nowrap' }}>
                    {CATEGORY_LABELS[fb.registration_category] || fb.registration_category}
                  </td>
                  <td style={{ padding: '10px' }}><StarDisplay rating={fb.overall_rating} /></td>
                  <td style={{ padding: '10px' }}><StarDisplay rating={fb.speaker_rating} /></td>
                  <td style={{ padding: '10px' }}><AttendBadge value={fb.attend_future} /></td>
                  <td style={{ padding: '10px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                    {new Date(fb.submitted_at).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedFeedback(fb)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#6f42c1',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
                    >
                      View
                    </button>
                    <button
                      onClick={() => setFeedbackToDelete(fb)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredFeedback.length === 0 && (
            <p style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
              fontSize: '15px',
            }}>
              {feedbackList.length === 0 ? 'No feedback submitted yet.' : 'No feedback matches the current filters.'}
            </p>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1a1a1a' }}>
                  {selectedFeedback.attendee_name}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                  Ticket: <strong>{selectedFeedback.ticket_no}</strong> &nbsp;|&nbsp;
                  {CATEGORY_LABELS[selectedFeedback.registration_category] || selectedFeedback.registration_category}
                </p>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Ratings Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}>
              {[
                { label: 'Overall Experience', value: selectedFeedback.overall_rating },
                { label: 'Speaker Quality', value: selectedFeedback.speaker_rating },
              ].map((r) => (
                <div key={r.label} style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>{r.label}</p>
                  <StarDisplay rating={r.value} />
                </div>
              ))}
            </div>

            {/* Join BNI & Average */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', flex: 1 }}>
                <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Willing to Join BNI?</p>
                <AttendBadge value={selectedFeedback.attend_future} />
              </div>
              <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', flex: 1 }}>
                <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Average Rating</p>
                <span style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>
                  {selectedFeedback.average_rating?.toFixed(2) || 'N/A'} ★
                </span>
              </div>
            </div>

            <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#999', textAlign: 'right' }}>
              Submitted: {new Date(selectedFeedback.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {feedbackToDelete && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px',
        }}
          onClick={() => !deleting && setFeedbackToDelete(null)}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '450px',
            width: '100%',
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 10px 0', color: '#dc3545' }}>
                Delete Feedback?
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#666', margin: 0, lineHeight: '1.5' }}>
                Are you sure you want to delete feedback from <strong>{feedbackToDelete.attendee_name}</strong> (Ticket: {feedbackToDelete.ticket_no})? This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setFeedbackToDelete(null)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (!deleting) e.currentTarget.style.backgroundColor = '#5a6268'
                }}
                onMouseOut={(e) => {
                  if (!deleting) e.currentTarget.style.backgroundColor = '#6c757d'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFeedback}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: deleting ? '#cccccc' : '#dc3545',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (!deleting) e.currentTarget.style.backgroundColor = '#c82333'
                }}
                onMouseOut={(e) => {
                  if (!deleting) e.currentTarget.style.backgroundColor = '#dc3545'
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
