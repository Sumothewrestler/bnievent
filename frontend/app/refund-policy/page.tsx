export default function RefundPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#dc3545' }}>Refund & Cancellation Policy</h1>

      <div style={{ lineHeight: '1.6', fontSize: '15px' }}>
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>No Refund Policy</h2>
          <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', border: '2px solid #ffc107', marginBottom: '15px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>
              Please note: All registrations are non-refundable and non-transferable.
            </p>
          </div>
          <p>Once payment is completed and registration is confirmed, no refunds will be issued under any circumstances. We encourage you to ensure your availability before completing your registration.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Event Details</h2>
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ marginBottom: '10px' }}><strong>Date:</strong> 21st February 2026 (Sunday)</p>
            <p style={{ marginBottom: '10px' }}><strong>Time:</strong> 3:30 PM</p>
            <p style={{ marginBottom: '10px' }}><strong>Venue:</strong> L.C.T.L Palaniappa Chettiar Memorial Auditorium, Karaikudi</p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Registration Fees</h2>
          <p>Registration fees vary based on participant category, ranging from <strong>Rs. 300 to Rs. 600</strong>. The fee structure is determined by the type of participant and their eligibility.</p>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
            <p style={{ margin: 0 }}>
              <strong>Note:</strong> All fees are listed in Indian Rupees (INR) and must be paid in full at the time of registration.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Cancellation by Organizer</h2>
          <p>If the event is cancelled by the organizers for any reason:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Participants will be notified via email and phone immediately</li>
            <li style={{ marginBottom: '8px' }}>Full refund (100%) will be processed within 7-10 business days</li>
            <li style={{ marginBottom: '8px' }}>Alternative event dates may be offered</li>
          </ul>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>What's Included</h2>
          <p>Your registration fee includes:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Event entry and participation</li>
            <li style={{ marginBottom: '8px' }}>Materials and resources (if applicable)</li>
            <li style={{ marginBottom: '8px' }}>Refreshments (as specified in event details)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Payment Gateway</h2>
          <p>We accept payments through our secure payment gateway powered by Cashfree. Payment gateway charges, if any, are included in the registration fee and are non-refundable.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Contact Us</h2>
          <p>For any questions regarding this policy or event details:</p>
          <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
            <p style={{ marginBottom: '8px' }}><strong>Email:</strong> digitalflareup@gmail.com</p>
            <p style={{ marginBottom: '8px' }}><strong>Phone:</strong> +91 94425 05671</p>
            <p style={{ margin: 0 }}><strong>Response Time:</strong> Within 24-48 hours on business days</p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <div style={{ backgroundColor: '#d1ecf1', padding: '15px', borderRadius: '8px', border: '1px solid #bee5eb' }}>
            <p style={{ margin: 0 }}>
              <strong>Important:</strong> By completing your registration and payment, you acknowledge and agree to this no refund policy.
            </p>
          </div>
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
