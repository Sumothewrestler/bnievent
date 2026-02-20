export default function ContactUs() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Contact Us</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>BNI Chettinad Event</h2>
        <p style={{ marginBottom: '10px' }}>For any queries or support regarding event registration, payments, or general inquiries, please reach out to us:</p>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Contact Information</h3>

        <div style={{ marginBottom: '15px' }}>
          <strong>Email:</strong>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>digitalflareup@gmail.com</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Phone:</strong>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>+91 94425 05671</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Response Time:</strong>
          <p style={{ margin: '5px 0' }}>Within 24-48 hours on business days</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#e7f3ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bee5eb' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Event Details</h3>

        <div style={{ marginBottom: '10px' }}>
          <strong>Event Name:</strong>
          <p style={{ margin: '5px 0' }}>BNI Chettinad</p>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Date:</strong>
          <p style={{ margin: '5px 0' }}>21st February 2026 (Sunday)</p>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Time:</strong>
          <p style={{ margin: '5px 0' }}>3:30 PM</p>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Venue:</strong>
          <p style={{ margin: '5px 0' }}>L.C.T.L Palaniappa Chettiar Memorial Auditorium, Karaikudi</p>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Registration Fee:</strong>
          <p style={{ margin: '5px 0' }}>Rs. 300 to Rs. 600 (varies by participant category)</p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>What We Can Help With</h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Event registration assistance</li>
          <li>Payment and transaction queries</li>
          <li>Technical support</li>
          <li>Ticket information</li>
          <li>Event details and schedule</li>
          <li>General inquiries</li>
        </ul>
      </div>

      <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffc107' }}>
        <p style={{ margin: 0 }}>
          <strong>Note:</strong> For policy information, please refer to our Terms & Conditions and Refund Policy pages.
        </p>
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
