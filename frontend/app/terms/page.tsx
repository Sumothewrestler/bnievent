export default function TermsAndConditions() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Terms & Conditions</h1>

      <div style={{ lineHeight: '1.6', fontSize: '15px' }}>
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>1. Event Registration</h2>
          <p>By registering for the BNI Chettinad Event, you agree to provide accurate and complete information. All registrations are subject to approval and availability.</p>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
            <p style={{ margin: 0 }}><strong>Event Date:</strong> 21st February 2026 (Sunday), 3:30 PM</p>
            <p style={{ margin: 0 }}><strong>Venue:</strong> L.C.T.L Palaniappa Chettiar Memorial Auditorium, Karaikudi</p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>2. Payment Terms</h2>
          <p>All registration fees must be paid in full at the time of registration. We accept payments through our secure payment gateway powered by Cashfree.</p>
          <p>Fees are listed in Indian Rupees (INR) only and range from <strong>Rs. 300 to Rs. 600</strong> depending on participant category and eligibility.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>3. Registration Confirmation</h2>
          <p>Upon successful payment, you will receive a confirmation email with your ticket number. Please keep this for your records and event entry.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>4. Event Attendance</h2>
          <p>Your registration ticket is valid only for the registered participant. Tickets are non-transferable and non-refundable.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>5. No Refund Policy</h2>
          <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', border: '2px solid #ffc107', marginBottom: '10px' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              All registrations are non-refundable and non-transferable. No refunds will be issued under any circumstances once payment is completed.
            </p>
          </div>
          <p>By completing your registration, you acknowledge and agree to this no refund policy. Please ensure your availability before registering.</p>
          <p>Event cancellations or changes by the organizer will be communicated via email and phone. In such cases, full refunds will be processed. Please refer to our Refund & Cancellation Policy for complete details.</p>
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
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>8. Code of Conduct</h2>
          <p>All participants are expected to maintain professional conduct during the event. The organizers reserve the right to refuse entry or remove any participant who violates the code of conduct.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>9. Photography & Media</h2>
          <p>By attending the event, you consent to being photographed or recorded. Event organizers may use these materials for promotional purposes.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>10. Changes to Terms</h2>
          <p>We reserve the right to modify these terms and conditions at any time. Any changes will be updated on this page and communicated to registered participants if necessary.</p>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>11. Contact</h2>
          <p>For any questions regarding these terms or the event:</p>
          <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
            <p style={{ marginBottom: '5px' }}><strong>Email:</strong> digitalflareup@gmail.com</p>
            <p style={{ marginBottom: '5px' }}><strong>Phone:</strong> +91 94425 05671</p>
            <p style={{ margin: 0 }}><strong>Response Time:</strong> Within 24-48 hours on business days</p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <div style={{ backgroundColor: '#d1ecf1', padding: '15px', borderRadius: '8px', border: '1px solid #bee5eb' }}>
            <p style={{ margin: 0 }}>
              <strong>Agreement:</strong> By completing your registration and payment, you confirm that you have read, understood, and agree to these Terms & Conditions.
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
