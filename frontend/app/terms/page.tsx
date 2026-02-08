export default function TermsAndConditions() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Terms & Conditions</h1>

      <div style={{ lineHeight: '1.6', fontSize: '15px' }}>
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>1. Event Registration</h2>
          <p>By registering for the BNI Event, you agree to provide accurate and complete information. All registrations are subject to approval and availability.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>2. Payment Terms</h2>
          <p>All registration fees must be paid in full at the time of registration. We accept payments through our secure payment gateway powered by Cashfree.</p>
          <p>Fees are listed in Indian Rupees (INR) only.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>3. Registration Confirmation</h2>
          <p>Upon successful payment, you will receive a confirmation email with your ticket number. Please keep this for your records and event entry.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>4. Event Attendance</h2>
          <p>Your registration ticket is valid only for the registered participant. Tickets are non-transferable unless explicitly stated otherwise.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>5. Cancellation Policy</h2>
          <p>Event cancellations or changes by the organizer will be communicated via email. Please refer to our Refund & Cancellation Policy for details on refunds.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>6. Privacy & Data Protection</h2>
          <p>We respect your privacy. Personal information collected during registration will be used solely for event management and will not be shared with third parties without your consent.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>7. Liability</h2>
          <p>The event organizers are not responsible for any loss, damage, or injury occurring during the event. Participants attend at their own risk.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>8. Changes to Terms</h2>
          <p>We reserve the right to modify these terms and conditions at any time. Any changes will be updated on this page.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>9. Contact</h2>
          <p>For any questions regarding these terms, please contact us at support@bnievent.com</p>
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
