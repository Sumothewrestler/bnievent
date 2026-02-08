'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [ticketNo, setTicketNo] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      // Get order_id from URL or session storage
      let orderId = searchParams.get('order_id')

      if (!orderId) {
        orderId = sessionStorage.getItem('order_id')
      }

      const storedTicketNo = sessionStorage.getItem('ticket_no')

      if (!orderId) {
        setStatus('failed')
        setMessage('Invalid payment session')
        return
      }

      // Verify payment with backend
      const response = await fetch('https://api.bnievent.rfidpro.in/api/payment/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        if (data.payment_status === 'SUCCESS') {
          setStatus('success')
          setTicketNo(data.ticket_no || storedTicketNo || '')
          setMessage('Payment successful! Your registration is confirmed.')

          // Clear session storage
          sessionStorage.removeItem('order_id')
          sessionStorage.removeItem('ticket_no')
        } else {
          setStatus('failed')
          setMessage('Payment failed or pending. Please contact support if amount was deducted.')
        }
      } else {
        setStatus('failed')
        setMessage('Unable to verify payment. Please contact support.')
      }
    } catch (error) {
      setStatus('failed')
      setMessage('Error verifying payment. Please contact support.')
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
      {status === 'loading' && (
        <div>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }} />
          <h2>Verifying Payment...</h2>
          <p>Please wait while we confirm your payment.</p>
        </div>
      )}

      {status === 'success' && (
        <div style={{
          padding: '30px',
          backgroundColor: '#d4edda',
          border: '2px solid #28a745',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>✓</div>
          <h1 style={{ color: '#155724', marginBottom: '20px' }}>Payment Successful!</h1>
          <p style={{ fontSize: '18px', color: '#155724', marginBottom: '30px' }}>
            {message}
          </p>
          {ticketNo && (
            <div style={{
              padding: '20px',
              backgroundColor: 'white',
              border: '2px dashed #28a745',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Your Ticket Number</p>
              <h2 style={{ color: '#007bff', margin: 0, fontSize: '32px' }}>{ticketNo}</h2>
            </div>
          )}
          <p style={{ fontSize: '14px', color: '#666' }}>
            Please save your ticket number for future reference.
          </p>
          <div style={{ marginTop: '30px' }}>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 30px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '16px',
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div style={{
          padding: '30px',
          backgroundColor: '#f8d7da',
          border: '2px solid #dc3545',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>✗</div>
          <h1 style={{ color: '#721c24', marginBottom: '20px' }}>Payment Failed</h1>
          <p style={{ fontSize: '18px', color: '#721c24', marginBottom: '30px' }}>
            {message}
          </p>
          <div style={{ marginTop: '30px' }}>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 30px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                marginRight: '10px',
              }}
            >
              Try Again
            </a>
            <a
              href="mailto:support@bnievent.com"
              style={{
                display: 'inline-block',
                padding: '12px 30px',
                backgroundColor: '#6c757d',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '16px',
              }}
            >
              Contact Support
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px',
        }} />
        <h2>Loading...</h2>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
