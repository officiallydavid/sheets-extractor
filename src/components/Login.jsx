export default function Login({ onLogin, clientIdMissing, sessionMessage }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">📊</div>
        <h1 className="login-title">Executive Data Extractor</h1>
        <p className="login-subtitle">
          Scan Google Sheets for executives with confirmed calendar invites
        </p>

        {sessionMessage && (
          <div className="session-notice">{sessionMessage}</div>
        )}

        {clientIdMissing ? (
          <div className="setup-box">
            <h3>⚙️ Setup Required</h3>
            <p>Create a <code>.env</code> file in the project root with your Google OAuth Client ID:</p>
            <pre className="setup-code">VITE_GOOGLE_CLIENT_ID=your_client_id_here</pre>
            <div className="setup-steps">
              <p><strong>To get a Client ID:</strong></p>
              <ol>
                <li>Go to <strong>console.cloud.google.com</strong></li>
                <li>Create a project → enable <strong>Google Sheets API</strong></li>
                <li>APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID</li>
                <li>Type: <strong>Web Application</strong></li>
                <li>Add <code>http://localhost:5173</code> to Authorized JavaScript Origins</li>
                <li>Copy the Client ID into your <code>.env</code> file</li>
                <li>Restart the dev server</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            <div className="login-features">
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>Sign in with your Google account</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📋</span>
                <span>Access restricted Google Sheets via your identity</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <span>Extract executives with Cal Invite = Y or Y-A</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📈</span>
                <span>Track changes across multiple scans</span>
              </div>
            </div>
            <button className="google-btn" onClick={onLogin}>
              <GoogleLogo />
              Sign in with Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
