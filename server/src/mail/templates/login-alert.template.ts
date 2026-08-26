export interface LoginAlertTemplateData {
  device?: string;
  location?: string;
  time?: string;
  securityUrl?: string;
  userName?: string;
  mosqueName?: string;
  mosqueAddress?: string;
  websiteUrl?: string;
  websiteDisplay?: string;
  supportEmail?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

/**
 * Parses user agent string into a readable device/browser summary.
 */
export function formatDeviceSummary(userAgent?: string): string {
  if (!userAgent || userAgent === 'unknown' || userAgent === 'jest') {
    return 'Web Browser';
  }

  let os = 'Unknown OS';
  if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome|crios/i.test(userAgent) && !/opr|edge/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/opr/i.test(userAgent)) browser = 'Opera';

  return `${os}, ${browser}`;
}

/**
 * Formats login timestamp.
 */
export function formatLoginTime(date: Date = new Date()): string {
  return (
    date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka',
    }) + ' BDT'
  );
}

/**
 * Renders the 05-login-alert.html template preserving the NOOR design system.
 */
export function renderLoginAlertHtml(data: LoginAlertTemplateData): string {
  const mosqueHeader = data.mosqueName ? data.mosqueName.toUpperCase() : 'NOOR • COMMUNITY MOSQUE';
  const mosqueDisplay = data.mosqueName || 'Noor Community Mosque';
  const address = data.mosqueAddress || '123 Peace Avenue, Dhaka, Bangladesh';
  const website = data.websiteUrl || 'https://mostak.tech';
  const websiteDisp = data.websiteDisplay || 'www.noormosque.org';
  const support = data.supportEmail || 'info@mostak.tech';
  const privacy = data.privacyUrl || '#';
  const terms = data.termsUrl || '#';
  const device = data.device || 'Web Browser';
  const location = data.location || 'Dhaka, Bangladesh (approx.)';
  const time = data.time || formatLoginTime();
  const securityLink = data.securityUrl || `${website}/forgot-password`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>New Sign-In Detected</title>
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
    html, body { margin: 0 auto !important; padding: 0 !important; height: 100% !important; width: 100% !important; background-color: #f8f6ef; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    div[style*="margin: 16px 0"] { margin: 0 !important; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
    img { -ms-interpolation-mode:bicubic; }
    a { text-decoration: none; }
    /* Typography Classes */
    .heading { font-family: 'Playfair Display', Georgia, serif; color: #1a2421; }
    .body-text { font-family: 'Inter', Arial, sans-serif; color: #5b6b66; line-height: 1.6; font-size: 15px; }
    .meta-text { font-family: 'Montserrat', Helvetica, sans-serif; color: #5b6b66; letter-spacing: 1px; text-transform: uppercase; }
    
    /* Utilities */
    .btn { display: inline-block; background: #c79a45; color: #ffffff; font-family: 'Montserrat', Helvetica, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; padding: 14px 28px; border-radius: 4px; border: 1px solid #c79a45; text-align: center; }
    .btn:hover { background: #b58836; }
    .btn-emerald { background: #073a2d; border-color: #073a2d; }
    
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
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f8f6ef;">
  <center style="width: 100%; background-color: #f8f6ef; pb-8">
    
    <!-- Email Container : BEGIN -->
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto;" class="email-container">
      
      <!-- HEADER : BEGIN -->
      <tr>
        <td style="background-color: #073a2d; text-align: center; padding: 40px 20px; border-top-left-radius: 8px; border-top-right-radius: 8px;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <!-- NOOR LOGO (CSS Text version for reliability) -->
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 600; color: #c79a45; letter-spacing: 4px; margin: 0;">NOOR</div>
                <div style="font-family: 'Montserrat', Helvetica, sans-serif; font-size: 10px; color: #e0be79; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase;">Light of Faith</div>
                
                <!-- Subtle Islamic Geometry Divider -->
                <div style="margin-top: 24px; text-align: center; line-height: 0;">
                  <span style="color: #c79a45; font-size: 16px;">✦</span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- HEADER : END -->

      <!-- MAIN CONTENT : BEGIN -->
      <tr>
        <td style="background-color: #ffffff; padding: 48px 40px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);" class="mobile-padding">
          
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 40px; color: #c79a45; line-height: 1;">🛡️</span>
    </div>
    <h1 class="heading" style="margin: 0 0 16px 0; font-size: 28px; text-align: center;">New Sign-In Detected</h1>
    <p class="body-text" style="margin: 0 0 24px 0; text-align: center;">We noticed a new sign-in to your NOOR account from an unrecognized device.</p>
    
    <div style="background-color: #f8f6ef; padding: 24px; border-radius: 6px; margin-bottom: 32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px;"><b class="meta-text" style="font-size: 11px;">DEVICE:</b></td>
          <td style="padding-bottom: 8px;" class="body-text">${device}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px;"><b class="meta-text" style="font-size: 11px;">LOCATION:</b></td>
          <td style="padding-bottom: 8px;" class="body-text">${location}</td>
        </tr>
        <tr>
          <td><b class="meta-text" style="font-size: 11px;">TIME:</b></td>
          <td class="body-text">${time}</td>
        </tr>
      </table>
    </div>
    
    <p class="body-text" style="margin: 0 0 24px 0; text-align: center;">If this was you, you can safely ignore this email.</p>
    
    <div style="text-align: center;">
      <a href="${securityLink}" class="btn">Secure Account</a>
    </div>
  
        </td>
      </tr>
      <!-- MAIN CONTENT : END -->

      <!-- FOOTER : BEGIN -->
      <tr>
        <td style="padding: 40px 20px; text-align: center;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Helvetica, sans-serif; font-size: 11px; line-height: 1.5; color: #5b6b66; text-align: center;">
                <b style="color: #073a2d; font-size: 12px; letter-spacing: 1px;">${mosqueHeader}</b><br><br>
                ${address}<br>
                <a href="${website}" style="color: #073a2d; text-decoration: none;">${websiteDisp}</a> &nbsp;•&nbsp; 
                <a href="mailto:${support}" style="color: #073a2d; text-decoration: none;">${support}</a><br><br>
                You are receiving this email because of your relationship with ${mosqueDisplay}.<br>
                <a href="${privacy}" style="color: #5b6b66; text-decoration: underline;">Privacy Policy</a> &nbsp;|&nbsp; 
                <a href="${terms}" style="color: #5b6b66; text-decoration: underline;">Terms of Service</a>
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

export function renderLoginAlertText(data: LoginAlertTemplateData): string {
  const mosque = data.mosqueName || 'Noor Community Mosque';
  const support = data.supportEmail || 'info@mostak.tech';
  const device = data.device || 'Web Browser';
  const location = data.location || 'Dhaka, Bangladesh (approx.)';
  const time = data.time || formatLoginTime();
  const securityLink = data.securityUrl || 'https://mostak.tech/forgot-password';

  return `New Sign-In Detected

We noticed a new sign-in to your NOOR account from an unrecognized device.

DEVICE:   ${device}
LOCATION: ${location}
TIME:     ${time}

If this was you, you can safely ignore this email.
If you did not sign in, secure your account immediately:
${securityLink}

---
${mosque}
Support: ${support}
`;
}
