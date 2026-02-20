'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface VIPRegistration {
  id: number
  ticket_no: string
  name: string
  mobile_number: string | null
  company_name: string | null
  primary_booker_name: string | null
  payment_status: string
  amount: string
  created_at: string
  registration_for: string
}

export default function VIPBookingsPage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [registrations, setRegistrations] = useState<VIPRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/admin')
      return
    }
    setIsReady(true)
    fetchVIPRegistrations(token)
  }, [router])

  const fetchVIPRegistrations = async (token: string) => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/vip-registration/', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setRegistrations(data.registrations || [])
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.replace('/admin')
      } else {
        setError('Failed to fetch VIP registrations')
      }
    } catch (err) {
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

  const handleGenerateIDCard = async (reg: VIPRegistration) => {
    setGeneratingId(reg.id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/generate-id-card/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vip_card_${reg.ticket_no}.png`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to generate ID card')
      }
    } catch {
      alert('Error generating ID card')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleViewIDCard = async (reg: VIPRegistration) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/generate-id-card/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
      } else {
        alert('Failed to generate ID card')
      }
    } catch {
      alert('Error generating ID card')
    }
  }

  const getQRUrl = (ticketNo: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `https://bnichettinad.cloud/scan/${ticketNo}`
    )}`

  const filtered = registrations.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.mobile_number || '').includes(searchTerm) ||
    (r.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.primary_booker_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!isReady || loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f5f5f5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: '#6f42c1', fontFamily: "'Inter', sans-serif" }}>
          <div style={{
            width: '50px', height: '50px',
            border: '4px solid #f3f3f3', borderTop: '4px solid #6f42c1',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }}></div>
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading VIP Bookings...</p>
          <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: '40px',
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '15px 0', marginBottom: '30px',
        borderBottom: '3px solid #6f42c1',
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '15px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/ez.gif" alt="BNI Event" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              <span style={{ color: '#ff0000' }}>BNI</span>{' '}
              <span style={{ color: '#000000' }}>CHETTINAD</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                padding: '12px 24px', backgroundColor: '#0066cc', color: '#ffffff',
                border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600',
                fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 24px', backgroundColor: '#ff6600', color: '#ffffff',
                border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600',
                fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {/* Page Title */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px', flexWrap: 'wrap', gap: '15px',
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 4px 0', color: '#333' }}>
              👑 VIP Bookings
            </h2>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Total: {registrations.length} VIP registrations
            </p>
          </div>
          <button
            onClick={() => {
              const token = localStorage.getItem('access_token')
              if (token) { setLoading(true); fetchVIPRegistrations(token) }
            }}
            style={{
              padding: '10px 20px', backgroundColor: '#6f42c1', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px', marginBottom: '20px',
            backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '6px',
            color: '#c33', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name, ticket no, company or registered by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', maxWidth: '500px', padding: '12px 16px',
              border: '1px solid #d0d0d0', borderRadius: '6px',
              fontSize: '14px', fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Table */}
        <div style={{
          background: '#ffffff', borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '20px',
          border: '1px solid #e0e0e0', overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f0ff' }}>
                {['Ticket No', 'VIP Name', 'Mobile', 'Company', 'Registered By', 'Date', 'QR Code', 'Actions'].map((h) => (
                  <th key={h} style={{
                    padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6',
                    fontSize: '14px', fontWeight: '600', color: '#6f42c1',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((reg) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#333', fontWeight: '600' }}>
                    {reg.ticket_no}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#333', fontWeight: '600' }}>
                    {reg.name}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#333' }}>
                    {reg.mobile_number || <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#555' }}>
                    {reg.company_name || <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#555' }}>
                    {reg.primary_booker_name || <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {formatDate(reg.created_at)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <img
                        src={getQRUrl(reg.ticket_no)}
                        alt={`QR-${reg.ticket_no}`}
                        style={{
                          width: '80px', height: '80px',
                          border: '2px solid #6f42c1', borderRadius: '4px',
                        }}
                      />
                      <a
                        href={getQRUrl(reg.ticket_no)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#6f42c1', textDecoration: 'underline' }}
                        download={`qr_${reg.ticket_no}.png`}
                      >
                        Save QR
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleViewIDCard(reg)}
                        disabled={generatingId === reg.id}
                        style={{
                          padding: '7px 14px', backgroundColor: '#0066cc', color: 'white',
                          border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                          cursor: generatingId === reg.id ? 'not-allowed' : 'pointer',
                          opacity: generatingId === reg.id ? 0.6 : 1,
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleGenerateIDCard(reg)}
                        disabled={generatingId === reg.id}
                        style={{
                          padding: '7px 14px', backgroundColor: '#28a745', color: 'white',
                          border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                          cursor: generatingId === reg.id ? 'not-allowed' : 'pointer',
                          opacity: generatingId === reg.id ? 0.6 : 1,
                        }}
                      >
                        {generatingId === reg.id ? 'Generating...' : 'Download'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p style={{
              textAlign: 'center', padding: '40px 20px',
              color: '#666', fontSize: '15px',
            }}>
              {registrations.length === 0 ? 'No VIP registrations yet' : 'No results found'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
