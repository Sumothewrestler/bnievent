'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistrationForm() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    age: '',
    location: '',
    company_name: '',
    registration_for: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [eventName, setEventName] = useState('Register Now')

  const slides = [
    { src: '/event-banner.jpg', alt: 'Event Banner 1' },
    { src: '/event-banner-2.jpg', alt: 'Event Banner 2' }
  ]

  useEffect(() => {
    fetchEventSettings()
    initParticles()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideDirection(currentSlide === 0 ? 'left' : 'right')
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000) // Auto-swipe every 4 seconds

    return () => clearInterval(interval)
  }, [currentSlide, slides.length])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Prevent default form submission
  }

  const handlePayNow = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Step 1: Create registration
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          location: formData.location || null,
          company_name: formData.company_name || null,
          registration_for: formData.registration_for || null,
        }),
      })

      if (response.ok) {
        const registrationData = await response.json()

        // Step 2: Create payment order
        const paymentResponse = await fetch('https://api.bnievent.rfidpro.in/api/payment/create-order/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_id: registrationData.id,
          }),
        })

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json()

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
          setMessage('Unable to create payment order. Please contact support.')
        }
      } else {
        setMessage('Registration failed. Please try again.')
      }
    } catch (error) {
      setMessage('Error submitting registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePayLater = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Create registration with PENDING payment status
      const response = await fetch('https://api.bnievent.rfidpro.in/api/registrations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          location: formData.location || null,
          company_name: formData.company_name || null,
          registration_for: formData.registration_for || null,
        }),
      })

      if (response.ok) {
        const registrationData = await response.json()

        // Redirect to success page with ticket info
        router.push(`/registration/success?ticket_no=${registrationData.ticket_no}&status=PENDING`)
      } else {
        setMessage('Registration failed. Please try again.')
      }
    } catch (error) {
      setMessage('Error submitting registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
          <a href="https://dev.bnievent.rfidpro.in/home" className="header-logo-link">
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
        <h1 className="main-title">{eventName}</h1>

      {/* Event Banner Carousel */}
      <div className="carousel-container">
        <div className="carousel-wrapper">
          {slides.map((slide, index) => (
            <img
              key={index}
              src={slide.src}
              alt={slide.alt}
              className={`carousel-image ${index === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

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
          <label className="form-label">Registration For</label>
          <select
            name="registration_for"
            value={formData.registration_for}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select...</option>
            <option value="BNI_THALAIVAS">BNI Members - Thalaivas</option>
            <option value="BNI_CHETTINAD">BNI Members - Chettinad</option>
            <option value="BNI_MADURAI">BNI Members - Madurai</option>
            <option value="PUBLIC">Public</option>
            <option value="STUDENTS">Students</option>
          </select>
        </div>

        <div className="button-container">
          <button
            type="button"
            onClick={handlePayNow}
            disabled={loading}
            className="pay-now-button"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
          <button
            type="button"
            onClick={handlePayLater}
            disabled={loading}
            className="pay-later-button"
          >
            {loading ? 'Processing...' : 'Pay Later'}
          </button>
        </div>
      </form>

      {/* Footer with Policy Links */}
      <div style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '2px solid #dee2e6'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <a href="/admin" style={{ color: '#007bff', textDecoration: 'none', marginRight: '20px' }}>
            Admin Login
          </a>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <a href="/contact" style={{ color: '#007bff', textDecoration: 'none' }}>
            Contact Us
          </a>
          <span style={{ color: '#dee2e6' }}>|</span>
          <a href="/terms" style={{ color: '#007bff', textDecoration: 'none' }}>
            Terms & Conditions
          </a>
          <span style={{ color: '#dee2e6' }}>|</span>
          <a href="/refund-policy" style={{ color: '#007bff', textDecoration: 'none' }}>
            Refund & Cancellation Policy
          </a>
        </div>

        <p style={{ textAlign: 'center', fontSize: '14px', color: '#6c757d', margin: '10px 0' }}>
          © 2026 BOOK YOUR TICKETS. All rights reserved.
        </p>
      </div>
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
          transition: opacity 0.2s ease;
        }

        .header-logo:hover {
          opacity: 0.8;
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

        .main-title {
          text-align: center;
          margin-bottom: 30px;
          font-size: 2.25rem;
          font-weight: 700;
          color: #ff6600;
          font-family: 'Inter', sans-serif;
        }

        .button-container {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .pay-now-button,
        .pay-later-button {
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .pay-now-button {
          background-color: #28a745;
          color: #ffffff;
        }

        .pay-now-button:hover:not(:disabled) {
          background-color: #218838;
        }

        .pay-later-button {
          background-color: #ff6600;
          color: #ffffff;
        }

        .pay-later-button:hover:not(:disabled) {
          background-color: #e55a00;
        }

        .pay-now-button:active:not(:disabled),
        .pay-later-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .pay-now-button:disabled,
        .pay-later-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .carousel-container {
          margin-bottom: 30px;
          border-radius: 8px;
          overflow: hidden;
          border: 3px solid #ff6600;
        }

        .carousel-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 934 / 506;
          overflow: hidden;
          border-radius: 8px;
        }

        .carousel-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 8px;
          transition: opacity 1s ease-in-out;
          opacity: 0;
        }

        .carousel-image.active {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .header-logo {
            height: 50px;
          }

          .header-title {
            font-size: 1.5rem;
          }

          .main-title {
            font-size: 1.75rem;
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

          .pay-now-button,
          .pay-later-button {
            padding: 15px;
            font-size: 15px;
          }
        }

        @media (max-width: 480px) {
          .header-logo {
            height: 45px;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .main-title {
            font-size: 1.5rem;
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

          .button-container {
            flex-direction: column;
            gap: 12px;
          }

          .pay-now-button,
          .pay-later-button {
            padding: 14px;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
