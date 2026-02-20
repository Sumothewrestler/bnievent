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
  student_id_card: string | null
}

interface Member {
  id?: number
  name: string
  company: string
  chapter?: string
  sponsor_type?: 'TITLE_SPONSORS' | 'ASSOCIATE_SPONSORS' | 'CO_SPONSORS' | 'BNI_MEMBERS' | ''
  sponsor_type_display?: string
  ticket_limit?: number
  registration_count?: number
  primary_count?: number
  additional_count?: number
  remaining_tickets?: number
  is_active?: boolean
}

function CategoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [category, setCategory] = useState<string>('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    chapter: '',
    sponsor_type: '' as 'TITLE_SPONSORS' | 'ASSOCIATE_SPONSORS' | 'CO_SPONSORS' | 'BNI_MEMBERS' | ''
  })
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState<string>('')
  const [sponsorFilter, setSponsorFilter] = useState<string>('ALL')

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
      // Fetch members from backend API for BNI categories
      if (cat === 'BNI_CHETTINAD' || cat === 'BNI_THALAIVAS' || cat === 'BNI_MADURAI') {
        fetchMembers(token, cat)
      }
    } else {
      router.replace('/admin/dashboard')
    }
  }, [searchParams, router])

  const fetchData = async (token: string, cat: string) => {
    try {
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
    } catch (error) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async (token: string, cat: string) => {
    setLoadingMembers(true)
    try {
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/bni-members/by_chapter/?chapter=${cat}`
      )
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      } else {
        console.error('Failed to fetch members')
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleAddMember = async () => {
    if (!formData.name || !formData.company) {
      alert('Please fill in Name and Company fields')
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/bni-members/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          chapter: category,
          sponsor_type: formData.sponsor_type || 'BNI_MEMBERS'
        }),
      })

      if (response.ok) {
        alert('✓ Member added successfully!')
        fetchMembers(token, category)
        setShowAddModal(false)
        setFormData({ name: '', company: '', chapter: '', sponsor_type: '' })
      } else {
        const errorData = await response.json()
        alert(`Failed to add member: ${JSON.stringify(errorData)}`)
      }
    } catch (error) {
      alert(`Error adding member: ${error}`)
    }
  }

  const handleEditMember = async () => {
    if (!editingMember || !formData.name || !formData.company) {
      alert('Please fill in Name and Company fields')
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/bni-members/${editingMember.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            company: formData.company,
            sponsor_type: formData.sponsor_type || 'BNI_MEMBERS'
          }),
        }
      )

      if (response.ok) {
        alert('✓ Member updated successfully!')
        fetchMembers(token, category)
        setShowEditModal(false)
        setEditingMember(null)
        setFormData({ name: '', company: '', chapter: '', sponsor_type: '' })
      } else {
        const errorData = await response.json()
        alert(`Failed to update member: ${JSON.stringify(errorData)}`)
      }
    } catch (error) {
      alert(`Error updating member: ${error}`)
    }
  }

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to delete ${member.name}?`)) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/bni-members/${member.id}/`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        alert('✓ Member deleted successfully!')
        fetchMembers(token, category)
      } else {
        alert('Failed to delete member')
      }
    } catch (error) {
      alert(`Error deleting member: ${error}`)
    }
  }

  const openEditModal = (member: Member) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      company: member.company,
      chapter: member.chapter || category,
      sponsor_type: member.sponsor_type || ''
    })
    setShowEditModal(true)
  }

  const stats = {
    total: registrations.length,
    confirmed: registrations.filter(r => r.payment_status === 'SUCCESS').length,
    pending: registrations.filter(r => r.payment_status === 'PENDING').length,
  }

  const filteredMembers = sponsorFilter === 'ALL'
    ? members
    : members.filter(m => m.sponsor_type === sponsorFilter)

  const registeredCount = filteredMembers.filter(m => m.registration_count && m.registration_count > 0).length

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
          {categoryNames[category] || category} - Registrations
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
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#28a745', margin: 0 }}>{stats.confirmed}</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#ffc107', margin: 0 }}>{stats.pending}</p>
          </div>
        </div>

        {/* BNI Chettinad Member List */}
        {category === 'BNI_CHETTINAD' && (
          <div style={{
            background: '#ffffff',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            marginBottom: '20px',
            border: '2px solid #ff6600',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: '#ff6600' }}>
                BNI Chettinad Member Directory
              </h3>
              <button
                onClick={() => {
                  setFormData({ name: '', company: '', chapter: '', sponsor_type: '' })
                  setShowAddModal(true)
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
              >
                + Add Member
              </button>
            </div>

            {/* Sponsor Type Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'All Members', color: '#6c757d', activeColor: '#5a6268' },
                { key: 'TITLE_SPONSORS', label: 'Title Sponsors', color: '#b8860b', activeColor: '#8b6508', bg: '#ffd700', activeBg: '#ffc200' },
                { key: 'ASSOCIATE_SPONSORS', label: 'Associate Sponsors', color: '#1a6e9a', activeColor: '#155a7a', bg: '#87ceeb', activeBg: '#6bc0e0' },
                { key: 'CO_SPONSORS', label: 'Co Sponsors', color: '#2d7a2d', activeColor: '#1f5a1f', bg: '#90ee90', activeBg: '#72d672' },
                { key: 'BNI_MEMBERS', label: 'BNI Members', color: '#555', activeColor: '#333', bg: '#f0f0f0', activeBg: '#ddd' },
              ].map(({ key, label, color, activeColor, bg, activeBg }) => {
                const isActive = sponsorFilter === key
                const count = key === 'ALL' ? members.length : members.filter(m => m.sponsor_type === key).length
                return (
                  <button
                    key={key}
                    onClick={() => setSponsorFilter(key)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: isActive ? (activeBg || '#495057') : (bg || '#e9ecef'),
                      color: isActive ? (activeColor || '#fff') : (color || '#333'),
                      border: isActive ? `2px solid ${activeColor || '#333'}` : '2px solid transparent',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#333' }}>S.No</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#333' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#333' }}>Company</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#333' }}>Sponsor Type</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#333' }}>Ticket Limit</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#28a745' }}>Primary</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#0066cc' }}>Additional</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#e65c00' }}>Balance</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '700', color: '#333' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#333' }}>{index + 1}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#333', fontWeight: '600' }}>{member.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#666' }}>{member.company}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#666' }}>
                        {member.sponsor_type ? (
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor:
                              member.sponsor_type === 'TITLE_SPONSORS' ? '#ffd700' :
                              member.sponsor_type === 'ASSOCIATE_SPONSORS' ? '#87ceeb' :
                              member.sponsor_type === 'CO_SPONSORS' ? '#90ee90' :
                              '#f0f0f0',
                            color:
                              member.sponsor_type === 'TITLE_SPONSORS' ? '#000' :
                              member.sponsor_type === 'ASSOCIATE_SPONSORS' ? '#000' :
                              member.sponsor_type === 'CO_SPONSORS' ? '#000' :
                              '#333',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {member.sponsor_type.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#0066cc' }}>
                        {member.ticket_limit || 0}
                      </td>
                      {/* Primary Registration */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: (member.primary_count ?? 0) > 0 ? '#d4edda' : '#f8d7da',
                          color: (member.primary_count ?? 0) > 0 ? '#155724' : '#721c24',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: `1px solid ${(member.primary_count ?? 0) > 0 ? '#c3e6cb' : '#f5c6cb'}`,
                          display: 'inline-block',
                          minWidth: '28px',
                        }}>
                          {(member.primary_count ?? 0) > 0 ? `✓ ${member.primary_count}` : '✗ 0'}
                        </span>
                      </td>
                      {/* Additional Registrations */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: (member.additional_count ?? 0) > 0 ? '#cce5ff' : '#f0f0f0',
                          color: (member.additional_count ?? 0) > 0 ? '#004085' : '#999',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: `1px solid ${(member.additional_count ?? 0) > 0 ? '#b8daff' : '#ddd'}`,
                          display: 'inline-block',
                          minWidth: '28px',
                        }}>
                          {(member.additional_count ?? 0) > 0 ? `+${member.additional_count}` : '0'}
                        </span>
                      </td>
                      {/* Balance */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {(() => {
                          const balance = (member.ticket_limit ?? 0) - (member.primary_count ?? 0) - (member.additional_count ?? 0)
                          return (
                            <span style={{
                              padding: '4px 10px',
                              backgroundColor: balance > 0 ? '#fff3cd' : balance === 0 ? '#f8d7da' : '#f8d7da',
                              color: balance > 0 ? '#856404' : '#721c24',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '700',
                              border: `1px solid ${balance > 0 ? '#ffeeba' : '#f5c6cb'}`,
                              display: 'inline-block',
                              minWidth: '28px',
                            }}>
                              {balance > 0 ? balance : '0'}
                            </span>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => openEditModal(member)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#0066cc',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0052a3'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0066cc'}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{
              marginTop: '15px',
              padding: '15px',
              background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)',
              borderRadius: '8px',
              border: '2px solid #0066cc',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px 0', fontWeight: '600', textTransform: 'uppercase' }}>
                  {sponsorFilter === 'ALL' ? 'Total Members' : `${sponsorFilter.replace(/_/g, ' ')} Count`}
                </p>
                <p style={{ fontSize: '24px', color: '#0066cc', margin: 0, fontWeight: '700' }}>
                  {filteredMembers.length}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#28a745', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Primary Registered
                </p>
                <p style={{ fontSize: '24px', color: '#28a745', margin: 0, fontWeight: '700' }}>
                  {filteredMembers.filter(m => (m.primary_count ?? 0) > 0).length}
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0 0' }}>
                  of {filteredMembers.length} members
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#0066cc', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Total Additional
                </p>
                <p style={{ fontSize: '24px', color: '#0066cc', margin: 0, fontWeight: '700' }}>
                  {filteredMembers.reduce((sum, m) => sum + (m.additional_count ?? 0), 0)}
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0 0' }}>
                  guest tickets
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#dc3545', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Not Registered
                </p>
                <p style={{ fontSize: '24px', color: '#dc3545', margin: 0, fontWeight: '700' }}>
                  {filteredMembers.filter(m => (m.primary_count ?? 0) === 0).length}
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0 0' }}>
                  yet to register
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration List */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '20px',
          border: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', color: '#333' }}>
            Registration List
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600' }}>S.No</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '180px' }}>Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '120px' }}>Mobile</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '110px' }}>Ticket No</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '80px' }}>Payment</th>
                {category === 'STUDENTS' && (
                  <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontSize: '13px', fontWeight: '600', minWidth: '100px' }}>Student ID</th>
                )}
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, index) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#333' }}>{index + 1}</td>
                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#333', fontWeight: '600' }}>{reg.name}</td>
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
                      {reg.payment_status === 'SUCCESS' ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                  {category === 'STUDENTS' && (
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      {reg.student_id_card ? (
                        <button
                          onClick={() => {
                            setSelectedImage(reg.student_id_card)
                            setSelectedStudentName(reg.name)
                            setShowImageModal(true)
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#17a2b8',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: '0 auto',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#138496'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#17a2b8'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          View
                        </button>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          color: '#999',
                          fontStyle: 'italic',
                        }}>
                          No ID
                        </span>
                      )}
                    </td>
                  )}
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#333' }}>Add New Member</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                Name <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter member name"
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                Company <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter company name"
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                Sponsor Type
              </label>
              <select
                value={formData.sponsor_type}
                onChange={(e) => setFormData({ ...formData, sponsor_type: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select Sponsor Type</option>
                <option value="TITLE_SPONSORS">TITLE SPONSORS</option>
                <option value="ASSOCIATE_SPONSORS">ASSOCIATE SPONSORS</option>
                <option value="CO_SPONSORS">CO SPONSORS</option>
                <option value="BNI_MEMBERS">BNI MEMBERS</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({ name: '', company: '', chapter: '', sponsor_type: '' })
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#333' }}>Edit Member</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                Name <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter member name"
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                Company <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter company name"
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                Sponsor Type
              </label>
              <select
                value={formData.sponsor_type}
                onChange={(e) => setFormData({ ...formData, sponsor_type: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #d0d0d0',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select Sponsor Type</option>
                <option value="TITLE_SPONSORS">TITLE SPONSORS</option>
                <option value="ASSOCIATE_SPONSORS">ASSOCIATE SPONSORS</option>
                <option value="CO_SPONSORS">CO SPONSORS</option>
                <option value="BNI_MEMBERS">BNI MEMBERS</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingMember(null)
                  setFormData({ name: '', company: '', chapter: '', sponsor_type: '' })
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditMember}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0066cc',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-in',
          }}
          onClick={() => {
            setShowImageModal(false)
            setSelectedImage(null)
            setSelectedStudentName('')
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '0',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 25px',
              borderBottom: '2px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  margin: 0,
                  color: '#ffffff',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Student ID Card - {selectedStudentName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowImageModal(false)
                  setSelectedImage(null)
                  setSelectedStudentName('')
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body - Image */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8f9fa',
            }}>
              <img
                src={selectedImage.startsWith('http') ? selectedImage : `https://api.bnievent.rfidpro.in${selectedImage}`}
                alt={`Student ID Card - ${selectedStudentName}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const errorDiv = document.createElement('div')
                  errorDiv.style.cssText = 'padding: 40px; text-align: center; color: #dc3545; font-size: 16px; font-weight: 600;'
                  errorDiv.innerHTML = `
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px;">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style="margin: 0;">Failed to load image</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">The image file may be missing or corrupted</p>
                  `
                  target.parentElement?.appendChild(errorDiv)
                }}
              />
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '15px 25px',
              borderTop: '1px solid #e0e0e0',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <a
                href={selectedImage.startsWith('http') ? selectedImage : `https://api.bnievent.rfidpro.in${selectedImage}`}
                download={`student_id_${selectedStudentName.replace(/\s+/g, '_')}.jpg`}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </a>
              <button
                onClick={() => {
                  setShowImageModal(false)
                  setSelectedImage(null)
                  setSelectedStudentName('')
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
              >
                Close
              </button>
            </div>
          </div>

          {/* Fade in animation */}
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            /* Mobile responsive styles */
            @media (max-width: 768px) {
              div[style*="maxWidth: 900px"] {
                margin: 10px !important;
                maxHeight: 95vh !important;
              }

              h3 {
                fontSize: 1.1rem !important;
              }

              button, a {
                fontSize: 13px !important;
                padding: 9px 16px !important;
              }
            }

            @media (max-width: 480px) {
              h3 {
                fontSize: 1rem !important;
              }

              button, a {
                fontSize: 12px !important;
                padding: 8px 14px !important;
              }
            }
          `}</style>
        </div>
      )}
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
