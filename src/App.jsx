import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('about');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={styles.container}>
      {/* Header / Navbar */}
      <header style={styles.header}>
        <h1 style={styles.logo}>GKB TECHNOLOGIES</h1>
        <div style={styles.nav}>
          <button 
            onClick={() => setActiveTab('about')} 
            style={{ ...styles.navBtn, borderColor: activeTab === 'about' ? '#06b6d4' : 'transparent' }}
          >
            About Us
          </button>
          <button 
            onClick={() => setActiveTab('contact')} 
            style={{ ...styles.navBtn, borderColor: activeTab === 'contact' ? '#c084fc' : 'transparent' }}
          >
            Contact Us
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'about' ? (
          <div style={styles.card}>
            <div style={styles.badge}>God Knows Best • Built Beyond Limits</div>
            <h2 style={styles.title}>GKB TECHNOLOGIES</h2>
            <p style={styles.tagline}>Innovate. Build. Succeed.</p>
            <p style={styles.ceo}>Led by CEO: <strong>Zumah Kelvin</strong></p>

            <div style={styles.grid}>
              <div style={styles.boxCyan}>
                <h3>🎓 Student Project Solutions</h3>
                <p>Reliable final-year and mini projects, custom code, and full documentation across Engineering, IT, Agriculture, and more.</p>
              </div>
              <div style={styles.boxPurple}>
                <h3>🛒 Retail Gadget Distribution</h3>
                <p>Top-tier smartphones, laptops, smart TVs, and gaming consoles at unbeatable market rates with brand warranty.</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <h2 style={styles.title}>Contact Us</h2>
            <p style={styles.tagline}>Establish a direct connection with GKB Technologies.</p>

            <div style={styles.contactInfo}>
              <p>📞 <strong>Direct Lines:</strong> +233 55 211 7787 / +256 90 5290</p>
              <p>💬 <strong>WhatsApp:</strong> +233 53 682 0868 (24/7 Support)</p>
              <p>✉️ <strong>Email:</strong> gkbtechnologies1@gmail.com</p>
              <p>📸 <strong>Instagram:</strong> @gkb_technologies</p>
              <p>🎵 <strong>TikTok:</strong> @gkbtech</p>
            </div>

            {submitted ? (
              <div style={styles.successBox}>
                <h4>Message Received Successfully!</h4>
                <p>CEO Zumah Kelvin and our team will get back to you shortly. God Knows Best.</p>
              </div>
            ) : (
              <form 
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} 
                style={styles.form}
              >
                <input type="text" placeholder="Your Name" required style={styles.input} />
                <input type="email" placeholder="Your Email Address" required style={styles.input} />
                <textarea placeholder="Your Message or Project Specifications..." rows="4" required style={styles.input}></textarea>
                <button type="submit" style={styles.btn}>Send Transmission</button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Clean internal styles so it works instantly without external CSS files
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#030712',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
  },
  logo: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#22d3ee',
    margin: 0,
    letterSpacing: '1px',
  },
  nav: {
    display: 'flex',
    gap: '15px',
  },
  navBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#cbd5e1',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  main: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '0 20px',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    color: '#22d3ee',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    marginBottom: '16px',
    fontFamily: 'monospace',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  tagline: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: '0 0 12px 0',
  },
  ceo: {
    fontSize: '14px',
    color: '#cbd5e1',
    marginBottom: '30px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    textAlign: 'left',
    marginTop: '20px',
  },
  boxCyan: {
    backgroundColor: '#030712',
    border: '1px solid rgba(6, 182, 212, 0.4)',
    padding: '24px',
    borderRadius: '12px',
  },
  boxPurple: {
    backgroundColor: '#030712',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    padding: '24px',
    borderRadius: '12px',
  },
  contactInfo: {
    textAlign: 'left',
    maxWidth: '450px',
    margin: '20px auto 30px auto',
    lineHeight: '1.8',
    fontSize: '14px',
    color: '#cbd5e1',
    backgroundColor: '#030712',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #1e293b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    maxWidth: '450px',
    margin: '0 auto',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#030712',
    border: '1px solid #1e293b',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
  },
  btn: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#22d3ee',
    color: '#030712',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  successBox: {
    backgroundColor: 'rgba(6, 78, 59, 0.4)',
    border: '1px solid #34d399',
    padding: '20px',
    borderRadius: '10px',
    color: '#34d399',
    maxWidth: '450px',
    margin: '0 auto',
  },
};