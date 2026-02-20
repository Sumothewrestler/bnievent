'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [seatAvailability, setSeatAvailability] = useState<any>(null)
  const [sponsors, setSponsors] = useState<any>({ title_sponsors: [], associate_sponsors: [], co_sponsors: [] })
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [showCallModal, setShowCallModal] = useState(false)
  const [showVipPinModal, setShowVipPinModal] = useState(false)
  const [vipPin, setVipPin] = useState('')
  const [vipPinError, setVipPinError] = useState('')
  const [showSpecialPinModal, setShowSpecialPinModal] = useState(false)
  const [specialPinTarget, setSpecialPinTarget] = useState<'volunteer-registration' | 'organiser-registration'>('volunteer-registration')
  const [specialPin, setSpecialPin] = useState('')
  const [specialPinError, setSpecialPinError] = useState('')

  const slides = [
    { src: '/event-banner.jpg', alt: 'Event Banner 1' },
    { src: '/event-banner-2.jpg', alt: 'Event Banner 2' }
  ]

  useEffect(() => {
    fetchSeatAvailability()
    fetchSponsors()
    initParticles()

    // Refresh seat availability every 30 seconds
    const interval = setInterval(fetchSeatAvailability, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
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

  const fetchSponsors = async () => {
    try {
      const response = await fetch('https://api.bnievent.rfidpro.in/api/sponsors/active_sponsors/')
      if (response.ok) {
        const data = await response.json()
        setSponsors(data)
      }
    } catch (error) {
      console.error('Error fetching sponsors:', error)
    }
  }

  const handleScanClick = () => {
    setShowPinModal(true)
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === '5555') {
      setShowPinModal(false)
      setPin('')
      setPinError('')
      // Set authentication in sessionStorage
      sessionStorage.setItem('scanner_authenticated', 'true')
      // Open scanner page
      router.push('/scanner')
    } else {
      setPinError('Invalid PIN. Please try again.')
      setPin('')
    }
  }

  const handleVipPinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (vipPin === '5555') {
      setShowVipPinModal(false)
      setVipPin('')
      setVipPinError('')
      router.push('/vip-registration')
    } else {
      setVipPinError('Invalid PIN. Please try again.')
      setVipPin('')
    }
  }

  const handleSpecialPinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (specialPin === '5555') {
      setShowSpecialPinModal(false)
      setSpecialPin('')
      setSpecialPinError('')
      router.push(`/${specialPinTarget}`)
    } else {
      setSpecialPinError('Invalid PIN. Please try again.')
      setSpecialPin('')
    }
  }

  const openSpecialPinModal = (target: 'volunteer-registration' | 'organiser-registration') => {
    setSpecialPinTarget(target)
    setSpecialPin('')
    setSpecialPinError('')
    setShowSpecialPinModal(true)
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

      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '20px', paddingTop: '100px', position: 'relative', zIndex: 1 }}>
        <h1 className="main-title">BOOK YOUR TICKETS</h1>

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

      {/* Title Sponsors - Top Horizontal Scroll */}
      {sponsors.title_sponsors && sponsors.title_sponsors.length > 0 && (
        <div style={{
          marginBottom: '30px',
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            textAlign: 'center',
            color: '#ff6600',
            fontSize: '1.3rem',
            marginBottom: '15px',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            Title Sponsors
          </h3>
          <div className="sponsors-horizontal-scroll title-sponsors">
            <div className="sponsors-scroll-content">
              {[...sponsors.title_sponsors, ...sponsors.title_sponsors].map((sponsor: any, index: number) => (
                <div key={index} className="sponsor-logo-item">
                  <img
                    src={sponsor.direct_image_url}
                    alt={sponsor.company_name || 'Sponsor'}
                    style={{
                      maxWidth: '150px',
                      maxHeight: '80px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Choose Your Registration Type Section */}
      {seatAvailability && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          padding: '35px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '2px solid #e0e0e0',
          marginBottom: '20px'
        }}>
          {/* Section Title */}
          <h2 style={{
            textAlign: 'center',
            color: '#ff6600',
            fontSize: '1.8rem',
            marginBottom: '25px',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Choose Your Registration
          </h2>

          {/* Horizontal Booking Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignItems: 'stretch'
          }}>
            {/* Single Ticket Button */}
            <a
              href="/book-ticket"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                padding: '15px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 3px 12px rgba(40, 167, 69, 0.3)',
                transition: 'all 0.3s ease',
                border: '2px solid #28a745',
                flex: '1',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(40, 167, 69, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(40, 167, 69, 0.3)'
              }}
            >
              <span style={{
                fontSize: '1.5rem',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center'
              }}>🎫</span>
              <div style={{
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  lineHeight: '1.3'
                }}>
                  Single Ticket
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  opacity: 0.9,
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.3',
                  marginTop: '2px'
                }}>
                  Individual Registration
                </div>
              </div>
            </a>

            {/* Bulk Tickets Button */}
            <a
              href="/bulk-registration"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)',
                padding: '15px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 3px 12px rgba(255, 102, 0, 0.3)',
                transition: 'all 0.3s ease',
                border: '2px solid #ff6600',
                flex: '1',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(255, 102, 0, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(255, 102, 0, 0.3)'
              }}
            >
              <span style={{
                fontSize: '1.5rem',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center'
              }}>📋</span>
              <div style={{
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  lineHeight: '1.3'
                }}>
                  Bulk Tickets
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  opacity: 0.9,
                  fontWeight: '500',
                  lineHeight: '1.3',
                  marginTop: '2px'
                }}>
                  Group Registration
                </div>
              </div>
            </a>

            {/* BNI Ticket Button */}
            <a
              href="/bni-ticket"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                padding: '15px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 3px 12px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.3s ease',
                border: '2px solid #dc3545',
                flex: '1',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(220, 53, 69, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(220, 53, 69, 0.3)'
              }}
            >
              <span style={{
                fontSize: '1.5rem',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center'
              }}>🎟️</span>
              <div style={{
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  lineHeight: '1.3'
                }}>
                  BNI Ticket
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  opacity: 0.9,
                  fontWeight: '500',
                  lineHeight: '1.3',
                  marginTop: '2px'
                }}>
                  Special Registration
                </div>
              </div>
            </a>

            {/* VIP Tickets Button */}
            <button
              onClick={() => setShowVipPinModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
                padding: '15px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 3px 12px rgba(111, 66, 193, 0.3)',
                transition: 'all 0.3s ease',
                border: '2px solid #6f42c1',
                flex: '1',
                minWidth: '200px',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(111, 66, 193, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(111, 66, 193, 0.3)'
              }}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: '1', display: 'flex', alignItems: 'center' }}>👑</span>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', lineHeight: '1.3' }}>
                  VIP Tickets
                </div>
                <div style={{ color: '#ffffff', fontSize: '0.75rem', opacity: 0.9, fontWeight: '500', lineHeight: '1.3', marginTop: '2px' }}>
                  Exclusive Access
                </div>
              </div>
            </button>

            {/* Volunteers Button */}
            <button
              onClick={() => openSpecialPinModal('volunteer-registration')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                padding: '15px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 3px 12px rgba(243, 156, 18, 0.3)',
                transition: 'all 0.3s ease',
                border: '2px solid #f39c12',
                flex: '1',
                minWidth: '200px',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(243, 156, 18, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(243, 156, 18, 0.3)'
              }}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: '1', display: 'flex', alignItems: 'center' }}>🙋</span>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', lineHeight: '1.3' }}>
                  Volunteers
                </div>
                <div style={{ color: '#ffffff', fontSize: '0.75rem', opacity: 0.9, fontWeight: '500', lineHeight: '1.3', marginTop: '2px' }}>
                  Volunteer Registration
                </div>
              </div>
            </button>

            {/* Organisers Button */}
            <button
              onClick={() => openSpecialPinModal('organiser-registration')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                padding: '15px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 3px 12px rgba(231, 76, 60, 0.3)',
                transition: 'all 0.3s ease',
                border: '2px solid #e74c3c',
                flex: '1',
                minWidth: '200px',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 18px rgba(231, 76, 60, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(231, 76, 60, 0.3)'
              }}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: '1', display: 'flex', alignItems: 'center' }}>🧑‍💼</span>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', lineHeight: '1.3' }}>
                  Organisers
                </div>
                <div style={{ color: '#ffffff', fontSize: '0.75rem', opacity: 0.9, fontWeight: '500', lineHeight: '1.3', marginTop: '2px' }}>
                  Organiser Registration
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Event Details & Pricing Section */}
      <div style={{
        background: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e0e0e0',
        marginBottom: '20px'
      }}>
        <h2 style={{ textAlign: 'center', color: '#666666', fontSize: '1.5rem', marginBottom: '20px', fontWeight: 700, textTransform: 'uppercase' }}>
          Event Information & Pricing
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '15px', marginBottom: '10px' }}>
            <strong>Event:</strong> <span className="event-title-gradient">Our Network is Networth</span>
          </p>
          <p style={{ fontSize: '15px', marginBottom: '10px' }}>
            <strong>Date:</strong> 21st February 2026 (Saturday)
          </p>
          <p style={{ fontSize: '15px', marginBottom: '10px' }}>
            <strong>Time:</strong> 3:30 PM
          </p>
          <p style={{ fontSize: '15px', marginBottom: '10px' }}>
            <strong>Venue:</strong> L.C.T.L Palaniappa Chettiar Memorial Auditorium, Karaikudi
          </p>
          <p style={{ fontSize: '15px', marginBottom: '10px' }}>
            <strong>Enquiry:</strong> +91 81441 52323, +91 8098042228
          </p>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #ff6600'
        }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '15px', color: '#333', fontWeight: 600 }}>
            Registration Fees (INR)
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{
              padding: '15px',
              background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
              borderRadius: '4px',
              border: '2px solid #f39c12',
              boxShadow: '0 2px 8px rgba(243, 156, 18, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#2d3436' }}>Students</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#ffffff',
                  backgroundColor: '#e74c3c',
                  padding: '4px 10px',
                  borderRadius: '12px'
                }}>
                  LIMITED OFFER!
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#636e72', fontWeight: '500' }}>Early Bird offer for First 50 Students:</span>
                  <div>
                    <span style={{ fontSize: '13px', color: '#636e72', textDecoration: 'line-through', marginRight: '8px' }}>₹300</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>₹150</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#636e72', fontWeight: '500' }}>Regular Fee (After First 50 Students):</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2d3436' }}>₹300</span>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#636e72', marginTop: '10px', marginBottom: '0', fontStyle: 'italic' }}>
                * Hurry! Offer valid only for the first 50 student registrations
              </p>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px',
              background: '#ffffff',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <span style={{ fontSize: '14px' }}>Public</span>
              <span style={{ fontWeight: 'bold', color: '#28a745' }}>₹ 300</span>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '15px', marginBottom: '0' }}>
            * All prices are in Indian Rupees (INR). Registration fee is non-refundable.
          </p>
        </div>
      </div>

      {/* Live Seat Status Section - Students Only */}
      {seatAvailability && seatAvailability.Students && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          padding: '35px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '2px solid #e0e0e0',
          marginBottom: '20px'
        }}>
          {/* Section Title */}
          <h2 style={{
            textAlign: 'center',
            color: '#ff6600',
            fontSize: '1.8rem',
            marginBottom: '25px',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Live Seat Status - Students
          </h2>

          {/* Students Status */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '10px',
            marginBottom: '15px'
          }}>
            {/* Available Seats */}
            <div style={{
              background: seatAvailability.Students.remaining > 0
                ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)'
                : 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
              padding: '12px',
              borderRadius: '6px',
              border: seatAvailability.Students.remaining > 0
                ? '1.5px solid #28a745'
                : '1.5px solid #dc3545',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
              transition: 'transform 0.2s ease',
              cursor: 'default'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: seatAvailability.Students.remaining > 0 ? '#28a745' : '#dc3545',
                marginBottom: '4px',
                fontFamily: "'Inter', sans-serif"
              }}>
                {seatAvailability.Students.remaining}
              </div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: '600',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                {seatAvailability.Students.remaining > 0 ? '✓ Available' : '✗ Sold Out'}
              </div>
            </div>

            {/* Booked Seats */}
            <div style={{
              background: 'linear-gradient(135deg, #cfe2ff 0%, #b6d4fe 100%)',
              padding: '12px',
              borderRadius: '6px',
              border: '1.5px solid #0d6efd',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
              transition: 'transform 0.2s ease',
              cursor: 'default'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#0d6efd',
                marginBottom: '4px',
                fontFamily: "'Inter', sans-serif"
              }}>
                {seatAvailability.Students.booked}
              </div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: '600',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Registered
              </div>
            </div>

            {/* Total Capacity */}
            <div style={{
              background: 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)',
              padding: '12px',
              borderRadius: '6px',
              border: '1.5px solid #ffc107',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
              transition: 'transform 0.2s ease',
              cursor: 'default'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ff8800',
                marginBottom: '4px',
                fontFamily: "'Inter', sans-serif"
              }}>
                {seatAvailability.Students.capacity}
              </div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: '600',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Total Seats
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '12px' }}>
            <div style={{
              background: '#e9ecef',
              borderRadius: '8px',
              height: '8px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
                height: '100%',
                width: `${(seatAvailability.Students.booked / seatAvailability.Students.capacity) * 100}%`,
                borderRadius: '8px',
                transition: 'width 0.5s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'shimmer 2s infinite'
                }}></div>
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              marginTop: '6px',
              fontSize: '0.7rem',
              color: '#666',
              fontWeight: '600'
            }}>
              {((seatAvailability.Students.booked / seatAvailability.Students.capacity) * 100).toFixed(1)}% Filled
            </div>
          </div>
        </div>
      )}

      {/* Associate Sponsors - Middle Section */}
      {sponsors.associate_sponsors && sponsors.associate_sponsors.length > 0 && (
        <div style={{
          marginTop: '40px',
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            textAlign: 'center',
            color: '#ff6600',
            fontSize: '1.25rem',
            marginBottom: '15px',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            Associate Sponsors
          </h3>
          <div className="sponsors-horizontal-scroll associate-sponsors">
            <div className="sponsors-scroll-content">
              {[...sponsors.associate_sponsors, ...sponsors.associate_sponsors].map((sponsor: any, index: number) => (
                <div key={index} className="sponsor-logo-item">
                  <img
                    src={sponsor.direct_image_url}
                    alt={sponsor.company_name || 'Sponsor'}
                    style={{
                      maxWidth: '140px',
                      maxHeight: '70px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Co Sponsors - Bottom Marquee */}
      {sponsors.co_sponsors && sponsors.co_sponsors.length > 0 && (
        <div style={{
          marginTop: '40px',
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            textAlign: 'center',
            color: '#ff6600',
            fontSize: '1.2rem',
            marginBottom: '15px',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            Co Sponsors
          </h3>
          <div className="sponsors-marquee">
            <div className="sponsors-marquee-content">
              {[...sponsors.co_sponsors, ...sponsors.co_sponsors].map((sponsor: any, index: number) => (
                <div key={index} className="sponsor-logo-item">
                  <img
                    src={sponsor.direct_image_url}
                    alt={sponsor.company_name || 'Sponsor'}
                    style={{
                      maxWidth: '120px',
                      maxHeight: '60px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          © 2026 BNI CHETTINAD. All rights reserved.
        </p>
      </div>
      </div>

      {/* Floating Call Button - Left Side */}
      <button
        onClick={() => setShowCallModal(true)}
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '20px',
          width: '60px',
          height: '60px',
          backgroundColor: '#007bff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
          zIndex: 1000,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          animation: 'pulse 2s infinite',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.6)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)'
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </button>

      {/* Floating Scan Me Button - Right Side */}
      <button
        onClick={handleScanClick}
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '20px',
          width: '60px',
          height: '60px',
          backgroundColor: '#667eea',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          zIndex: 1000,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          animation: 'pulse 2s infinite',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="9" y2="9"></line>
          <line x1="15" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="15" x2="9" y2="15"></line>
          <line x1="15" y1="15" x2="15" y2="15"></line>
        </svg>
      </button>

      {/* Shared Special PIN Modal (Volunteers / Organisers) */}
      {showSpecialPinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px',
            maxWidth: '400px', width: '100%', padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                {specialPinTarget === 'volunteer-registration' ? '🙋' : '🧑‍💼'}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 10px 0',
                color: specialPinTarget === 'volunteer-registration' ? '#f39c12' : '#e74c3c' }}>
                {specialPinTarget === 'volunteer-registration' ? 'Volunteer Access' : 'Organiser Access'}
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#666', margin: 0 }}>
                Enter PIN to register as a {specialPinTarget === 'volunteer-registration' ? 'Volunteer' : 'Organiser'}
              </p>
            </div>
            <form onSubmit={handleSpecialPinSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                  PIN
                </label>
                <input
                  type="password"
                  value={specialPin}
                  onChange={(e) => setSpecialPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={4}
                  style={{
                    width: '100%', padding: '12px 16px',
                    border: specialPinError ? '2px solid #dc3545' : '1px solid #d0d0d0',
                    borderRadius: '6px', fontFamily: "'Inter', sans-serif",
                    textAlign: 'center', letterSpacing: '8px',
                    fontSize: '24px', fontWeight: '600',
                  }}
                  autoFocus
                />
                {specialPinError && (
                  <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                    {specialPinError}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowSpecialPinModal(false); setSpecialPin(''); setSpecialPinError('') }}
                  style={{
                    flex: 1, padding: '14px', backgroundColor: '#6c757d', color: '#ffffff',
                    border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '14px',
                    backgroundColor: specialPinTarget === 'volunteer-registration' ? '#f39c12' : '#e74c3c',
                    color: '#ffffff', border: 'none', borderRadius: '6px',
                    fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIP PIN Modal */}
      {showVipPinModal && (
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
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>👑</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 10px 0', color: '#6f42c1' }}>
                VIP Access
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#666', margin: 0 }}>
                Enter PIN to register VIP tickets
              </p>
            </div>
            <form onSubmit={handleVipPinSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                  PIN
                </label>
                <input
                  type="password"
                  value={vipPin}
                  onChange={(e) => setVipPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: vipPinError ? '2px solid #dc3545' : '1px solid #d0d0d0',
                    borderRadius: '6px',
                    fontFamily: "'Inter', sans-serif",
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                  }}
                  autoFocus
                />
                {vipPinError && (
                  <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                    {vipPinError}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowVipPinModal(false); setVipPin(''); setVipPinError('') }}
                  style={{
                    flex: 1, padding: '14px', backgroundColor: '#6c757d', color: '#ffffff',
                    border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '14px', backgroundColor: '#6f42c1', color: '#ffffff',
                    border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
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
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '15px',
              }}>
                📷
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 0 10px 0',
                color: '#333',
              }}>
                Scanner Access
              </h2>
              <p style={{
                fontSize: '0.95rem',
                color: '#666',
                margin: 0,
              }}>
                Enter PIN to access QR scanner
              </p>
            </div>

            <form onSubmit={handlePinSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#333',
                }}>
                  PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: pinError ? '2px solid #dc3545' : '1px solid #d0d0d0',
                    borderRadius: '6px',
                    fontFamily: "'Inter', sans-serif",
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                  }}
                  autoFocus
                />
                {pinError && (
                  <p style={{
                    color: '#dc3545',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}>
                    {pinError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false)
                    setPin('')
                    setPinError('')
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#6c757d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#667eea',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && (
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
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '15px',
              }}>
                📞
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 0 10px 0',
                color: '#333',
              }}>
                Contact Us
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: '#666',
                margin: 0,
              }}>
                Choose a number to call
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <a
                href="tel:+918144152323"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#333',
                  marginBottom: '12px',
                  border: '2px solid #e0e0e0',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff'
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                  e.currentTarget.style.borderColor = '#e0e0e0'
                  e.currentTarget.style.color = '#333'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>+91 81441 52323</span>
              </a>

              <a
                href="tel:+918098042228"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#333',
                  border: '2px solid #e0e0e0',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff'
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                  e.currentTarget.style.borderColor = '#e0e0e0'
                  e.currentTarget.style.color = '#333'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>+91 8098042228</span>
              </a>
            </div>

            <button
              onClick={() => setShowCallModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#6c757d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

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
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .header-logo-link:hover {
          transform: scale(1.05);
        }

        .header-logo {
          height: 65px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(255, 102, 0, 0.6))
                  drop-shadow(0 0 12px rgba(255, 102, 0, 0.4))
                  drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .header-title {
          font-size: 1.85rem;
          font-weight: 800;
          margin: 0;
          font-family: 'Inter', sans-serif;
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
          font-family: 'Inter', sans-serif;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-shadow: 2px 2px 4px rgba(255, 102, 0, 0.1);
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

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .event-title-gradient {
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: linear-gradient(90deg,
            #ff6600 0%,
            #ff9933 25%,
            #ffcc00 50%,
            #ff9933 75%,
            #ff6600 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 1s linear infinite;
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 0%;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }

        /* Simple Infinite Scroll - No Complexity */
        .sponsors-horizontal-scroll,
        .sponsors-marquee {
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .sponsors-scroll-content,
        .sponsors-marquee-content {
          display: flex;
          width: max-content;
        }

        /* Title Sponsors */
        .title-sponsors .sponsors-scroll-content {
          animation: scroll 25s linear infinite;
        }

        /* Associate Sponsors */
        .associate-sponsors .sponsors-scroll-content {
          animation: scroll 30s linear infinite;
        }

        /* Co Sponsors */
        .sponsors-marquee-content {
          animation: scroll 35s linear infinite;
        }

        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .sponsor-logo-item {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px 20px;
          margin: 0 15px;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .sponsors-horizontal-scroll:hover .sponsors-scroll-content,
        .sponsors-marquee:hover .sponsors-marquee-content {
          animation-play-state: paused;
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

          /* Standardize ALL section headings on tablet */
          h2, h3 {
            font-size: 1.25rem !important;
            letter-spacing: 0.5px !important;
          }

          /* Make buttons full width on tablets */
          a[href="/book-ticket"],
          a[href="/bulk-registration"],
          a[href="/bni-ticket"] {
            width: 100% !important;
            min-width: 100% !important;
          }

          /* Adjust sponsor logo sizes for mobile */
          .sponsor-logo-item {
            padding: 10px 15px !important;
            margin: 0 10px !important;
          }

          .sponsor-logo-item img {
            max-width: 100px !important;
            max-height: 50px !important;
          }

          /* Faster animations on mobile */
          .title-sponsors .sponsors-scroll-content {
            animation: scroll 18s linear infinite;
          }

          .associate-sponsors .sponsors-scroll-content {
            animation: scroll 22s linear infinite;
          }

          .sponsors-marquee-content {
            animation: scroll 25s linear infinite;
          }
        }

        @media (max-width: 480px) {
          .header-logo {
            height: 45px;
          }

          .header-title {
            font-size: 1.2rem;
          }

          .main-title {
            font-size: 1.6rem;
          }

          /* Adjust padding and font sizes for mobile */
          div[style*="maxWidth: 750px"] {
            padding: 15px !important;
          }

          /* Standardize ALL section headings on mobile - Professional & Consistent */
          h2, h3 {
            font-size: 1.05rem !important;
            letter-spacing: 0.4px !important;
            margin-bottom: 18px !important;
            padding: 0 5px !important;
            line-height: 1.4 !important;
          }

          /* Full width buttons on mobile */
          a[href="/book-ticket"],
          a[href="/bulk-registration"],
          a[href="/bni-ticket"] {
            width: 100% !important;
            min-width: 100% !important;
            padding: 12px 15px !important;
          }

          /* Adjust button text sizes */
          a[href="/book-ticket"] div,
          a[href="/bulk-registration"] div,
          a[href="/bni-ticket"] div {
            font-size: 0.9rem !important;
          }

          a[href="/book-ticket"] div div,
          a[href="/bulk-registration"] div div,
          a[href="/bni-ticket"] div div {
            font-size: 0.65rem !important;
          }

          /* Smaller sponsor logos on small mobile screens */
          .sponsor-logo-item {
            padding: 8px 12px !important;
            margin: 0 8px !important;
          }

          .sponsor-logo-item img {
            max-width: 80px !important;
            max-height: 40px !important;
          }

          /* Even faster animations on small mobile */
          .title-sponsors .sponsors-scroll-content {
            animation: scroll 15s linear infinite;
          }

          .associate-sponsors .sponsors-scroll-content {
            animation: scroll 18s linear infinite;
          }

          .sponsors-marquee-content {
            animation: scroll 20s linear infinite;
          }
        }

        @media (max-width: 380px) {
          /* Extra small mobile - Keep all headings consistent */
          h2, h3 {
            font-size: 0.95rem !important;
            letter-spacing: 0.3px !important;
            margin-bottom: 15px !important;
            padding: 0 3px !important;
            line-height: 1.35 !important;
          }

          .main-title {
            font-size: 1.4rem !important;
          }

          .header-title {
            font-size: 1.1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
