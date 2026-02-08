'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoUpload() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [eventName, setEventName] = useState('BNI Event')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/admin')
      return
    }

    fetchCurrentSettings()
  }, [router])

  const fetchCurrentSettings = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/settings/')
      if (response.ok) {
        const data = await response.json()
        setCurrentLogo(data.logo_url)
        setEventName(data.event_name || 'BNI Event')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const token = localStorage.getItem('access_token')
    const formData = new FormData()

    if (file) {
      formData.append('logo', file)
    }
    formData.append('event_name', eventName)

    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/settings/1/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMessage('Logo and event name updated successfully!')
        setCurrentLogo(data.logo_url)
        setFile(null)
        setPreview(null)
      } else {
        setMessage('Failed to update logo. Please try again.')
      }
    } catch (error) {
      setMessage('Error uploading logo. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
      }}>
        <h1>Event Logo & Settings</h1>
        <button
          onClick={handleBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.includes('success') ? '#155724' : '#721c24',
        }}>
          {message}
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '30px',
      }}>
        {currentLogo && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px' }}>Current Logo</h3>
            <img
              src={currentLogo}
              alt="Current Event Logo"
              style={{
                maxWidth: '300px',
                maxHeight: '200px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
              }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontWeight: 'bold',
              fontSize: '16px',
            }}>
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontWeight: 'bold',
              fontSize: '16px',
            }}>
              Upload New Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <p style={{
              marginTop: '5px',
              fontSize: '12px',
              color: '#666',
            }}>
              Recommended: PNG or JPG, max size 2MB
            </p>
          </div>

          {preview && (
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ marginBottom: '10px' }}>Preview</h3>
              <img
                src={preview}
                alt="Logo Preview"
                style={{
                  maxWidth: '300px',
                  maxHeight: '200px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Uploading...' : 'Update Logo & Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
