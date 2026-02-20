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
  location: string
  company_name: string
  registration_for: string
  sponsor_type: string | null
  payment_status: string
  amount: string
  booking_group_id: string | null
  is_primary_booker: boolean
  primary_booker_name: string | null
  primary_booker_mobile: string | null
  primary_booker_email: string | null
  created_at: string
  updated_at: string
}

interface BookingGroup {
  booking_group_id: string
  primary_member: Registration
  additional_members: Registration[]
  total_tickets: number
  member_name: string
  chapter: string
  created_at: string
}

export default function BNIBookingsAdmin() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [bookingGroups, setBookingGroups] = useState<BookingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chapterFilter, setChapterFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [confirmingTicket, setConfirmingTicket] = useState<number | null>(null)

  const chapters = [
    { value: 'ALL', label: 'All Chapters' },
    { value: 'BNI_CHETTINAD', label: 'BNI Chettinad' },
    { value: 'BNI_THALAIVAS', label: 'BNI Thalaivas' },
    { value: 'BNI_MADURAI', label: 'BNI Madurai' },
  ]

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchBNIBookings(token)
  }, [router])

  const fetchBNIBookings = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data: Registration[] = await response.json()

        // Filter only BNI registrations with booking groups
        const bniRegs = data.filter(reg =>
          (reg.registration_for === 'BNI_CHETTINAD' ||
           reg.registration_for === 'BNI_THALAIVAS' ||
           reg.registration_for === 'BNI_MADURAI') &&
          reg.booking_group_id
        )

        // Group by booking_group_id
        const groups = new Map<string, Registration[]>()
        bniRegs.forEach(reg => {
          if (reg.booking_group_id) {
            if (!groups.has(reg.booking_group_id)) {
              groups.set(reg.booking_group_id, [])
            }
            groups.get(reg.booking_group_id)!.push(reg)
          }
        })

        // Convert to BookingGroup format
        const bookingGroupsData: BookingGroup[] = Array.from(groups.entries()).map(([groupId, regs]) => {
          const primary = regs.find(r => r.is_primary_booker) || regs[0]
          const additional = regs.filter(r => !r.is_primary_booker)

          return {
            booking_group_id: groupId,
            primary_member: primary,
            additional_members: additional,
            total_tickets: regs.length,
            member_name: primary.name,
            chapter: primary.registration_for,
            created_at: primary.created_at
          }
        })

        // Sort by Primary Member name alphabetically (A to Z)
        bookingGroupsData.sort((a, b) =>
          a.member_name.localeCompare(b.member_name)
        )

        setBookingGroups(bookingGroupsData)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        setError('Failed to fetch BNI bookings')
      }
    } catch (error) {
      setError('Error connecting to server')
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmTicket = async (registrationId: number) => {
    if (!confirm('Confirm this ticket? This will mark it as SUCCESS.')) {
      return
    }

    const token = localStorage.getItem('access_token')
    setConfirmingTicket(registrationId)

    try {
      console.log('Confirming ticket:', registrationId)
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${registrationId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: 'SUCCESS'
        }),
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (response.ok) {
        alert('Ticket confirmed successfully! Status updated to SUCCESS.')
        // Refresh bookings to show updated status
        fetchBNIBookings(token!)
      } else {
        console.error('Failed to confirm:', responseData)
        alert(`Failed to confirm ticket: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error confirming ticket:', error)
      alert(`Error confirming ticket: ${error}`)
    } finally {
      setConfirmingTicket(null)
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

  const filteredGroups = bookingGroups.filter(group => {
    const matchesChapter = chapterFilter === 'ALL' || group.chapter === chapterFilter
    const matchesSearch =
      group.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.primary_member.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.primary_member.mobile_number && group.primary_member.mobile_number.includes(searchTerm))

    return matchesChapter && matchesSearch
  })

  const getChapterColor = (chapter: string) => {
    switch (chapter) {
      case 'BNI_CHETTINAD':
        return { bg: '#ff6600', text: 'white' }
      case 'BNI_THALAIVAS':
        return { bg: '#ff0000', text: 'white' }
      case 'BNI_MADURAI':
        return { bg: '#0066cc', text: 'white' }
      default:
        return { bg: '#6c757d', text: 'white' }
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
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading BNI Bookings...</p>
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
              <span style={{ color: '#ff0000' }}>BNI</span>{' '}
              <span style={{ color: '#000000' }}>Member Bookings</span>
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
              Booking Groups
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ff6600',
              margin: 0,
            }}>
              {bookingGroups.length}
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
              Total Tickets
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#28a745',
              margin: 0,
            }}>
              {bookingGroups.reduce((sum, group) => sum + group.total_tickets, 0)}
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
              Additional Members
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#0066cc',
              margin: 0,
            }}>
              {bookingGroups.reduce((sum, group) => sum + group.additional_members.length, 0)}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <input
            type="text"
            placeholder="Search by name, ticket no, or mobile..."
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
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '180px',
              cursor: 'pointer',
            }}
          >
            {chapters.map(chapter => (
              <option key={chapter.value} value={chapter.value}>
                {chapter.label}
              </option>
            ))}
          </select>
        </div>

        {/* Compact Table */}
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
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Primary Member</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Ticket</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Mobile</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Chapter</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Total</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Additional</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Status</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Date</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(group => {
                const isExpanded = expandedGroups.has(group.booking_group_id)
                const chapterColor = getChapterColor(group.chapter)
                const statusColor = getPaymentStatusColor(group.primary_member.payment_status)

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
                      <td style={{ padding: '12px 8px', fontWeight: '600', color: '#333' }}>
                        {group.member_name}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#666' }}>
                        {group.primary_member.ticket_no}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#666' }}>
                        {group.primary_member.mobile_number || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: chapterColor.bg,
                          color: chapterColor.text,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {group.chapter.replace('BNI_', '')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                        {group.total_tickets}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#28a745' }}>
                        {group.additional_members.length}
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
                          {group.primary_member.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#666', fontSize: '12px' }}>
                        {new Date(group.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {group.primary_member.payment_status === 'PENDING' && (
                          <button
                            onClick={() => handleConfirmTicket(group.primary_member.id)}
                            disabled={confirmingTicket === group.primary_member.id}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: confirmingTicket === group.primary_member.id ? '#ccc' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: confirmingTicket === group.primary_member.id ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                              if (confirmingTicket !== group.primary_member.id) {
                                e.currentTarget.style.backgroundColor = '#218838'
                              }
                            }}
                            onMouseOut={(e) => {
                              if (confirmingTicket !== group.primary_member.id) {
                                e.currentTarget.style.backgroundColor = '#28a745'
                              }
                            }}
                          >
                            {confirmingTicket === group.primary_member.id ? 'Confirming...' : 'Confirm'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0, backgroundColor: '#f8f9fa' }}>
                          <div style={{ padding: '15px 20px', borderTop: '2px solid #dee2e6' }}>
                            <h4 style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              marginBottom: '12px',
                              color: '#333',
                            }}>
                              All Members in this Booking Group
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
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Age</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Email</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Company</th>
                                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Status</th>
                                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Primary Member */}
                                <tr style={{ backgroundColor: '#e8f5e9', borderBottom: '1px solid #c8e6c9' }}>
                                  <td style={{ padding: '10px' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      background: '#4caf50',
                                      color: 'white',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                    }}>
                                      PRIMARY
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px', fontWeight: '600', color: '#333' }}>
                                    {group.primary_member.ticket_no}
                                  </td>
                                  <td style={{ padding: '10px', color: '#333' }}>
                                    {group.primary_member.name}
                                  </td>
                                  <td style={{ padding: '10px', color: '#666' }}>
                                    {group.primary_member.mobile_number || 'N/A'}
                                  </td>
                                  <td style={{ padding: '10px', color: '#666' }}>
                                    {group.primary_member.age || 'Not provided'}
                                  </td>
                                  <td style={{ padding: '10px', color: '#666' }}>
                                    {group.primary_member.email || 'N/A'}
                                  </td>
                                  <td style={{ padding: '10px', color: '#666' }}>
                                    {group.primary_member.company_name}
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      backgroundColor: getPaymentStatusColor(group.primary_member.payment_status).bg,
                                      color: getPaymentStatusColor(group.primary_member.payment_status).text,
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                    }}>
                                      {group.primary_member.payment_status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {group.primary_member.payment_status === 'PENDING' && (
                                      <button
                                        onClick={() => handleConfirmTicket(group.primary_member.id)}
                                        disabled={confirmingTicket === group.primary_member.id}
                                        style={{
                                          padding: '5px 10px',
                                          backgroundColor: confirmingTicket === group.primary_member.id ? '#ccc' : '#28a745',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '3px',
                                          fontSize: '10px',
                                          fontWeight: '600',
                                          cursor: confirmingTicket === group.primary_member.id ? 'not-allowed' : 'pointer',
                                        }}
                                      >
                                        {confirmingTicket === group.primary_member.id ? 'Confirming...' : 'Confirm'}
                                      </button>
                                    )}
                                  </td>
                                </tr>

                                {/* Additional Members */}
                                {group.additional_members.map((member, index) => (
                                  <tr key={member.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 8px',
                                        background: '#9e9e9e',
                                        color: 'white',
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                      }}>
                                        ADDITIONAL
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: '600', color: '#333' }}>
                                      {member.ticket_no}
                                    </td>
                                    <td style={{ padding: '10px', color: '#333' }}>
                                      {member.name}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666' }}>
                                      {member.mobile_number || 'Not provided'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666' }}>
                                      {member.age || 'Not provided'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666' }}>
                                      {member.email || 'Not provided'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666' }}>
                                      {member.company_name}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 8px',
                                        backgroundColor: getPaymentStatusColor(member.payment_status).bg,
                                        color: getPaymentStatusColor(member.payment_status).text,
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                      }}>
                                        {member.payment_status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {member.payment_status === 'PENDING' && (
                                        <button
                                          onClick={() => handleConfirmTicket(member.id)}
                                          disabled={confirmingTicket === member.id}
                                          style={{
                                            padding: '5px 10px',
                                            backgroundColor: confirmingTicket === member.id ? '#ccc' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            cursor: confirmingTicket === member.id ? 'not-allowed' : 'pointer',
                                          }}
                                        >
                                          {confirmingTicket === member.id ? 'Confirming...' : 'Confirm'}
                                        </button>
                                      )}
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
              <p style={{ fontSize: '16px', margin: 0 }}>No BNI bookings found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
