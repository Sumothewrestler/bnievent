'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function FeedbackContent() {
  const searchParams = useSearchParams()
  const ticketParam = searchParams?.get('ticket') || ''

  const [ticketNo, setTicketNo] = useState(ticketParam)
  const [ticketVerified, setTicketVerified] = useState(false)
  const [attendeeName, setAttendeeName] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [overallRating, setOverallRating] = useState(0)
  const [venueRating, setVenueRating] = useState(0)
  const [foodRating, setFoodRating] = useState(0)
  const [speakerRating, setSpeakerRating] = useState(0)
  const [networkingRating, setNetworkingRating] = useState(0)
  const [organizationRating, setOrganizationRating] = useState(0)
  const [recommendationScore, setRecommendationScore] = useState(-1)
  const [likedMost, setLikedMost] = useState('')
  const [improvements, setImprovements] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')
  const [attendFuture, setAttendFuture] = useState('')

  // Verify ticket when component mounts
  useEffect(() => {
    if (ticketParam) {
      verifyTicket(ticketParam)
    }
  }, [ticketParam])

  const verifyTicket = async (ticket: string) => {
    if (!ticket) {
      setError('Please enter a ticket number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check if feedback already submitted
      const response = await fetch(
        `https://api.bnievent.rfidpro.in/api/feedback/check/${ticket}/`
      )
      const data = await response.json()

      if (data.submitted) {
        setFeedbackSubmitted(true)
        setError('Feedback has already been submitted for this ticket. Thank you!')
      } else {
        // Get attendee info
        const scanResponse = await fetch(
          `https://api.bnievent.rfidpro.in/api/scan-qr/${ticket}/`
        )
        const scanData = await scanResponse.json()

        if (scanResponse.ok && scanData.flow === 'feedback') {
          setTicketVerified(true)
          setAttendeeName(scanData.name)
        } else {
          setError('Invalid ticket number. Please check and try again.')
        }
      }
    } catch (err) {
      setError('Error connecting to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verifyTicket(ticketNo)
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()

    if (overallRating === 0) {
      setError('Please provide at least an overall rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        'https://api.bnievent.rfidpro.in/api/feedback/submit/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticket_no: ticketNo,
            overall_rating: overallRating,
            venue_rating: venueRating || null,
            food_rating: foodRating || null,
            speaker_rating: speakerRating || null,
            networking_rating: networkingRating || null,
            organization_rating: organizationRating || null,
            recommendation_score: recommendationScore >= 0 ? recommendationScore : null,
            liked_most: likedMost || null,
            improvements: improvements || null,
            additional_comments: additionalComments || null,
            attend_future: attendFuture || null,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setFeedbackSubmitted(true)
      } else {
        setError(data.error || 'Failed to submit feedback')
      }
    } catch (err) {
      setError('Error submitting feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const StarRating = ({
    rating,
    setRating,
    label,
  }: {
    rating: number
    setRating: (val: number) => void
    label: string
  }) => (
    <div style={{ marginBottom: '20px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#374151',
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            style={{
              fontSize: '32px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    </div>
  )

  const NPSScore = () => (
    <div style={{ marginBottom: '20px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#374151',
        }}
      >
        How likely are you to recommend this event? (0-10)
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(11, 1fr)',
          gap: '6px',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => setRecommendationScore(score)}
            style={{
              padding: '10px 6px',
              backgroundColor:
                recommendationScore === score ? '#667eea' : '#f3f4f6',
              color: recommendationScore === score ? '#ffffff' : '#1a1a1a',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (recommendationScore !== score) {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
              }
            }}
            onMouseOut={(e) => {
              if (recommendationScore !== score) {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
              }
            }}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )

  // Ticket entry screen
  if (!ticketVerified && !feedbackSubmitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
          padding: '15px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            padding: '32px 24px',
            maxWidth: '480px',
            width: '100%',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 0 8px 0',
                color: '#1a1a1a',
                letterSpacing: '-0.5px',
              }}
            >
              Event Feedback
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.5',
              }}
            >
              Enter your ticket number to provide feedback
            </p>
          </div>

          <form onSubmit={handleTicketSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '10px',
                  color: '#374151',
                  textAlign: 'left',
                }}
              >
                Ticket Number
              </label>
              <input
                type="text"
                value={ticketNo}
                onChange={(e) => setTicketNo(e.target.value.toUpperCase())}
                placeholder="e.g., BNI001"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: '#f9fafb',
                  color: '#1a1a1a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.currentTarget.style.border = '2px solid #667eea'
                    e.currentTarget.style.backgroundColor = '#ffffff'
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.currentTarget.style.border = '2px solid #e5e7eb'
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }
                }}
                autoFocus
              />
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#ef4444',
                    fontSize: '13px',
                    marginTop: '10px',
                    fontWeight: '500',
                  }}
                >
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#9ca3af' : '#667eea',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#5568d3'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow =
                    '0 6px 16px rgba(102, 126, 234, 0.4)'
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#667eea'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow =
                    '0 4px 12px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Thank you screen
  if (feedbackSubmitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
          padding: '15px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            padding: '48px 32px',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎉</div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              margin: '0 0 16px 0',
              color: '#28a745',
              letterSpacing: '-0.5px',
            }}
          >
            Thank You!
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: '#6b7280',
              margin: '0 0 32px 0',
              lineHeight: '1.6',
            }}
          >
            Your feedback has been submitted successfully. We appreciate your time
            and input!
          </p>
          <div
            style={{
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #86efac',
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                color: '#15803d',
                margin: 0,
                fontWeight: '500',
              }}
            >
              Your feedback helps us improve future events. We hope to see you
              again!
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Feedback form
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        fontFamily: "'Inter', sans-serif",
        padding: '20px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            padding: '24px',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <img
              src="/ez.gif"
              alt="BNI Event"
              style={{
                height: '80px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#1a1a1a',
              letterSpacing: '-0.5px',
            }}
          >
            Event Feedback
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: '#6b7280',
              margin: '0 0 16px 0',
            }}
          >
            Hi <strong>{attendeeName}</strong>, please share your experience
          </p>
          <div
            style={{
              display: 'inline-block',
              background: '#f3f4f6',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#6b7280',
              fontFamily: 'monospace',
            }}
          >
            Ticket: {ticketNo}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitFeedback}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              padding: '28px 24px',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: '20px',
                color: '#1a1a1a',
              }}
            >
              Rate Your Experience
            </h2>

            <StarRating
              rating={overallRating}
              setRating={setOverallRating}
              label="Overall Experience *"
            />
            <StarRating
              rating={speakerRating}
              setRating={setSpeakerRating}
              label="Speaker Quality *"
            />

            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                marginTop: '24px',
                paddingTop: '24px',
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#374151',
                  }}
                >
                  Are you willing to join BNI Chettinad to expand your business? *
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'YES', label: 'Yes', color: '#28a745' },
                    { value: 'MAYBE', label: 'May be', color: '#ffc107' },
                    { value: 'NO', label: 'No', color: '#dc3545' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAttendFuture(option.value)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor:
                          attendFuture === option.value
                            ? option.color
                            : '#f3f4f6',
                        color:
                          attendFuture === option.value ? '#ffffff' : '#1a1a1a',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        if (attendFuture !== option.value) {
                          e.currentTarget.style.backgroundColor = '#e5e7eb'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (attendFuture !== option.value) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6'
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  color: '#991b1b',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#9ca3af' : '#28a745',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#218838'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow =
                    '0 6px 16px rgba(40, 167, 69, 0.4)'
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#28a745'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow =
                    '0 4px 12px rgba(40, 167, 69, 0.3)'
                }
              }}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{fontSize: '48px', animation: 'spin 1s linear infinite'}}>🔄</div>
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  )
}
