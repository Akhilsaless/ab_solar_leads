export default function ReferralTerms() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "Arial, sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/referrer-signup" style={{ color: "#f97316", textDecoration: "none", fontSize: 14 }}>← Back to Signup</a>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 16, padding: "32px 28px", border: "1px solid #334155" }}>
          <h1 style={{ margin: "0 0 4px", color: "#f97316", fontSize: 24 }}>Terms & Conditions</h1>
          <p style={{ margin: "0 0 32px", color: "#64748b", fontSize: 14 }}>Sales Squad Referral Program — Effective from the date of signup</p>

          <Section title="1. Program Overview">
            The Sales Squad Referral Program allows registered referrers to earn commissions by referring customers who complete a solar installation through AB SOLAR. By joining this program, you agree to all terms listed below.
          </Section>

          <Section title="2. Commission Structure">
            <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
              <li><strong style={{ color: "#fff" }}>₹500</strong> — Paid when your referred customer completes a site inspection and applies for the government solar subsidy (PM Surya Ghar or state DISCOM scheme).</li>
              <li><strong style={{ color: "#fff" }}>₹1,500</strong> — Paid when the solar system is fully installed and confirmed by AB SOLAR.</li>
              <li><strong style={{ color: "#fff" }}>Daily Task Bonuses</strong> — Additional ₹100–₹500+ per referral based on your current task milestone level.</li>
            </ul>
            <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>Commissions are credited to your dashboard balance and can be withdrawn via UPI or bank transfer. All payments are subject to admin approval and verification.</p>
          </Section>

          <Section title="3. Fake Lead Policy (Zero Tolerance)">
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
              <p style={{ margin: 0, color: "#f87171", fontWeight: 600, fontSize: 14 }}>⚠️ Fake or invalid leads will result in immediate account suspension and forfeiture of ALL pending earnings.</p>
            </div>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>A lead is considered fake or invalid if any of the following apply:</p>
            <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
              <li>The customer's phone number or email address is incorrect or unreachable.</li>
              <li>The customer did not consent to being referred or has no knowledge of the referral.</li>
              <li>The referrer submitted their own details or the details of a family member without genuine intent to install solar.</li>
              <li>The customer fails to verify their email within 7 days of the referral being submitted.</li>
              <li>The lead was submitted multiple times under different names or contact details.</li>
              <li>Any form of manipulation, automation, or fraudulent activity is detected.</li>
            </ul>
          </Section>

          <Section title="4. Lead Verification">
            <p style={{ color: "#94a3b8", fontSize: 14 }}>When a customer is referred through your link, they will receive an automatic verification email asking them to confirm the referral. Commission is only eligible for leads where the customer has confirmed the referral. This protects both you and AB SOLAR from fraudulent claims.</p>
            <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>Your <strong style={{ color: "#fff" }}>Lead Quality Score</strong> (visible on your dashboard) reflects the percentage of your leads that have been verified. Accounts with a score below 40% will be suspended.</p>
          </Section>

          <Section title="5. Payment & Withdrawal">
            <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
              <li>Withdrawals are processed within 2–3 business days of approval.</li>
              <li>Minimum withdrawal amount: ₹500.</li>
              <li>AB SOLAR reserves the right to withhold payment pending investigation of suspected fraud.</li>
              <li>Payments are made via UPI or bank transfer only. No cash payments.</li>
              <li>AB SOLAR is not responsible for delays caused by incorrect payment details provided by the referrer.</li>
            </ul>
          </Section>

          <Section title="6. Account Suspension & Termination">
            <p style={{ color: "#94a3b8", fontSize: 14 }}>AB SOLAR reserves the right to suspend or permanently terminate any referrer account for the following reasons:</p>
            <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
              <li>Submission of fake, duplicate, or fraudulent leads.</li>
              <li>Lead Quality Score falling below 40%.</li>
              <li>Violation of any terms in this agreement.</li>
              <li>Any activity that damages the reputation of AB SOLAR or Sales Squad.</li>
            </ul>
            <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>Upon termination for fraud, all pending and unpaid earnings will be forfeited. Legitimate earned and approved amounts already paid will not be clawed back.</p>
          </Section>

          <Section title="7. Dispute Resolution">
            <p style={{ color: "#94a3b8", fontSize: 14 }}>If you believe a commission has been incorrectly withheld or your account has been suspended in error, you may contact AB SOLAR support with supporting evidence. All disputes will be reviewed within 7 business days. AB SOLAR's decision is final.</p>
          </Section>

          <Section title="8. Program Changes">
            <p style={{ color: "#94a3b8", fontSize: 14 }}>AB SOLAR reserves the right to modify commission rates, task structures, or program terms at any time with 7 days' notice. Continued participation after notice constitutes acceptance of the new terms.</p>
          </Section>

          <Section title="9. Governing Law">
            <p style={{ color: "#94a3b8", fontSize: 14 }}>This program is governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in the state where AB SOLAR is registered.</p>
          </Section>

          <div style={{ marginTop: 32, padding: "16px 20px", background: "#0f172a", borderRadius: 10, border: "1px solid #334155" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>By signing up for the Sales Squad Referral Program, you confirm that you have read, understood, and agreed to all of the above terms and conditions.</p>
          </div>
        </div>

        <div style={{ textAlign: "center" as const, marginTop: 24 }}>
          <a href="/referrer-signup" style={{ background: "#f97316", color: "#fff", padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
            Back to Signup
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ margin: "0 0 10px", color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {children}
    </div>
  );
}
