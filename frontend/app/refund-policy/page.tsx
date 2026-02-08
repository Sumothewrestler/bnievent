export default function RefundPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Refund & Cancellation Policy</h1>

      <div style={{ lineHeight: '1.6', fontSize: '15px' }}>
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Cancellation Policy</h2>
          <p>We understand that plans can change. Our cancellation policy is designed to be fair to both participants and organizers.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Cancellation by Participant</h2>

          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Cancellation Timeline:</h3>
            <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>More than 7 days before event:</strong> Full refund (100%)
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>4-7 days before event:</strong> 50% refund
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Less than 4 days before event:</strong> No refund
              </li>
            </ul>
          </div>

          <p>To request a cancellation, please contact us at support@bnievent.com with your ticket number and registration details.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Cancellation by Organizer</h2>
          <p>If the event is cancelled by the organizers for any reason:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Participants will be notified via email immediately</li>
            <li style={{ marginBottom: '8px' }}>Full refund (100%) will be processed within 7-10 business days</li>
            <li style={{ marginBottom: '8px' }}>Alternative event dates may be offered</li>
          </ul>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Refund Process</h2>
          <p>Refunds will be processed through the original payment method used during registration.</p>

          <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid #ffc107' }}>
            <p style={{ margin: 0 }}>
              <strong>Processing Time:</strong> Refunds typically take 7-10 business days to reflect in your account, depending on your bank or payment provider.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Non-Refundable Items</h2>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Payment gateway charges</li>
            <li style={{ marginBottom: '8px' }}>Administrative fees (if applicable)</li>
            <li style={{ marginBottom: '8px' }}>No-show without prior cancellation</li>
          </ul>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>How to Request a Refund</h2>
          <ol style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Email us at: support@bnievent.com</li>
            <li style={{ marginBottom: '8px' }}>Include your ticket number and registration details</li>
            <li style={{ marginBottom: '8px' }}>Provide reason for cancellation</li>
            <li style={{ marginBottom: '8px' }}>Our team will review and respond within 24-48 hours</li>
          </ol>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Pricing Information</h2>
          <p>All registration fees are listed in Indian Rupees (INR). The pricing includes:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Event entry</li>
            <li style={{ marginBottom: '8px' }}>Materials and resources (if applicable)</li>
            <li style={{ marginBottom: '8px' }}>Refreshments (as specified in event details)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Contact Us</h2>
          <p>For any questions regarding refunds or cancellations:</p>
          <p><strong>Email:</strong> support@bnievent.com</p>
          <p><strong>Response Time:</strong> Within 24-48 hours on business days</p>
        </section>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 30px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
