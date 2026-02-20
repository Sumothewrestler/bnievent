'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistrationForm() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    age: '',
    location: '',
    company_name: '',
    referred_by: '',
    registration_for: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [eventName, setEventName] = useState('Book Your Ticket')
  const [selectedAmount, setSelectedAmount] = useState<number>(0)
  const [studentIdCard, setStudentIdCard] = useState<File | null>(null)
  const [studentIdPreview, setStudentIdPreview] = useState<string | null>(null)
  const [seatAvailability, setSeatAvailability] = useState<any>(null)

  // Pricing mapping
  const categoryPricing: { [key: string]: number } = {
    'BNI_THALAIVAS': 300,
    'BNI_CHETTINAD': 300,
    'BNI_MADURAI': 300,
    'PUBLIC': 300,
    'STUDENTS': 150
  }

  useEffect(() => {
    fetchEventSettings()
    fetchSeatAvailability()
    initParticles()

    // Refresh seat availability every 30 seconds
    const interval = setInterval(fetchSeatAvailability, 30000)
    return () => clearInterval(interval)
  }, [])

  const initParticles = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      canvasWidth: number
      canvasHeight: number

      constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.radius = Math.random() * 2 + 1
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        if (this.x < 0 || this.x > this.canvasWidth) this.vx *= -1
        if (this.y < 0 || this.y > this.canvasHeight) this.vy *= -1
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'
        ctx.fill()
      }
    }

    const particles: Particle[] = []
    const particleCount = 100
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height))
    }

    const drawConnections = () => {
      if (!ctx) return
      const maxDistance = 150

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance
            ctx.beginPath()
            ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.3})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const animate = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      drawConnections()
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }

  const fetchEventSettings = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/settings/')
      if (response.ok) {
        const data = await response.json()
        if (data.logo_url) {
          setLogo(data.logo_url)
        }
        // Not fetching event_name - using hardcoded "BOOK YOUR TICKETS"
      }
    } catch (error) {
      console.error('Error fetching event settings:', error)
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Prevent default form submission
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

  const handlePayNow = async () => {
    setLoading(true)
    setMessage('')

    // Validate required fields
    if (!formData.name || !formData.mobile_number || !formData.email) {
      setMessage('Please fill in all required fields: Name, Mobile Number, and Email')
      setLoading(false)
      return
    }

    // Validate registration category selection
    if (!formData.registration_for || selectedAmount === 0) {
      setMessage('Please select a registration category')
      setLoading(false)
      return
    }

    // Validate mobile number format (basic check)
    if (formData.mobile_number.length < 10) {
      setMessage('Please enter a valid 10-digit mobile number')
      setLoading(false)
      return
    }

    // Validate Student ID card for STUDENTS category
    if (formData.registration_for === 'STUDENTS' && !studentIdCard) {
      setMessage('Please upload your Student ID card to register as a Student')
      setLoading(false)
      return
    }

    try {
      // Step 1: Create registration with FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('mobile_number', formData.mobile_number)
      formDataToSend.append('email', formData.email)
      if (formData.age) formDataToSend.append('age', formData.age)
      if (formData.location) formDataToSend.append('location', formData.location)
      if (formData.company_name) formDataToSend.append('company_name', formData.company_name)
      if (formData.referred_by) formDataToSend.append('referred_by', formData.referred_by)
      if (formData.registration_for) formDataToSend.append('registration_for', formData.registration_for)
      formDataToSend.append('amount', selectedAmount.toString())
      if (studentIdCard) formDataToSend.append('student_id_card', studentIdCard)

      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        method: 'POST',
        body: formDataToSend,
      })

      if (response.ok) {
        const registrationData = await response.json()

        // Step 2: Create payment order with retry logic
        setMessage('Creating payment order...')
        const paymentResult = await createPaymentOrderWithRetry(registrationData.id, selectedAmount, 3)

        if (paymentResult.success && paymentResult.data) {
          const paymentData = paymentResult.data

          // Step 3: Use Cashfree SDK to redirect to payment page
          if (paymentData.payment_session_id) {
            // Store order_id and ticket_no in session storage for success page
            sessionStorage.setItem('order_id', paymentData.order_id)
            sessionStorage.setItem('ticket_no', registrationData.ticket_no)

            // Load Cashfree SDK and redirect
            const cashfree = (window as any).Cashfree({ mode: 'production' })
            const checkoutOptions = {
              paymentSessionId: paymentData.payment_session_id,
              redirectTarget: '_self'
            }
            cashfree.checkout(checkoutOptions)
          } else {
            setMessage('Payment initialization failed. Please contact support.')
          }
        } else {
          setMessage(`Unable to create payment order: ${paymentResult.error}. Please try again or contact support.`)
        }
      } else {
        // Get detailed error message from backend
        try {
          const errorData = await response.json()
          console.error('Registration error:', errorData)

          // Show specific error messages
          if (errorData.student_id_card) {
            setMessage(errorData.student_id_card[0] || errorData.student_id_card)
          } else if (errorData.error) {
            setMessage(errorData.error)
          } else if (errorData.detail) {
            setMessage(errorData.detail)
          } else if (errorData.mobile_number) {
            setMessage('Mobile number: ' + (errorData.mobile_number[0] || errorData.mobile_number))
          } else if (errorData.email) {
            setMessage('Email: ' + (errorData.email[0] || errorData.email))
          } else if (errorData.name) {
            setMessage('Name: ' + (errorData.name[0] || errorData.name))
          } else if (errorData.registration_for) {
            setMessage('Registration category: ' + (errorData.registration_for[0] || errorData.registration_for))
          } else {
            setMessage('Registration failed. Please check all required fields and try again.')
          }
        } catch (e) {
          setMessage('Registration failed. Please check your internet connection and try again.')
        }
      }
    } catch (error) {
      setMessage('Error submitting registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })

    // Update selected amount when registration category changes
    if (name === 'registration_for') {
      setSelectedAmount(categoryPricing[value] || 0)
      // Clear student ID if changing from Students category
      if (value !== 'STUDENTS') {
        setStudentIdCard(null)
        setStudentIdPreview(null)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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

      setStudentIdCard(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setStudentIdPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setMessage('')
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.3 }}
      />

      {/* Header Bar with Logo */}
      <div className="header-bar">
        <div className="header-content">
          <a href="https://bnichettinad.cloud/home" className="header-logo-link">
            <img
              src="/ez.gif"
              alt="BNI Event"
              className="header-logo"
            />
          </a>
          <h1 className="header-title">
            <span className="bni-text">BNI</span> <span className="chettinad-text">CHETTINAD</span>
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '20px', paddingTop: '100px', position: 'relative', zIndex: 1 }}>
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('successful') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('successful') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.includes('successful') ? '#155724' : '#721c24',
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        <h2 className="form-title">Registration Details</h2>

        <div className="form-field">
          <label className="form-label">Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Mobile Number *</label>
          <input
            type="tel"
            name="mobile_number"
            value={formData.mobile_number}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Email ID *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Age</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Company Name</label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Referred By</label>
          <select
            name="referred_by"
            value={formData.referred_by}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select...</option>
            <option value="BNI_MEMBERS">BNI Members</option>
            <option value="FLEX">Flex</option>
            <option value="SOCIAL_MEDIA">Social Media</option>
            <option value="FRIENDS">Friends</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Registration For</label>
          <select
            name="registration_for"
            value={formData.registration_for}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select...</option>
            <option
              value="STUDENTS"
              disabled={seatAvailability?.categories?.STUDENTS?.available === false}
            >
              Students (₹150)
            </option>
            <option
              value="PUBLIC"
              disabled={seatAvailability?.categories?.PUBLIC?.available === false}
            >
              Public (₹300)
            </option>
          </select>
        </div>

        {/* Student ID Card Upload - Only show for STUDENTS category */}
        {formData.registration_for === 'STUDENTS' && (
          <div className="form-field">
            <label className="form-label">Student ID Card * (Required for Students)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="form-input"
              style={{ padding: '10px 16px' }}
            />
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', marginBottom: '0' }}>
              Upload a clear photo of your Student ID card (Max 5MB, JPG/PNG)
            </p>
            {studentIdPreview && (
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#28a745' }}>
                  Preview:
                </p>
                <img
                  src={studentIdPreview}
                  alt="Student ID Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '8px',
                    border: '2px solid #28a745',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Display Selected Amount */}
        {selectedAmount > 0 && (
          <div style={{
            background: '#e7f7ed',
            padding: '15px',
            borderRadius: '8px',
            border: '2px solid #28a745',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#28a745',
              margin: 0
            }}>
              Registration Fee: ₹{selectedAmount}
            </p>
          </div>
        )}

        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={handlePayNow}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#28a745',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '700',
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease, transform 0.1s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#218838'
            }}
            onMouseOut={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#28a745'
            }}
            onMouseDown={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(1px)'
            }}
            onMouseUp={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>

        {/* Registration Closed Notification */}
        {seatAvailability && !seatAvailability.registration_enabled && (
          <div style={{
            marginTop: '20px',
            padding: '15px 20px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)'
          }}>
            <p style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#856404',
              margin: 0,
              fontFamily: "'Inter', sans-serif"
            }}>
              ⚠️ Registration is currently closed.
            </p>
          </div>
        )}
      </form>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .header-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 100;
          padding: 15px 0;
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
          text-decoration: none;
        }

        .header-logo {
          height: 60px;
          width: auto;
          object-fit: contain;
          border-radius: 8px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          box-shadow: 0 0 15px rgba(255, 102, 0, 0.6),
                      0 0 25px rgba(255, 102, 0, 0.4),
                      0 0 35px rgba(255, 102, 0, 0.3);
          animation: logoGlow 2s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(255, 102, 0, 0.6),
                        0 0 25px rgba(255, 102, 0, 0.4),
                        0 0 35px rgba(255, 102, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 102, 0, 0.8),
                        0 0 35px rgba(255, 102, 0, 0.6),
                        0 0 50px rgba(255, 102, 0, 0.4);
          }
        }

        .header-logo-link:hover .header-logo {
          transform: scale(1.05);
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          font-family: 'Inter', sans-serif;
        }

        .bni-text {
          color: #ff0000;
        }

        .chettinad-text {
          color: #000000;
        }

        .registration-form {
          background: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e0e0e0;
        }

        .form-field {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #333333;
          font-weight: 500;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          background: #ffffff;
        }

        .form-input:focus {
          outline: none;
          border-color: #ff6600;
          box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
        }

        .form-title {
          text-align: center;
          margin: 0 0 30px 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #ff6600;
          font-family: 'Inter', sans-serif;
        }

        @media (max-width: 768px) {
          .header-logo {
            height: 50px;
          }

          .header-title {
            font-size: 1.5rem;
          }

          .registration-form {
            padding: 30px 25px;
          }

          .form-title {
            font-size: 1.5rem;
          }

          .form-input {
            padding: 13px 14px;
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .header-logo {
            height: 45px;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .registration-form {
            padding: 25px 20px;
          }

          .form-title {
            font-size: 1.25rem;
          }

          .form-field {
            margin-bottom: 20px;
          }

          .form-input {
            padding: 13px 14px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}
