'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Attendee {
  id: string
  name: string
  mobile_number: string
  email: string
  age: string
  location: string
  company_name: string
  registration_for: string
  student_id_card?: File | null
  student_id_preview?: string | null
}

export default function BulkRegistration() {
  const router = useRouter()
  const [primaryBooker, setPrimaryBooker] = useState({
    name: '',
    email: '',
    mobile: ''
  })
  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      id: '1',
      name: '',
      mobile_number: '',
      email: '',
      age: '',
      location: '',
      company_name: '',
      registration_for: ''
    }
  ])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [seatAvailability, setSeatAvailability] = useState<any>(null)

  const categoryPricing: { [key: string]: number } = {
    'BNI_THALAIVAS': 300,
    'BNI_CHETTINAD': 300,
    'BNI_MADURAI': 300,
    'PUBLIC': 300,
    'STUDENTS': 150
  }

  useEffect(() => {
    fetchSeatAvailability()
  }, [])

  const fetchSeatAvailability = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/seat_availability/')
      if (response.ok) {
        const data = await response.json()
        setSeatAvailability(data)
      }
    } catch (error) {
      console.error('Error fetching seat availability:', error)
    }
  }

  const addAttendee = () => {
    if (attendees.length >= 20) {
      setMessage('Maximum 20 attendees allowed per booking')
      return
    }
    const newAttendee: Attendee = {
      id: Date.now().toString(),
      name: '',
      mobile_number: '',
      email: '',
      age: '',
      location: '',
      company_name: '',
      registration_for: ''
    }
    setAttendees([...attendees, newAttendee])
  }

  const removeAttendee = (id: string) => {
    if (attendees.length === 1) {
      setMessage('At least one attendee is required')
      return
    }
    setAttendees(attendees.filter(a => a.id !== id))
  }

  const updateAttendee = (id: string, field: keyof Attendee, value: string) => {
    setAttendees(attendees.map(a => {
      if (a.id === id) {
        const updated = { ...a, [field]: value }
        // Clear student ID card when changing from STUDENTS category
        if (field === 'registration_for' && value !== 'STUDENTS') {
          updated.student_id_card = null
          updated.student_id_preview = null
        }
        return updated
      }
      return a
    }))
  }

  const handleFileChange = (attendeeId: string, file: File | null) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please upload a valid image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAttendees(attendees.map(a =>
          a.id === attendeeId ? { ...a, student_id_card: file, student_id_preview: reader.result as string } : a
        ))
      }
      reader.readAsDataURL(file)
      setMessage('')
    }
  }

  const clearStudentIdCard = (attendeeId: string) => {
    setAttendees(attendees.map(a =>
      a.id === attendeeId ? { ...a, student_id_card: null, student_id_preview: null } : a
    ))
  }

  const calculateTotal = () => {
    return attendees.reduce((total, attendee) => {
      const price = categoryPricing[attendee.registration_for] || 0
      return total + price
    }, 0)
  }

  const getCategoryBreakdown = () => {
    const breakdown: { [key: string]: { count: number; total: number } } = {}
    attendees.forEach(attendee => {
      if (attendee.registration_for) {
        const category = attendee.registration_for
        const price = categoryPricing[category] || 0
        if (!breakdown[category]) {
          breakdown[category] = { count: 0, total: 0 }
        }
        breakdown[category].count++
        breakdown[category].total += price
      }
    })
    return breakdown
  }

  // Helper function to retry payment order creation with exponential backoff
  const createPaymentOrderWithRetry = async (registrationId: number, amount: number, maxAttempts = 3) => {
    let lastError = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Creating payment order (attempt ${attempt}/${maxAttempts})`)

        const paymentResponse = await fetch('https://api.bnievent.rfidpro.in/api/payment/create-order/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_id: registrationId,
            amount: amount,
          }),
        })

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json()
          console.log('Payment order created successfully')
          return { success: true, data: paymentData }
        } else {
          const errorData = await paymentResponse.json().catch(() => ({}))
          lastError = errorData.error || 'Payment order creation failed'
          console.warn(`Attempt ${attempt} failed:`, lastError)

          // If it's a client error (400, 404, etc.), don't retry
          if (paymentResponse.status >= 400 && paymentResponse.status < 500) {
            return { success: false, error: lastError }
          }

          // For server errors (500+), retry with exponential backoff
          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
            console.log(`Retrying after ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      } catch (error: any) {
        lastError = error.message || 'Network error'
        console.error(`Attempt ${attempt} error:`, error)

        // Retry on network errors
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt - 1) * 1000
          console.log(`Retrying after ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    return { success: false, error: lastError || 'Failed after multiple attempts' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validate primary booker
    if (!primaryBooker.name || !primaryBooker.email || !primaryBooker.mobile) {
      setMessage('Please fill in all primary booker details')
      setLoading(false)
      return
    }

    // Validate attendees
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i]
      if (!attendee.name || !attendee.mobile_number || !attendee.email || !attendee.registration_for) {
        setMessage(`Please fill in all required fields for Attendee ${i + 1}`)
        setLoading(false)
        return
      }
      // Validate Student ID card for STUDENTS category
      if (attendee.registration_for === 'STUDENTS' && !attendee.student_id_card) {
        setMessage(`Please upload Student ID Card for Attendee ${i + 1} (Students category requires ID card)`)
        setLoading(false)
        return
      }
    }

    try {
      const allRegistrations: any[] = []
      let bookingGroupId = ''

      // Separate students (with ID cards) from non-students
      const studentsWithCards = attendees.filter(a => a.registration_for === 'STUDENTS' && a.student_id_card)
      const nonStudents = attendees.filter(a => a.registration_for !== 'STUDENTS' || !a.student_id_card)

      // Create individual registrations for students with ID cards
      for (const student of studentsWithCards) {
        const formData = new FormData()
        formData.append('name', student.name)
        formData.append('mobile_number', student.mobile_number)
        formData.append('email', student.email)
        formData.append('age', student.age || '25')
        formData.append('location', student.location || 'N/A')
        formData.append('company_name', student.company_name || 'N/A')
        formData.append('registration_for', student.registration_for)
        formData.append('amount', '150')
        if (student.student_id_card) {
          formData.append('student_id_card', student.student_id_card)
        }
        // Add primary booker info
        formData.append('primary_booker_name', primaryBooker.name)
        formData.append('primary_booker_email', primaryBooker.email)
        formData.append('primary_booker_mobile', primaryBooker.mobile)

        const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const regData = await response.json()
          allRegistrations.push(regData)
          if (!bookingGroupId) {
            bookingGroupId = `BG_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          }
        } else {
          const errorData = await response.json()
          setMessage(`Failed to register student: ${errorData.error || 'Please try again'}`)
          setLoading(false)
          return
        }
      }

      // Create bulk registration for non-students
      if (nonStudents.length > 0) {
        const response = await fetch('https://api.bnievent.rfidpro.in/api/bulk-registration/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            primary_booker: primaryBooker,
            attendees: nonStudents.map(a => ({
              name: a.name,
              mobile_number: a.mobile_number,
              email: a.email,
              age: a.age ? parseInt(a.age) : 25,
              location: a.location || 'N/A',
              company_name: a.company_name || 'N/A',
              registration_for: a.registration_for
            }))
          }),
        })

        if (response.ok) {
          const data = await response.json()
          allRegistrations.push(...data.registrations)
          if (!bookingGroupId) {
            bookingGroupId = data.booking_group_id
          }
        } else {
          const errorData = await response.json()
          setMessage(errorData.error || 'Registration failed. Please try again.')
          setLoading(false)
          return
        }
      }

      // Create payment order for all registrations with retry logic
      if (allRegistrations.length > 0) {
        const firstRegistration = allRegistrations[0]
        const totalAmount = calculateTotal()

        setMessage('Creating payment order...')
        const paymentResult = await createPaymentOrderWithRetry(firstRegistration.id, totalAmount, 3)

        if (paymentResult.success && paymentResult.data) {
          const paymentData = paymentResult.data

          // Store booking info in session storage
          sessionStorage.setItem('order_id', paymentData.order_id)
          sessionStorage.setItem('booking_group_id', bookingGroupId)
          sessionStorage.setItem('ticket_numbers', JSON.stringify(allRegistrations.map(r => r.ticket_no)))

          // Redirect to Cashfree payment
          const cashfree = (window as any).Cashfree({ mode: 'production' })
          const checkoutOptions = {
            paymentSessionId: paymentData.payment_session_id,
            redirectTarget: '_self'
          }
          cashfree.checkout(checkoutOptions)
        } else {
          setMessage(`Unable to create payment order: ${paymentResult.error}. Please try again or contact support.`)
        }
      } else {
        setMessage('No registrations were created. Please try again.')
      }
    } catch (error) {
      setMessage('Error submitting registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = calculateTotal()
  const categoryBreakdown = getCategoryBreakdown()

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header Bar */}
      <div className="header-bar">
        <div className="header-content">
          <a href="/" className="header-logo-link">
            <img src="/ez.gif" alt="BNI Event" className="header-logo" />
          </a>
          <h1 className="header-title">
            <span className="bni-text">BNI</span> <span className="chettinad-text">CHETTINAD</span>
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', paddingTop: '100px' }}>
        <h1 className="main-title">BULK TICKET BOOKING</h1>

        <div style={{
          background: 'linear-gradient(135deg, #fff9e6 0%, #fffbf0 100%)',
          padding: '20px 25px',
          borderRadius: '12px',
          border: '2px solid #ffc107',
          marginBottom: '25px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(255, 193, 7, 0.2)'
        }}>
          <p style={{ fontSize: '16px', color: '#856404', margin: 0, fontWeight: '600', lineHeight: '1.5' }}>
            📋 Book multiple tickets in one go! Perfect for families, groups, or organizations.
          </p>
          <p style={{ fontSize: '13px', color: '#856404', margin: '8px 0 0 0', fontWeight: '500', opacity: 0.9 }}>
            Save time by registering everyone together
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 15px',
            marginBottom: '20px',
            backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '6px',
            color: message.includes('success') ? '#155724' : '#721c24',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Primary Booker Section */}
          <div className="form-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(255, 102, 0, 0.3)'
              }}>
                1
              </div>
              <div>
                <h2 className="section-title" style={{ marginBottom: '5px' }}>Primary Booker Details</h2>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                  This person will receive all tickets and payment confirmation
                </p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  value={primaryBooker.name}
                  onChange={(e) => setPrimaryBooker({ ...primaryBooker, name: e.target.value })}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  value={primaryBooker.email}
                  onChange={(e) => setPrimaryBooker({ ...primaryBooker, email: e.target.value })}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Mobile *</label>
                <input
                  type="tel"
                  value={primaryBooker.mobile}
                  onChange={(e) => setPrimaryBooker({ ...primaryBooker, mobile: e.target.value })}
                  required
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Attendees Section */}
          <div className="form-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
              }}>
                2
              </div>
              <div>
                <h2 className="section-title" style={{ marginBottom: '5px', border: 'none', paddingBottom: 0 }}>Attendee Details</h2>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                  Add information for each person attending the event
                </p>
              </div>
            </div>

            {attendees.map((attendee, index) => (
              <div key={attendee.id} className="attendee-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#ff6600', margin: 0 }}>
                    Attendee {index + 1}
                  </h3>
                  {attendees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAttendee(attendee.id)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      value={attendee.name}
                      onChange={(e) => updateAttendee(attendee.id, 'name', e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Mobile *</label>
                    <input
                      type="tel"
                      value={attendee.mobile_number}
                      onChange={(e) => updateAttendee(attendee.id, 'mobile_number', e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      value={attendee.email}
                      onChange={(e) => updateAttendee(attendee.id, 'email', e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Category *</label>
                    <select
                      value={attendee.registration_for}
                      onChange={(e) => updateAttendee(attendee.id, 'registration_for', e.target.value)}
                      required
                      className="form-input"
                    >
                      <option value="">Select...</option>
                      <option value="STUDENTS">Students (₹150)</option>
                      <option value="PUBLIC">Public (₹300)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Age</label>
                    <input
                      type="number"
                      value={attendee.age}
                      onChange={(e) => updateAttendee(attendee.id, 'age', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      value={attendee.location}
                      onChange={(e) => updateAttendee(attendee.id, 'location', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    value={attendee.company_name}
                    onChange={(e) => updateAttendee(attendee.id, 'company_name', e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Student ID Card Upload - Only for STUDENTS category */}
                {attendee.registration_for === 'STUDENTS' && (
                  <div className="form-field" style={{ marginTop: '15px' }}>
                    <label className="form-label" style={{ color: '#dc3545' }}>
                      Student ID Card * (Required for Students)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        handleFileChange(attendee.id, file)
                      }}
                      className="form-input"
                      style={{ padding: '8px' }}
                    />
                    {attendee.student_id_preview && (
                      <div style={{
                        marginTop: '10px',
                        position: 'relative',
                        display: 'inline-block',
                        maxWidth: '300px'
                      }}>
                        <img
                          src={attendee.student_id_preview}
                          alt="Student ID Preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '6px',
                            border: '2px solid #28a745',
                            display: 'block'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => clearStudentIdCard(attendee.id)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addAttendee}
              className="add-attendee-btn"
            >
              + Add Another Person
            </button>
          </div>

          {/* Total Summary */}
          {totalAmount > 0 && (
            <div className="summary-card">
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '15px' }}>
                Booking Summary
              </h3>

              {Object.entries(categoryBreakdown).map(([category, data]) => (
                <div key={category} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {category.replace(/_/g, ' ')} ({data.count} {data.count === 1 ? 'person' : 'people'})
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    ₹{data.total}
                  </span>
                </div>
              ))}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '15px 0',
                marginTop: '10px',
                borderTop: '2px solid #28a745'
              }}>
                <span style={{ fontSize: '18px', fontWeight: '700', color: '#333' }}>
                  Total Amount
                </span>
                <span style={{ fontSize: '22px', fontWeight: '700', color: '#28a745' }}>
                  ₹{totalAmount}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || totalAmount === 0}
            className="submit-btn"
          >
            {loading ? 'Processing...' : `Pay ₹${totalAmount} Now`}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ color: '#007bff', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Single Registration
          </a>
        </div>
      </div>

      <style jsx>{`
        .header-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          z-index: 100;
          padding: 18px 0;
          border-bottom: 3px solid #ff6600;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-logo-link {
          display: block;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .header-logo-link:hover {
          transform: scale(1.05);
        }

        .header-logo {
          height: 65px;
          width: auto;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(255, 102, 0, 0.4),
                      0 0 25px rgba(255, 102, 0, 0.3),
                      0 0 35px rgba(255, 102, 0, 0.2);
          animation: logoGlow 2s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(255, 102, 0, 0.4),
                        0 0 25px rgba(255, 102, 0, 0.3),
                        0 0 35px rgba(255, 102, 0, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 102, 0, 0.6),
                        0 0 35px rgba(255, 102, 0, 0.5),
                        0 0 50px rgba(255, 102, 0, 0.3);
          }
        }

        .header-title {
          font-size: 1.85rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .bni-text {
          color: #ff0000;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .chettinad-text {
          color: #000000;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
        }

        .main-title {
          text-align: center;
          margin-bottom: 35px;
          font-size: 2.5rem;
          font-weight: 800;
          color: #ff6600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-shadow: 2px 2px 4px rgba(255, 102, 0, 0.1);
        }

        .form-section {
          background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
          padding: 35px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
          border: 2px solid #e8eaed;
          margin-bottom: 25px;
          transition: box-shadow 0.3s ease;
        }

        .form-section:hover {
          box-shadow: 0 6px 28px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .section-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: #ff6600;
          margin: 0 0 8px 0;
          padding-bottom: 12px;
          border-bottom: 3px solid #ff6600;
          display: inline-block;
          letter-spacing: 0.5px;
        }

        .attendee-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 25px;
          border-radius: 12px;
          border: 2px solid #dee2e6;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
        }

        .attendee-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: linear-gradient(180deg, #ff6600 0%, #ff8533 100%);
        }

        .attendee-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border-color: #ff6600;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }

        @media (max-width: 900px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-field {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .form-label {
          margin-bottom: 8px;
          color: #2c3e50;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          font-size: 12px;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #d0d7de;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s ease;
          background: #ffffff;
          box-sizing: border-box;
          max-width: 100%;
        }

        .form-input:hover {
          border-color: #a8b3c1;
        }

        .form-input:focus {
          outline: none;
          border-color: #ff6600;
          box-shadow: 0 0 0 4px rgba(255, 102, 0, 0.12);
          background: #fff;
        }

        .form-input::placeholder {
          color: #8b95a5;
          opacity: 1;
        }

        select.form-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 40px;
        }

        .remove-btn {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .remove-btn:hover {
          background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }

        .remove-btn:active {
          transform: translateY(0);
        }

        .add-attendee-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
          color: #ff6600;
          border: 3px dashed #ff6600;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(255, 102, 0, 0.1);
        }

        .add-attendee-btn:hover {
          background: linear-gradient(135deg, #fff3e6 0%, #ffe6cc 100%);
          border-color: #ff8533;
          color: #ff8533;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(255, 102, 0, 0.2);
        }

        .add-attendee-btn:active {
          transform: translateY(0);
        }

        .summary-card {
          background: linear-gradient(135deg, #f0fff4 0%, #d4f1e4 100%);
          padding: 30px;
          border-radius: 12px;
          border: 3px solid #28a745;
          box-shadow: 0 4px 20px rgba(40, 167, 69, 0.15);
          margin-bottom: 25px;
          position: relative;
          overflow: hidden;
        }

        .summary-card::before {
          content: '💰';
          position: absolute;
          top: 15px;
          right: 20px;
          font-size: 48px;
          opacity: 0.15;
        }

        .submit-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 20px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(40, 167, 69, 0.4);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
          cursor: not-allowed;
          opacity: 0.7;
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .header-logo {
            height: 50px;
          }

          .header-title {
            font-size: 1.4rem;
          }

          .main-title {
            font-size: 1.85rem;
            margin-bottom: 25px;
            letter-spacing: 1px;
          }

          .form-section {
            padding: 18px 14px;
            margin-bottom: 20px;
          }

          .section-title {
            font-size: 1.25rem;
          }

          .attendee-card {
            padding: 16px 14px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 14px;
            margin-bottom: 14px;
          }

          .form-field {
            margin-bottom: 0;
            width: 100%;
          }

          .form-label {
            margin-bottom: 6px;
            font-size: 12px;
          }

          .form-input {
            padding: 12px 14px;
            font-size: 15px;
            width: 100%;
          }

          .submit-btn {
            font-size: 16px;
            padding: 15px;
          }

          .summary-card {
            padding: 18px 14px;
          }
        }

        @media (max-width: 480px) {
          div[style*="maxWidth: 1100px"] {
            padding: 20px 10px !important;
            padding-top: 90px !important;
          }

          .header-bar {
            padding: 10px 0;
          }

          .header-content {
            padding: 0 10px;
            gap: 10px;
          }

          .header-logo {
            height: 38px;
          }

          .header-title {
            font-size: 1rem;
          }

          .main-title {
            font-size: 1.4rem;
            margin-bottom: 18px;
            letter-spacing: 0.5px;
          }

          .form-section {
            padding: 14px 10px;
            margin-bottom: 14px;
          }

          .section-title {
            font-size: 1.1rem;
            padding-bottom: 6px;
          }

          .attendee-card {
            padding: 14px 10px;
            margin-bottom: 14px;
          }

          .attendee-card::before {
            width: 3px;
          }

          .form-row {
            gap: 12px;
            margin-bottom: 12px;
          }

          .form-field {
            margin-bottom: 0;
            width: 100%;
          }

          .form-label {
            margin-bottom: 5px;
            font-size: 11px;
          }

          .form-input {
            padding: 11px 12px;
            font-size: 14px;
            border-width: 2px;
            width: 100%;
          }

          select.form-input {
            background-position: right 10px center;
            padding-right: 38px;
          }

          .remove-btn {
            padding: 6px 12px;
            font-size: 11px;
          }

          .add-attendee-btn {
            padding: 13px;
            font-size: 13px;
            border-width: 2px;
          }

          .submit-btn {
            font-size: 15px;
            padding: 14px;
            letter-spacing: 0.8px;
          }

          .summary-card {
            padding: 16px 10px;
          }

          .summary-card h3 {
            font-size: 15px;
            margin-bottom: 10px;
          }

          .summary-card::before {
            font-size: 36px;
            top: 10px;
            right: 15px;
          }
        }
      `}</style>
    </div>
  )
}
