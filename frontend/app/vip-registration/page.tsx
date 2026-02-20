'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BNIMember {
  id: number
  name: string
  company: string
}

export default function VIPRegistrationPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    company_name: '',
    registered_by: '',
  })
  const [members, setMembers] = useState<BNIMember[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('error')
  const [successTicket, setSuccessTicket] = useState('')

  useEffect(() => {
    fetchBNIMembers()
  }, [])

  const fetchBNIMembers = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/bni-members/?chapter=BNI_CHETTINAD')
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Error fetching BNI members:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setMessage('VIP Name is required')
      setMessageType('error')
      return
    }
    if (!formData.mobile_number.trim()) {
      setMessage('Mobile Number is required')
      setMessageType('error')
      return
    }
    if (!formData.registered_by) {
      setMessage('Please select who is registering this VIP')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/vip-registration/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessTicket(data.ticket_no)
        setMessage(`VIP Registration successful! Ticket No: ${data.ticket_no}`)
        setMessageType('success')
        setFormData({ name: '', mobile_number: '', company_name: '', registered_by: '' })
      } else {
        setMessage(data.error || 'Registration failed. Please try again.')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Error submitting registration. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f0ff 0%, #ede7f6 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 100, padding: '15px 0',
        borderBottom: '3px solid #6f42c1',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: '20px',
        }}>
          <a href="https://bnichettinad.cloud/home" style={{ textDecoration: 'none' }}>
            <img src="/ez.gif" alt="BNI Event" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
          </a>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>
            <span style={{ color: '#ff0000' }}>BNI</span>{' '}
            <span style={{ color: '#000000' }}>CHETTINAD</span>
          </h1>
        </div>
      </div>

      <div style={{
        maxWidth: '600px', margin: '0 auto',
        padding: '20px', paddingTop: '110px',
        position: 'relative', zIndex: 1,
      }}>
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6f42c1', fontWeight: '600', fontSize: '14px',
            marginBottom: '20px', padding: '0',
          }}
        >
          ← Back to Registration
        </button>

        <div style={{
          background: '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(111, 66, 193, 0.15)',
          border: '2px solid #6f42c1',
        }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>👑</div>
            <h2 style={{
              fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0',
              color: '#6f42c1', fontFamily: "'Inter', sans-serif",
            }}>
              VIP Registration
            </h2>
            <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
              Register VIP guests for BNI CHETTINAD Event
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div style={{
              padding: '15px 20px',
              marginBottom: '25px',
              backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
              border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '8px',
              color: messageType === 'success' ? '#155724' : '#721c24',
              fontSize: '15px',
              fontWeight: '600',
              textAlign: 'center',
            }}>
              {message}
              {messageType === 'success' && successTicket && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(21, 87, 36, 0.1)',
                  borderRadius: '6px',
                  fontSize: '20px',
                  fontWeight: '800',
                  color: '#155724',
                  letterSpacing: '2px',
                }}>
                  {successTicket}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* VIP Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', marginBottom: '8px',
                color: '#333', fontWeight: '600', fontSize: '14px',
              }}>
                VIP Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter VIP guest name"
                required
                style={{
                  width: '100%', padding: '14px 16px',
                  border: '2px solid #d0d0d0', borderRadius: '8px',
                  fontSize: '15px', fontFamily: "'Inter', sans-serif",
                  transition: 'border-color 0.2s ease',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6f42c1'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d0d0d0'}
              />
            </div>

            {/* Mobile Number */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', marginBottom: '8px',
                color: '#333', fontWeight: '600', fontSize: '14px',
              }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="Enter mobile number"
                required
                maxLength={15}
                style={{
                  width: '100%', padding: '14px 16px',
                  border: '2px solid #d0d0d0', borderRadius: '8px',
                  fontSize: '15px', fontFamily: "'Inter', sans-serif",
                  transition: 'border-color 0.2s ease',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6f42c1'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d0d0d0'}
              />
            </div>

            {/* Company / Business Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', marginBottom: '8px',
                color: '#333', fontWeight: '600', fontSize: '14px',
              }}>
                Company or Business Name{' '}
                <span style={{ color: '#999', fontWeight: '400' }}>(Optional)</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Enter company or business name"
                style={{
                  width: '100%', padding: '14px 16px',
                  border: '2px solid #d0d0d0', borderRadius: '8px',
                  fontSize: '15px', fontFamily: "'Inter', sans-serif",
                  transition: 'border-color 0.2s ease',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6f42c1'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d0d0d0'}
              />
            </div>

            {/* Registered By */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block', marginBottom: '8px',
                color: '#333', fontWeight: '600', fontSize: '14px',
              }}>
                Registered By *
              </label>
              <select
                name="registered_by"
                value={formData.registered_by}
                onChange={handleChange}
                required
                style={{
                  width: '100%', padding: '14px 16px',
                  border: '2px solid #d0d0d0', borderRadius: '8px',
                  fontSize: '15px', fontFamily: "'Inter', sans-serif",
                  transition: 'border-color 0.2s ease',
                  outline: 'none', boxSizing: 'border-box',
                  background: '#ffffff', cursor: 'pointer',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6f42c1'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d0d0d0'}
              >
                <option value="">— Select BNI CHETTINAD Member —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}{member.company ? ` (${member.company})` : ''}
                  </option>
                ))}
              </select>
              {members.length === 0 && (
                <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                  Loading members...
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px',
                background: loading
                  ? '#9b7bc9'
                  : 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
                color: '#ffffff', border: 'none',
                borderRadius: '8px', fontSize: '16px',
                fontWeight: '700', fontFamily: "'Inter', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(111, 66, 193, 0.4)',
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {loading ? 'Registering...' : '👑 Register VIP Guest'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: '13px',
          color: '#888', marginTop: '20px',
        }}>
          VIP registrations are complimentary — no payment required.
        </p>
      </div>
    </div>
  )
}
