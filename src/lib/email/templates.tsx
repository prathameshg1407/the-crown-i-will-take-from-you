import * as React from 'react'

interface EmailLayoutProps {
  previewText: string
  children: React.ReactNode
}

// Base Email Layout
export const EmailLayout = ({ previewText, children }: EmailLayoutProps) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>{previewText}</title>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          background-color: #050505;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0a0a0a;
        }
        .email-header {
          background: linear-gradient(135deg, #9f1239 0%, #881337 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .email-body {
          padding: 40px 30px;
          color: #a3a3a3;
          line-height: 1.6;
        }
        .email-footer {
          padding: 30px;
          text-align: center;
          border-top: 1px solid #262626;
          color: #737373;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #9f1239 0%, #dc2626 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 14px;
        }
        .button:hover {
          background: linear-gradient(135deg, #881337 0%, #b91c1c 100%);
        }
        h1 {
          color: #ffffff;
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }
        h2 {
          color: #e5e5e5;
          font-size: 24px;
          margin-top: 0;
        }
        p {
          margin: 16px 0;
        }
        .highlight {
          color: #fca5a5;
          font-weight: 600;
        }
        .code-box {
          background-color: #171717;
          border: 1px solid #262626;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
          text-align: center;
        }
        .code {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          letter-spacing: 0.1em;
          color: #9f1239;
          font-weight: 700;
        }
      `}</style>
    </head>
    <body>
      <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
        {previewText}
      </div>
      <div className="email-container">
        {children}
      </div>
    </body>
  </html>
)

// Welcome Email Template
interface WelcomeEmailProps {
  name: string
  verificationUrl: string
}

export const WelcomeEmail = ({ name, verificationUrl }: WelcomeEmailProps) => (
  <EmailLayout previewText="Welcome to The Crown I Will Take From You!">
    <div className="email-header">
      <h1>The Crown</h1>
      <p style={{ color: '#fca5a5', margin: '8px 0 0 0', fontSize: '14px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        I Will Take From You
      </p>
    </div>
    
    <div className="email-body">
      <h2>Welcome{name && `, ${name}`}! 👑</h2>
      
      <p>
        Thank you for joining our reading community! You're about to embark on an epic journey of 
        <span className="highlight"> revenge, regression, and redemption</span>.
      </p>
      
      <p>
        To get started, please verify your email address by clicking the button below:
      </p>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={verificationUrl} className="button">
          Verify Email Address
        </a>
      </div>
      
      <p style={{ fontSize: '14px', color: '#737373' }}>
        Or copy and paste this link into your browser:
        <br />
        <a href={verificationUrl} style={{ color: '#9f1239', wordBreak: 'break-all' }}>
          {verificationUrl}
        </a>
      </p>
      
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#171717', borderRadius: '8px', borderLeft: '4px solid #9f1239' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          <strong>What's included:</strong>
        </p>
        <ul style={{ margin: '12px 0', paddingLeft: '20px', fontSize: '14px' }}>
          <li>80+ free chapters to start your journey</li>
          <li>Unlock premium chapters with flexible plans</li>
          <li>Track your reading progress</li>
          <li>Exclusive updates and announcements</li>
        </ul>
      </div>
    </div>
    
    <div className="email-footer">
      <p style={{ margin: '0 0 8px 0' }}>
        <strong>The Crown I Will Take From You</strong>
      </p>
      <p style={{ margin: '0 0 16px 0', fontSize: '12px' }}>
        A tale of betrayal and vengeance
      </p>
      <p style={{ margin: 0, fontSize: '12px' }}>
        This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  </EmailLayout>
)

// Email Verification Template
interface VerificationEmailProps {
  verificationUrl: string
}

export const VerificationEmail = ({ verificationUrl }: VerificationEmailProps) => (
  <EmailLayout previewText="Verify your email address">
    <div className="email-header">
      <h1>Verify Your Email</h1>
    </div>
    
    <div className="email-body">
      <h2>Just One More Step! ✉️</h2>
      
      <p>
        Please verify your email address to activate your account and unlock all features.
      </p>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={verificationUrl} className="button">
          Verify Email Address
        </a>
      </div>
      
      <p style={{ fontSize: '14px', color: '#737373' }}>
        Or copy and paste this link into your browser:
        <br />
        <a href={verificationUrl} style={{ color: '#9f1239', wordBreak: 'break-all' }}>
          {verificationUrl}
        </a>
      </p>
      
      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#171717', borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#a3a3a3' }}>
          This verification link will expire in <strong style={{ color: '#fca5a5' }}>24 hours</strong>
        </p>
      </div>
    </div>
    
    <div className="email-footer">
      <p style={{ margin: 0, fontSize: '12px' }}>
        If you didn't request this verification, you can safely ignore this email.
      </p>
    </div>
  </EmailLayout>
)

// Password Reset Email Template
interface PasswordResetEmailProps {
  resetUrl: string
}

export const PasswordResetEmail = ({ resetUrl }: PasswordResetEmailProps) => (
  <EmailLayout previewText="Reset your password">
    <div className="email-header">
      <h1>Reset Password</h1>
    </div>
    
    <div className="email-body">
      <h2>Password Reset Request 🔐</h2>
      
      <p>
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={resetUrl} className="button">
          Reset Password
        </a>
      </div>
      
      <p style={{ fontSize: '14px', color: '#737373' }}>
        Or copy and paste this link into your browser:
        <br />
        <a href={resetUrl} style={{ color: '#9f1239', wordBreak: 'break-all' }}>
          {resetUrl}
        </a>
      </p>
      
      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#171717', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5' }}>
          ⚠️ <strong>Security Notice:</strong>
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
          This link will expire in 1 hour. If you didn't request a password reset, 
          please ignore this email or contact support if you're concerned about your account security.
        </p>
      </div>
    </div>
    
    <div className="email-footer">
      <p style={{ margin: 0, fontSize: '12px' }}>
        For security reasons, this link can only be used once.
      </p>
    </div>
  </EmailLayout>
)

// Purchase Confirmation Email Template
interface PurchaseConfirmationEmailProps {
  name: string
  tier: string
  amount: number
  paymentId: string
  chaptersUnlocked: string
}

export const PurchaseConfirmationEmail = ({ 
  name, 
  tier, 
  amount, 
  paymentId, 
  chaptersUnlocked 
}: PurchaseConfirmationEmailProps) => (
  <EmailLayout previewText="Purchase Confirmation - Thank you!">
    <div className="email-header">
      <h1>Purchase Successful! 🎉</h1>
    </div>
    
    <div className="email-body">
      <h2>Thank you{name && `, ${name}`}!</h2>
      
      <p>
        Your purchase has been confirmed. You now have access to <span className="highlight">{chaptersUnlocked}</span>!
      </p>
      
      <div className="code-box">
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Plan Unlocked
        </p>
        <div className="code">
          {tier.toUpperCase()} PACK
        </div>
      </div>
      
      <div style={{ backgroundColor: '#171717', borderRadius: '8px', padding: '20px', margin: '24px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={{ padding: '8px 0', color: '#737373', fontSize: '14px' }}>Plan:</td>
            <td style={{ padding: '8px 0', color: '#e5e5e5', textAlign: 'right', fontSize: '14px' }}>
              <strong>{tier.charAt(0).toUpperCase() + tier.slice(1)} Pack</strong>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: '#737373', fontSize: '14px' }}>Amount Paid:</td>
            <td style={{ padding: '8px 0', color: '#e5e5e5', textAlign: 'right', fontSize: '14px' }}>
              <strong>₹{(amount / 100).toFixed(2)}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: '#737373', fontSize: '14px' }}>Payment ID:</td>
            <td style={{ padding: '8px 0', color: '#737373', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace' }}>
              {paymentId}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: '#737373', fontSize: '14px' }}>Chapters Access:</td>
            <td style={{ padding: '8px 0', color: '#9f1239', textAlign: 'right', fontSize: '14px' }}>
              <strong>{chaptersUnlocked}</strong>
            </td>
          </tr>
        </table>
      </div>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`} className="button">
          Start Reading Now
        </a>
      </div>
      
      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#171717', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          <strong style={{ color: '#22c55e' }}>✓ Lifetime Access</strong>
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#a3a3a3' }}>
          Your purchase includes permanent access to all unlocked chapters. No subscriptions, no recurring fees.
        </p>
      </div>
    </div>
    
    <div className="email-footer">
      <p style={{ margin: '0 0 8px 0' }}>
        <strong>Need Help?</strong>
      </p>
      <p style={{ margin: 0, fontSize: '12px' }}>
        If you have any questions about your purchase, please contact us at{' '}
        <a href={`mailto:${process.env.RESEND_REPLY_TO_EMAIL || 'support@yournoveldomain.com'}`} style={{ color: '#9f1239' }}>
          support@yournoveldomain.com
        </a>
      </p>
    </div>
  </EmailLayout>
)

// Login Alert Email Template (Optional - for security)
interface LoginAlertEmailProps {
  name: string
  loginTime: string
  ipAddress?: string
  device?: string
  location?: string
}

export const LoginAlertEmail = ({ 
  name, 
  loginTime, 
  ipAddress, 
  device, 
  location 
}: LoginAlertEmailProps) => (
  <EmailLayout previewText="New login to your account">
    <div className="email-header">
      <h1>New Login Detected</h1>
    </div>
    
    <div className="email-body">
      <h2>Hello{name && `, ${name}`}!</h2>
      
      <p>
        We detected a new login to your account. If this was you, you can safely ignore this email.
      </p>
      
      <div style={{ backgroundColor: '#171717', borderRadius: '8px', padding: '20px', margin: '24px 0' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Login Details
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={{ padding: '6px 0', color: '#737373', fontSize: '14px' }}>Time:</td>
            <td style={{ padding: '6px 0', color: '#e5e5e5', textAlign: 'right', fontSize: '14px' }}>
              {loginTime}
            </td>
          </tr>
          {ipAddress && (
            <tr>
              <td style={{ padding: '6px 0', color: '#737373', fontSize: '14px' }}>IP Address:</td>
              <td style={{ padding: '6px 0', color: '#e5e5e5', textAlign: 'right', fontSize: '14px', fontFamily: 'monospace' }}>
                {ipAddress}
              </td>
            </tr>
          )}
          {device && (
            <tr>
              <td style={{ padding: '6px 0', color: '#737373', fontSize: '14px' }}>Device:</td>
              <td style={{ padding: '6px 0', color: '#e5e5e5', textAlign: 'right', fontSize: '14px' }}>
                {device}
              </td>
            </tr>
          )}
          {location && (
            <tr>
              <td style={{ padding: '6px 0', color: '#737373', fontSize: '14px' }}>Location:</td>
              <td style={{ padding: '6px 0', color: '#e5e5e5', textAlign: 'right', fontSize: '14px' }}>
                {location}
              </td>
            </tr>
          )}
        </table>
      </div>
      
      <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5' }}>
          <strong>⚠️ Wasn't you?</strong>
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#fca5a5' }}>
          If you didn't log in, please reset your password immediately and contact our support team.
        </p>
      </div>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/security`} className="button">
          Review Account Security
        </a>
      </div>
    </div>
    
    <div className="email-footer">
      <p style={{ margin: 0, fontSize: '12px' }}>
        This is an automated security notification. You're receiving this because login alerts are enabled for your account.
      </p>
    </div>
  </EmailLayout>
)