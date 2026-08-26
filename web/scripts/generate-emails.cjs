const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'email-templates');

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Global Styles & Theme
const theme = {
  emerald: '#073a2d',
  emeraldLight: '#0d4d3b',
  cream: '#f8f6ef',
  gold: '#c79a45',
  goldLight: '#e0be79',
  white: '#ffffff',
  textDark: '#1a2421',
  textMuted: '#5b6b66',
  fontHeading: "'Playfair Display', Georgia, serif",
  fontBody: "'Inter', Arial, sans-serif",
  fontMeta: "'Montserrat', Helvetica, sans-serif"
};

// Reusable Layout Wrapper
function renderEmail(title, content, isSystem = false) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
  <![endif]-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <style>
    /* Reset */
    html, body { margin: 0 auto !important; padding: 0 !important; height: 100% !important; width: 100% !important; background-color: ${theme.cream}; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    div[style*="margin: 16px 0"] { margin: 0 !important; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
    img { -ms-interpolation-mode:bicubic; }
    a { text-decoration: none; }
    /* Typography Classes */
    .heading { font-family: ${theme.fontHeading}; color: ${theme.textDark}; }
    .body-text { font-family: ${theme.fontBody}; color: ${theme.textMuted}; line-height: 1.6; font-size: 15px; }
    .meta-text { font-family: ${theme.fontMeta}; color: ${theme.textMuted}; letter-spacing: 1px; text-transform: uppercase; }
    
    /* Utilities */
    .btn { display: inline-block; background: ${theme.gold}; color: ${theme.white}; font-family: ${theme.fontMeta}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; padding: 14px 28px; border-radius: 4px; border: 1px solid ${theme.gold}; text-align: center; }
    .btn:hover { background: #b58836; }
    .btn-emerald { background: ${theme.emerald}; border-color: ${theme.emerald}; }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .stack-column-center { text-align: center !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: ${theme.cream};">
  <center style="width: 100%; background-color: ${theme.cream}; pb-8">
    
    <!-- Email Container : BEGIN -->
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto;" class="email-container">
      
      <!-- HEADER : BEGIN -->
      <tr>
        <td style="background-color: ${theme.emerald}; text-align: center; padding: 40px 20px; border-top-left-radius: 8px; border-top-right-radius: 8px;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <!-- NOOR LOGO (CSS Text version for reliability) -->
                <div style="font-family: ${theme.fontHeading}; font-size: 32px; font-weight: 600; color: ${theme.gold}; letter-spacing: 4px; margin: 0;">NOOR</div>
                <div style="font-family: ${theme.fontMeta}; font-size: 10px; color: ${theme.goldLight}; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase;">Light of Faith</div>
                
                <!-- Subtle Islamic Geometry Divider -->
                <div style="margin-top: 24px; text-align: center; line-height: 0;">
                  <span style="color: ${theme.gold}; font-size: 16px;">✦</span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- HEADER : END -->

      <!-- MAIN CONTENT : BEGIN -->
      <tr>
        <td style="background-color: ${theme.white}; padding: 48px 40px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);" class="mobile-padding">
          ${content}
        </td>
      </tr>
      <!-- MAIN CONTENT : END -->

      <!-- FOOTER : BEGIN -->
      <tr>
        <td style="padding: 40px 20px; text-align: center;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: ${theme.fontMeta}; font-size: 11px; line-height: 1.5; color: ${theme.textMuted}; text-align: center;">
                <b style="color: ${theme.emerald}; font-size: 12px; letter-spacing: 1px;">NOOR • COMMUNITY MOSQUE</b><br><br>
                123 Peace Avenue, Dhaka, Bangladesh<br>
                <a href="#" style="color: ${theme.emerald}; text-decoration: none;">www.noormosque.org</a> &nbsp;•&nbsp; 
                <a href="mailto:salam@noormosque.org" style="color: ${theme.emerald}; text-decoration: none;">salam@noormosque.org</a><br><br>
                You are receiving this email because of your relationship with Noor Community Mosque.<br>
                <a href="#" style="color: ${theme.textMuted}; text-decoration: underline;">Privacy Policy</a> &nbsp;|&nbsp; 
                <a href="#" style="color: ${theme.textMuted}; text-decoration: underline;">Terms of Service</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- FOOTER : END -->

    </table>
    <!-- Email Container : END -->
  </center>
</body>
</html>`;
}

// -------------------------------------------------------------------------
// TEMPLATES
// -------------------------------------------------------------------------

const templates = [];

// 0. Design System
templates.push({
  filename: '00-design-system.html',
  title: 'NOOR Email Design System',
  content: `
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 24px; text-align: center;">NOOR Email Design System</h1>
    <p class="body-text" style="text-align: center; margin-bottom: 32px;">A unified, premium visual language for all mosque communications.</p>
    
    <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 32px 0;">
    
    <h2 class="meta-text" style="font-size: 12px; margin-bottom: 16px;">Typography</h2>
    <h3 class="heading" style="font-size: 28px; margin: 0 0 8px 0;">Playfair Display (Heading)</h3>
    <p class="body-text" style="margin: 0 0 16px 0;">Inter (Body) - For high readability on all screens.</p>
    <p class="meta-text" style="font-size: 10px; margin: 0 0 32px 0;">Montserrat (Meta) - For labels and small caps.</p>
    
    <h2 class="meta-text" style="font-size: 12px; margin-bottom: 16px;">Color Palette</h2>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
      <tr>
        <td style="background: ${theme.emerald}; padding: 20px; color: white; text-align: center; width: 25%; font-family: ${theme.fontBody}; font-size: 12px;">Deep Emerald<br>${theme.emerald}</td>
        <td style="background: ${theme.cream}; padding: 20px; color: ${theme.emerald}; text-align: center; width: 25%; font-family: ${theme.fontBody}; font-size: 12px; border: 1px solid #eaeaea;">Warm Cream<br>${theme.cream}</td>
        <td style="background: ${theme.gold}; padding: 20px; color: white; text-align: center; width: 25%; font-family: ${theme.fontBody}; font-size: 12px;">Elegant Gold<br>${theme.gold}</td>
        <td style="background: ${theme.white}; padding: 20px; color: ${theme.textMuted}; text-align: center; width: 25%; font-family: ${theme.fontBody}; font-size: 12px; border: 1px solid #eaeaea;">White Card<br>${theme.white}</td>
      </tr>
    </table>
    
    <h2 class="meta-text" style="font-size: 12px; margin-bottom: 16px;">Buttons</h2>
    <div style="margin-bottom: 32px;">
      <a href="#" class="btn" style="margin-right: 16px;">Primary Gold</a>
      <a href="#" class="btn btn-emerald">Secondary Emerald</a>
    </div>

    <h2 class="meta-text" style="font-size: 12px; margin-bottom: 16px;">Islamic Visual Decorations</h2>
    <div style="text-align: center; margin: 24px 0;">
      <!-- Arabesque divider -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="40%" style="border-top: 1px solid ${theme.goldLight};"></td>
          <td width="20%" style="text-align: center; color: ${theme.gold}; font-size: 16px; line-height: 1;">✦</td>
          <td width="40%" style="border-top: 1px solid ${theme.goldLight};"></td>
        </tr>
      </table>
    </div>
  `
});

// 1. Welcome Email
templates.push({
  filename: '01-welcome.html',
  title: 'Welcome to NOOR',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; color: ${theme.emerald}; line-height: 1;">✧</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Welcome to Noor</h1>
    <p class="body-text" style="margin: 0 0 24px 0; text-align: center;">As-salamu alaykum, User.</p>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">We are delighted to welcome you to the Noor Community. Your account is now active, granting you access to our digital platform designed to keep you connected with faith, learning, and community.</p>
    
    <div style="background-color: ${theme.cream}; padding: 24px; border-radius: 6px; margin-bottom: 32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <b class="heading" style="font-size: 16px;">🕌 Prayer Times</b><br>
            <span class="body-text" style="font-size: 14px;">View daily congregational timings and Jumu'ah schedules.</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 16px;">
            <b class="heading" style="font-size: 16px;">📖 Islamic Education</b><br>
            <span class="body-text" style="font-size: 14px;">Enroll in weekend classes and hifz programmes.</span>
          </td>
        </tr>
        <tr>
          <td>
            <b class="heading" style="font-size: 16px;">🤝 Community Events</b><br>
            <span class="body-text" style="font-size: 14px;">Register for seminars, iftars, and volunteer opportunities.</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="#" class="btn btn-emerald">Explore NOOR</a>
    </div>
    
    <p class="body-text" style="margin: 32px 0 0 0; text-align: center; font-size: 14px;">May Allah (SWT) bless you and your family.</p>
  `
});

// 2. Email Verification
templates.push({
  filename: '02-verify-email.html',
  title: 'Verify Your Email Address',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.gold}; line-height: 1;">✉</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Verify Your Email</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">To ensure the security of your account and complete your registration, please verify your email address by clicking the button below.</p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="#" class="btn">Verify Email</a>
    </div>
    
    <p class="body-text" style="margin: 0 0 16px 0; text-align: center; font-size: 13px;">This link will expire in 24 hours.</p>
    
    <div style="border-top: 1px solid #eaeaea; margin: 24px 0; padding-top: 24px;">
      <p class="body-text" style="margin: 0; font-size: 12px; color: #888; text-align: center;">
        If you did not request this verification, you can safely ignore this email.
      </p>
    </div>
  `
});

// 3. Forgot Password
templates.push({
  filename: '03-forgot-password.html',
  title: 'Reset Your Password',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.emerald}; line-height: 1;">🔐</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Password Reset Request</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">We received a request to reset the password for your NOOR account. You can set a new password by clicking the secure link below.</p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="#" class="btn">Reset Password</a>
    </div>
    
    <p class="body-text" style="margin: 0 0 16px 0; text-align: center; font-size: 13px;">This link is valid for 1 hour.</p>
    
    <div style="border-top: 1px solid #eaeaea; margin: 24px 0; padding-top: 24px;">
      <p class="body-text" style="margin: 0; font-size: 12px; color: #888; text-align: center;">
        If you didn't request a password reset, please ignore this email or contact support if you have security concerns.
      </p>
    </div>
  `
});

// 4. Password Reset Success
templates.push({
  filename: '04-password-success.html',
  title: 'Your Password Has Been Changed',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.emerald}; line-height: 1;">✓</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Password Updated</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">Your password has been successfully changed. You can now use your new password to access your account.</p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="#" class="btn btn-emerald">Sign In Now</a>
    </div>
    
    <div style="border-top: 1px solid #eaeaea; margin: 24px 0; padding-top: 24px;">
      <p class="body-text" style="margin: 0; font-size: 12px; color: #888; text-align: center;">
        If you did not make this change, please contact mosque administration immediately.
      </p>
    </div>
  `
});

// 5. Login Alert
templates.push({
  filename: '05-login-alert.html',
  title: 'New Sign-In Detected',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.gold}; line-height: 1;">🛡️</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">New Sign-In Detected</h1>
    <p class="body-text" style="margin: 0 0 24px 0; text-align: center;">We noticed a new sign-in to your NOOR account from an unrecognized device.</p>
    
    <div style="background-color: ${theme.cream}; padding: 24px; border-radius: 6px; margin-bottom: 32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px;"><b class="meta-text" style="font-size: 11px;">DEVICE:</b></td>
          <td style="padding-bottom: 8px;" class="body-text">MacBook Pro, Safari</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px;"><b class="meta-text" style="font-size: 11px;">LOCATION:</b></td>
          <td style="padding-bottom: 8px;" class="body-text">Dhaka, Bangladesh (approx.)</td>
        </tr>
        <tr>
          <td><b class="meta-text" style="font-size: 11px;">TIME:</b></td>
          <td class="body-text">Aug 26, 2026, 2:30 PM BDT</td>
        </tr>
      </table>
    </div>
    
    <p class="body-text" style="margin: 0 0 24px 0; text-align: center;">If this was you, you can safely ignore this email.</p>
    
    <div style="text-align: center;">
      <a href="#" class="btn">Secure Account</a>
    </div>
  `
});

// 6. Email Address Changed
templates.push({
  filename: '06-email-changed.html',
  title: 'Your Email Address Was Changed',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.emerald}; line-height: 1;">🔄</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Email Address Updated</h1>
    <p class="body-text" style="margin: 0 0 24px 0; text-align: center;">This is a confirmation that the email address associated with your NOOR account has been successfully changed.</p>
    
    <div style="background-color: ${theme.cream}; padding: 16px; border-radius: 6px; margin-bottom: 32px; text-align: center;">
      <p class="body-text" style="margin: 0; font-weight: 600; color: ${theme.emerald};">new.email@example.com</p>
    </div>
    
    <div style="border-top: 1px solid #eaeaea; margin: 24px 0; padding-top: 24px;">
      <p class="body-text" style="margin: 0; font-size: 12px; color: #888; text-align: center;">
        If you did not authorize this change, please secure your account immediately by resetting your password.
      </p>
    </div>
    <div style="text-align: center;">
      <a href="#" class="btn" style="background: transparent; color: ${theme.emerald}; border: 1px solid ${theme.emerald};">Contact Support</a>
    </div>
  `
});

// 7. Account Verified
templates.push({
  filename: '07-account-verified.html',
  title: 'Your Account Is Verified',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.gold}; line-height: 1;">🌟</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Account Verified</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">Alhamdulillah, your email address has been successfully verified. Your NOOR account is now fully active.</p>
    
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="#" class="btn btn-emerald">Continue to NOOR</a>
    </div>
  `
});

// 8. Donation Receipt
templates.push({
  filename: '08-donation-receipt.html',
  title: 'Thank You for Your Contribution',
  content: `
    <div style="text-align: center; margin-bottom: 16px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="30%" style="border-top: 1px solid ${theme.goldLight};"></td>
          <td width="40%" style="text-align: center; color: ${theme.gold}; font-size: 24px; line-height: 1;">✦</td>
          <td width="30%" style="border-top: 1px solid ${theme.goldLight};"></td>
        </tr>
      </table>
    </div>
    <h1 class="heading" style="margin: 0 0 8px 0; font-size: 28px; text-align: center;">Jazakallah Khair</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center; font-style: italic;">Thank you for your generous contribution.</p>
    
    <div style="background-color: ${theme.cream}; padding: 32px; border-radius: 6px; margin-bottom: 32px;">
      <h2 class="heading" style="font-size: 40px; color: ${theme.emerald}; margin: 0 0 24px 0; text-align: center;">৳ 5,000</h2>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><b class="meta-text" style="font-size: 11px;">CAMPAIGN</b></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right;" class="body-text">General Mosque Fund</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><b class="meta-text" style="font-size: 11px;">DATE</b></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right;" class="body-text">August 26, 2026</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><b class="meta-text" style="font-size: 11px;">PAYMENT METHOD</b></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right;" class="body-text">Card ending in 4242</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><b class="meta-text" style="font-size: 11px;">RECEIPT NO.</b></td>
          <td style="padding: 8px 0; text-align: right;" class="body-text">#REC-10492</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="#" class="btn btn-emerald">View Donation Record</a>
    </div>
    
    <p class="body-text" style="margin: 24px 0 0 0; text-align: center; font-size: 13px;">"Those who spend their wealth in charity day and night, secretly and openly—their reward is with their Lord..." (Quran 2:274)</p>
  `
});

// 9. Event Registration
templates.push({
  filename: '09-event-registration.html',
  title: "You're Registered!",
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.emerald}; line-height: 1;">📅</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">You're Registered!</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">Your spot has been successfully reserved. We look forward to seeing you at the event.</p>
    
    <div style="border: 1px solid ${theme.goldLight}; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
      <h2 class="heading" style="font-size: 20px; margin: 0 0 16px 0;">Annual Community Iftar</h2>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" style="vertical-align: top; padding-top: 2px;"><span style="color: ${theme.gold}; font-size: 18px;">🕒</span></td>
          <td style="padding-bottom: 12px;" class="body-text">Friday, Sept 15, 2026<br>5:30 PM - 8:00 PM BDT</td>
        </tr>
        <tr>
          <td width="24" style="vertical-align: top; padding-top: 2px;"><span style="color: ${theme.gold}; font-size: 18px;">📍</span></td>
          <td style="padding-bottom: 12px;" class="body-text">Noor Community Hall<br>Level 2</td>
        </tr>
        <tr>
          <td width="24" style="vertical-align: top; padding-top: 2px;"><span style="color: ${theme.gold}; font-size: 18px;">🎟️</span></td>
          <td class="body-text">Registration ID:<br><b>#REG-58291</b></td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="#" class="btn">View Event Details</a>
    </div>
  `
});

// 10. Booking Confirmation
templates.push({
  filename: '10-booking-confirmation.html',
  title: 'Your Booking Is Confirmed',
  content: `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: ${theme.emerald}; line-height: 1;">🕌</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">Booking Confirmed</h1>
    <p class="body-text" style="margin: 0 0 32px 0; text-align: center;">Your service booking at Noor Community Mosque has been successfully confirmed.</p>
    
    <div style="background-color: ${theme.cream}; padding: 24px; border-radius: 6px; margin-bottom: 32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <b class="meta-text" style="font-size: 11px;">SERVICE</b><br>
            <span class="heading" style="font-size: 18px; color: ${theme.emerald};">Nikah Officiation</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px;">
            <b class="meta-text" style="font-size: 11px;">DATE & TIME</b><br>
            <span class="body-text">Sat, October 10, 2026 @ 2:00 PM</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px;">
            <b class="meta-text" style="font-size: 11px;">LOCATION</b><br>
            <span class="body-text">Main Prayer Hall</span>
          </td>
        </tr>
        <tr>
          <td>
            <b class="meta-text" style="font-size: 11px;">BOOKING REF</b><br>
            <span class="body-text"><b>#BKG-20394</b></span>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="#" class="btn btn-emerald">View Booking</a>
    </div>
  `
});

// Run generation
templates.forEach(t => {
  const html = renderEmail(t.title, t.content);
  fs.writeFileSync(path.join(OUTPUT_DIR, t.filename), html, 'utf8');
  console.log('Created: ' + t.filename);
});

console.log('Successfully generated all NOOR email templates!');
