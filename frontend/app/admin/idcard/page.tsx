'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Registration {
  id: number
  ticket_no: string
  name: string
  mobile_number: string
  email: string
  registration_for: string | null
  payment_status: string
  amount: string
  is_primary_booker: boolean
}

interface IDCardTemplate {
  id: number
  category: string
  category_display: string
  template_url: string
  direct_image_url: string | null
  is_active: boolean
}

// Map registration categories to display categories
const getCategoryGroup = (reg: Registration): string => {
  const regFor = reg.registration_for
  const isPrimary = reg.is_primary_booker

  if (!regFor) return 'ALL'
  if (regFor === 'STUDENTS') return 'STUDENTS'
  if (regFor === 'PUBLIC') return 'PUBLIC'

  // Separate BNI Members into Primary and Guest
  if (['BNI_CHETTINAD', 'BNI_THALAIVAS', 'BNI_MADURAI'].includes(regFor)) {
    return isPrimary ? 'BNI_MEMBERS_PRIMARY' : 'BNI_MEMBERS_GUEST'
  }

  if (regFor === 'VIP') return 'VIP'
  if (regFor === 'ORGANISERS') return 'ORGANISERS'
  if (regFor === 'VOLUNTEERS') return 'VOLUNTEERS'
  return 'ALL'
}

export default function IDCardPage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [sharedWhatsApp, setSharedWhatsApp] = useState<Set<number>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)

  // Template management state
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templates, setTemplates] = useState<IDCardTemplate[]>([])
  const [templateURLs, setTemplateURLs] = useState<Record<string, string>>({})
  const [templateActive, setTemplateActive] = useState<Record<string, boolean>>({})
  const [savingTemplates, setSavingTemplates] = useState(false)
  const [templateMessage, setTemplateMessage] = useState('')

  const categories = [
    { key: 'ALL', label: 'All', color: '#6c757d' },
    { key: 'BNI_MEMBERS_PRIMARY', label: 'BNI Members (Primary)', color: '#0066cc' },
    { key: 'BNI_MEMBERS_GUEST', label: 'BNI Guests', color: '#17a2b8' },
    { key: 'STUDENTS', label: 'Students', color: '#ff6b00' },
    { key: 'PUBLIC', label: 'Public', color: '#28a745' },
    { key: 'VIP', label: 'VIP', color: '#9b59b6' },
    { key: 'ORGANISERS', label: 'Organisers', color: '#e74c3c' },
    { key: 'VOLUNTEERS', label: 'Volunteers', color: '#f39c12' },
  ]

  const templateCategories = [
    { key: 'STUDENTS', label: 'Students', color: '#ff6b00' },
    { key: 'BNI_MEMBERS_PRIMARY', label: 'BNI Members (Primary)', color: '#0066cc' },
    { key: 'BNI_MEMBERS_GUEST', label: 'BNI Guests', color: '#17a2b8' },
    { key: 'BNI_MEMBERS', label: 'BNI Members (Legacy)', color: '#6c757d' },
    { key: 'PUBLIC', label: 'Public', color: '#28a745' },
    { key: 'VIP', label: 'VIP', color: '#9b59b6' },
    { key: 'ORGANISERS', label: 'Organisers', color: '#e74c3c' },
    { key: 'VOLUNTEERS', label: 'Volunteers', color: '#f39c12' },
  ]

  // Load shared WhatsApp status from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('whatsapp_shared')
    if (stored) {
      setSharedWhatsApp(new Set(JSON.parse(stored)))
    }
  }, [])

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

  const fetchTemplates = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/idcard-templates/')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)

        // Initialize template URLs and active status
        const urls: Record<string, string> = {}
        const active: Record<string, boolean> = {}

        data.forEach((template: IDCardTemplate) => {
          urls[template.category] = template.template_url || ''
          active[template.category] = template.is_active
        })

        setTemplateURLs(urls)
        setTemplateActive(active)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleOpenTemplateModal = () => {
    setShowTemplateModal(true)
    fetchTemplates()
  }

  const handleSaveTemplates = async () => {
    setSavingTemplates(true)
    setTemplateMessage('')

    const token = localStorage.getItem('access_token')
    if (!token) {
      setTemplateMessage('Authentication required')
      setSavingTemplates(false)
      return
    }

    try {
      // Update or create templates
      for (const category of templateCategories) {
        const existingTemplate = templates.find(t => t.category === category.key)
        const url = templateURLs[category.key] || ''
        const isActive = templateActive[category.key] !== false

        if (existingTemplate) {
          // Update existing
          await fetch(`https://api.bnievent.rfidpro.in/api/idcard-templates/${existingTemplate.id}/`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              template_url: url,
              is_active: isActive,
            }),
          })
        } else if (url) {
          // Create new
          await fetch('https://api.bnievent.rfidpro.in/api/idcard-templates/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category: category.key,
              template_url: url,
              is_active: isActive,
            }),
          })
        }
      }

      setTemplateMessage('✓ Templates saved successfully!')
      setTimeout(() => {
        setTemplateMessage('')
        setShowTemplateModal(false)
      }, 2000)
    } catch (error) {
      setTemplateMessage('Error saving templates')
    } finally {
      setSavingTemplates(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/admin')
  }

  const handleGenerateIDCard = async (reg: Registration) => {
    setGeneratingId(reg.id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/generate-id-card/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `id_card_${reg.ticket_no}.png`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to generate ID card')
      }
    } catch (error) {
      alert('Error generating ID card')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleBulkDownload = async () => {
    if (filteredRegistrations.length === 0) {
      alert('No registrations to download')
      return
    }

    const categoryLabel = selectedCategory === 'ALL' ? 'all categories' : categories.find(c => c.key === selectedCategory)?.label
    if (!confirm(`Download ${filteredRegistrations.length} ID cards for ${categoryLabel} as a ZIP file?`)) {
      return
    }

    setBulkDownloading(true)
    const token = localStorage.getItem('access_token')

    try {
      const params = selectedCategory && selectedCategory !== 'ALL' ? `?category=${selectedCategory}` : ''
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/download-id-cards-zip/${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const zipName = selectedCategory && selectedCategory !== 'ALL'
          ? `id_cards_${selectedCategory}.zip`
          : 'id_cards_all.zip'
        a.download = zipName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        alert(`ZIP downloaded successfully! (${filteredRegistrations.length} ID cards)`)
      } else {
        const errData = await response.json().catch(() => ({}))
        alert(`Failed to generate ZIP: ${errData.error || response.statusText}`)
      }
    } catch (error) {
      alert('Error generating ZIP file')
      console.error('Bulk ZIP download error:', error)
    }

    setBulkDownloading(false)
  }

  const handleViewIDCard = async (reg: Registration) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/generate-id-card/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
      } else {
        alert('Failed to generate ID card')
      }
    } catch (error) {
      alert('Error generating ID card')
    }
  }

  const handleShareWhatsApp = async (reg: Registration) => {
    setGeneratingId(reg.id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://api.bnievent.rfidpro.in/api/registrations/${reg.id}/save-id-card/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const message = `*BNI CHETTINAD - Event Registration Confirmation*\n\n` +
          `Dear ${reg.name},\n\n` +
          `Your registration has been successfully confirmed.\n\n` +
          `*Ticket Number:* ${reg.ticket_no}\n` +
          `*Payment Status:* ${reg.payment_status}\n` +
          `*Amount:* ₹${reg.amount}\n\n` +
          `*Your ID Card:*\n${data.image_url}\n\n` +
          `📍 *Ticket Collection Details:*\n` +
          `Please collect your event ticket on 20th February at the venue,\n` +
          `⏰ between 10:30 AM and 7:30 PM.\n\n` +
          `Kindly save this ID card and present it while collecting your ticket.\n\n` +
          `Thank you for registering. We look forward to seeing you! 😊`

        let phoneNumber = reg.mobile_number.replace(/\s+/g, '').replace(/^0+/, '')
        phoneNumber = phoneNumber.replace(/^\+\d{1,3}/, '')
        phoneNumber = `91${phoneNumber}`

        const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')

        const newShared = new Set(sharedWhatsApp)
        newShared.add(reg.id)
        setSharedWhatsApp(newShared)
        localStorage.setItem('whatsapp_shared', JSON.stringify(Array.from(newShared)))
      } else {
        alert('Failed to generate ID card')
      }
    } catch (error) {
      alert('Error generating ID card')
    } finally {
      setGeneratingId(null)
    }
  }

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.mobile_number.includes(searchTerm)

    const categoryGroup = getCategoryGroup(reg)
    const matchesCategory = selectedCategory === 'ALL' || categoryGroup === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getCategoryStats = () => {
    const stats: Record<string, number> = {}
    categories.forEach(cat => {
      if (cat.key === 'ALL') {
        stats[cat.key] = registrations.length
      } else {
        stats[cat.key] = registrations.filter(r => getCategoryGroup(r) === cat.key).length
      }
    })
    return stats
  }

  const categoryStats = getCategoryStats()

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
              <span style={{ color: '#ff0000' }}>BNI</span>{' '}
              <span style={{ color: '#000000' }}>CHETTINAD</span>
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
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff6600',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e55a00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: 0,
            color: '#333',
            fontFamily: "'Inter', sans-serif",
          }}>
            Generate ID Cards
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenTemplateModal}
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
              ⚙️ Template Settings
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading || filteredRegistrations.length === 0}
              style={{
                padding: '12px 24px',
                backgroundColor: bulkDownloading ? '#6c757d' : '#9b59b6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                cursor: bulkDownloading || filteredRegistrations.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                opacity: bulkDownloading || filteredRegistrations.length === 0 ? 0.6 : 1,
              }}
            >
              {bulkDownloading ? 'Generating ZIP...' : `Download All as ZIP (${filteredRegistrations.length})`}
            </button>
          </div>
        </div>

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

        {/* Category Tabs */}
        <div style={{
          marginBottom: '20px',
          background: '#ffffff',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          overflowX: 'auto',
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === cat.key ? cat.color : '#ffffff',
                  color: selectedCategory === cat.key ? '#ffffff' : cat.color,
                  border: `2px solid ${cat.color}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  if (selectedCategory !== cat.key) {
                    e.currentTarget.style.backgroundColor = cat.color
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedCategory !== cat.key) {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = cat.color
                  }
                }}
              >
                {cat.label} ({categoryStats[cat.key] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{
          marginBottom: '20px',
        }}>
          <input
            type="text"
            placeholder="Search by name, ticket no, email or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '12px 16px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Registrations Table */}
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
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '14px', fontWeight: '600', color: '#333' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg) => {
                const statusColor = getPaymentStatusColor(reg.payment_status)
                const categoryGroup = getCategoryGroup(reg)
                const categoryColor = categories.find(c => c.key === categoryGroup)?.color || '#6c757d'
                const categoryLabel = categories.find(c => c.key === categoryGroup)?.label || categoryGroup

                return (
                  <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.ticket_no}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.name}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{reg.mobile_number}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '5px 12px',
                        backgroundColor: categoryColor,
                        color: '#ffffff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block',
                      }}>
                        {categoryLabel}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '5px 12px',
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block',
                      }}>
                        {reg.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewIDCard(reg)}
                          disabled={generatingId === reg.id}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: generatingId === reg.id ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s ease',
                            opacity: generatingId === reg.id ? 0.6 : 1,
                          }}
                          onMouseOver={(e) => {
                            if (generatingId !== reg.id) {
                              e.currentTarget.style.backgroundColor = '#0052a3'
                            }
                          }}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0066cc'}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleGenerateIDCard(reg)}
                          disabled={generatingId === reg.id}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: generatingId === reg.id ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s ease',
                            opacity: generatingId === reg.id ? 0.6 : 1,
                          }}
                          onMouseOver={(e) => {
                            if (generatingId !== reg.id) {
                              e.currentTarget.style.backgroundColor = '#218838'
                            }
                          }}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                        >
                          {generatingId === reg.id ? 'Generating...' : 'Download'}
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(reg)}
                          disabled={generatingId === reg.id}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: sharedWhatsApp.has(reg.id) ? '#25D366' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: generatingId === reg.id ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s ease',
                            opacity: generatingId === reg.id ? 0.6 : 1,
                          }}
                          onMouseOver={(e) => {
                            if (generatingId !== reg.id) {
                              e.currentTarget.style.backgroundColor = sharedWhatsApp.has(reg.id) ? '#1da851' : '#c82333'
                            }
                          }}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = sharedWhatsApp.has(reg.id) ? '#25D366' : '#dc3545'}
                        >
                          WhatsApp
                        </button>
                      </div>
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
              No registrations found
            </p>
          )}
        </div>
      </div>

      {/* Template Settings Modal */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}
onClick={() => setShowTemplateModal(false)}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 30px',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#333',
              }}>
                ⚙️ ID Card Template Settings
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '30px',
              overflowY: 'auto',
              flex: 1,
            }}>
              <p style={{
                marginTop: 0,
                marginBottom: '20px',
                color: '#666',
                fontSize: '14px',
              }}>
                Configure Google Drive URLs for each ID card template category. Upload your PNG templates to Google Drive, set sharing to "Anyone with the link", and paste the URLs below.
              </p>

              {templateMessage && (
                <div style={{
                  padding: '12px',
                  marginBottom: '20px',
                  backgroundColor: templateMessage.includes('✓') ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${templateMessage.includes('✓') ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '6px',
                  color: templateMessage.includes('✓') ? '#155724' : '#721c24',
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  {templateMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {templateCategories.map((cat) => (
                  <div key={cat.key} style={{
                    padding: '20px',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '6px 12px',
                          backgroundColor: cat.color,
                          color: '#ffffff',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '700',
                        }}>
                          {cat.label}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#666',
                        }}>
                          ({cat.key})
                        </span>
                      </div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}>
                        <input
                          type="checkbox"
                          checked={templateActive[cat.key] !== false}
                          onChange={(e) => setTemplateActive({
                            ...templateActive,
                            [cat.key]: e.target.checked,
                          })}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                          }}
                        />
                        Active
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Paste Google Drive share URL here..."
                      value={templateURLs[cat.key] || ''}
                      onChange={(e) => setTemplateURLs({
                        ...templateURLs,
                        [cat.key]: e.target.value,
                      })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #dee2e6',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: "'Inter', sans-serif",
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = cat.color
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${cat.color}20`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#dee2e6'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                    {templateURLs[cat.key] && (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#28a745', fontWeight: '600' }}>
                        ✓ URL configured
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 30px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  padding: '12px 24px',
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
                onClick={handleSaveTemplates}
                disabled={savingTemplates}
                style={{
                  padding: '12px 24px',
                  backgroundColor: savingTemplates ? '#6c757d' : '#28a745',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: savingTemplates ? 'not-allowed' : 'pointer',
                  opacity: savingTemplates ? 0.6 : 1,
                }}
              >
                {savingTemplates ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
