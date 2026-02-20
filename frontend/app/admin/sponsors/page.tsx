'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Sponsor {
  id: number
  category: string
  category_display: string
  logo_url: string
  direct_image_url: string
  company_name: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function SponsorsManagement() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    category: 'TITLE_SPONSORS',
    logo_url: '',
    company_name: '',
    display_order: 0,
    is_active: true
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchSponsors(token)
  }, [router])

  const fetchSponsors = async (token: string) => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/sponsors/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSponsors(data)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        setError('Failed to fetch sponsors')
      }
    } catch (error) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }

    try {
      const url = editingId
        ? `https://api.bnievent.rfidpro.in/api/sponsors/${editingId}/`
        : 'https://api.bnievent.rfidpro.in/api/sponsors/'

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingId ? 'Sponsor updated successfully!' : 'Sponsor added successfully!')
        setShowAddForm(false)
        setEditingId(null)
        setFormData({
          category: 'TITLE_SPONSORS',
          logo_url: '',
          company_name: '',
          display_order: 0,
          is_active: true
        })
        fetchSponsors(token)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        const errorData = await response.json()
        alert('Error: ' + JSON.stringify(errorData))
      }
    } catch (error) {
      alert('Error submitting form')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (sponsor: Sponsor) => {
    setFormData({
      category: sponsor.category,
      logo_url: sponsor.logo_url,
      company_name: sponsor.company_name || '',
      display_order: sponsor.display_order,
      is_active: sponsor.is_active
    })
    setEditingId(sponsor.id)
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }

    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/sponsors/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        alert('Sponsor deleted successfully!')
        fetchSponsors(token)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        alert('Failed to delete sponsor')
      }
    } catch (error) {
      alert('Error deleting sponsor')
    }
  }

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }

    try {
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/sponsors/${id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        fetchSponsors(token)
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        alert('Failed to update sponsor status')
      }
    } catch (error) {
      alert('Error updating sponsor status')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/admin')
  }

  const cancelForm = () => {
    setShowAddForm(false)
    setEditingId(null)
    setFormData({
      category: 'TITLE_SPONSORS',
      logo_url: '',
      company_name: '',
      display_order: 0,
      is_active: true
    })
  }

  if (!isReady) {
    return null
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #28a745',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', fontSize: '16px', color: '#666' }}>Loading sponsors...</p>
        </div>
      </div>
    )
  }

  const titleSponsors = sponsors.filter(s => s.category === 'TITLE_SPONSORS')
  const associateSponsors = sponsors.filter(s => s.category === 'ASSOCIATE_SPONSORS')
  const coSponsors = sponsors.filter(s => s.category === 'CO_SPONSORS')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#28a745',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>Sponsors Management</h1>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Manage event sponsors and logos</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '1px solid white',
                color: 'white',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                border: 'none',
                color: 'white',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        {/* Add Sponsor Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            + Add New Sponsor
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ marginTop: 0, color: '#333' }}>
                {editingId ? 'Edit Sponsor' : 'Add New Sponsor'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Category <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  >
                    <option value="TITLE_SPONSORS">Title Sponsors</option>
                    <option value="ASSOCIATE_SPONSORS">Associate Sponsors</option>
                    <option value="CO_SPONSORS">Co Sponsors</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Enter company name (optional)"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Google Drive Logo URL <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Paste the Google Drive share link (e.g., https://drive.google.com/file/d/1PSnZ.../view?usp=sharing)
                  </small>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Lower numbers appear first
                  </small>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ marginRight: '8px', width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 'bold', color: '#555' }}>Active (show on website)</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: submitLoading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: submitLoading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {submitLoading ? 'Saving...' : (editingId ? 'Update Sponsor' : 'Add Sponsor')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sponsors List by Category */}
        {['TITLE_SPONSORS', 'ASSOCIATE_SPONSORS', 'CO_SPONSORS'].map((category) => {
          const categorySponsors = sponsors.filter(s => s.category === category)
          const categoryName = category === 'TITLE_SPONSORS' ? 'Title Sponsors' :
                              category === 'ASSOCIATE_SPONSORS' ? 'Associate Sponsors' : 'Co Sponsors'

          return (
            <div key={category} style={{ marginBottom: '40px' }}>
              <h2 style={{
                color: '#333',
                borderBottom: '2px solid #28a745',
                paddingBottom: '10px',
                marginBottom: '20px'
              }}>
                {categoryName} ({categorySponsors.length})
              </h2>

              {categorySponsors.length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: '40px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  No sponsors in this category yet
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {categorySponsors.map((sponsor) => (
                    <div
                      key={sponsor.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        opacity: sponsor.is_active ? 1 : 0.6
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '150px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '5px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: '15px',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={sponsor.direct_image_url}
                          alt={sponsor.company_name || 'Sponsor logo'}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      </div>

                      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>
                        {sponsor.company_name || 'Unnamed Sponsor'}
                      </h3>

                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                        <div>Order: {sponsor.display_order}</div>
                        <div>Status: {sponsor.is_active ? '✅ Active' : '❌ Inactive'}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '5px', marginTop: '15px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleToggleActive(sponsor.id, sponsor.is_active)}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '8px 12px',
                            backgroundColor: sponsor.is_active ? '#ffc107' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          {sponsor.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(sponsor)}
                          style={{
                            flex: 1,
                            minWidth: '60px',
                            padding: '8px 12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(sponsor.id)}
                          style={{
                            flex: 1,
                            minWidth: '60px',
                            padding: '8px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Loading Spinner Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
