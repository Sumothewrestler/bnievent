export default function ContactUs() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Contact Us</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>BNI Event Registration</h2>
        <p style={{ marginBottom: '10px' }}>For any queries or support regarding event registration and payments, please reach out to us:</p>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Contact Information</h3>

        <div style={{ marginBottom: '15px' }}>
          <strong>Email:</strong>
          <p style={{ margin: '5px 0' }}>support@bnievent.com</p>
          <p style={{ margin: '5px 0' }}>info@bnievent.com</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Phone:</strong>
          <p style={{ margin: '5px 0' }}>+91 XXX XXX XXXX</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Business Hours:</strong>
          <p style={{ margin: '5px 0' }}>Monday - Friday: 9:00 AM - 6:00 PM</p>
          <p style={{ margin: '5px 0' }}>Saturday: 9:00 AM - 1:00 PM</p>
          <p style={{ margin: '5px 0' }}>Sunday: Closed</p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Support</h3>
        <p>For technical support, payment issues, or registration queries, our team is here to help you.</p>
        <p>Response time: Within 24 hours on business days.</p>
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
