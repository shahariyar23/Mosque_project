export interface IftarSponsorshipTemplateData {
  sponsorName: string;
  date: string; // YYYY-MM-DD
  year: number; // Hijri year
  status: string; // confirmed, pending, completed, cancelled
  numberOfServings?: number | null;
  estimatedCost?: string | null;
  currency?: string;
  menuDetails?: string | null;
  notes?: string | null;
  mosqueName?: string;
  supportEmail?: string;
  websiteUrl?: string;
  websiteDisplay?: string;
}

/**
 * Renders an official, branded HTML Iftar sponsorship email for NOOR community donors.
 */
export function renderIftarSponsorshipHtml(data: IftarSponsorshipTemplateData): string {
  const mosqueDisplay = data.mosqueName || 'NOOR Central Mosque';
  const mosqueHeader = mosqueDisplay.toUpperCase();
  const website = data.websiteUrl || 'https://noormosque.org';
  const websiteDisp = data.websiteDisplay || 'www.noormosque.org';
  const support = data.supportEmail || 'support@noormosque.org';
  const isCancelled = data.status.toLowerCase() === 'cancelled';
  const statusUpper = data.status.toUpperCase();

  const statusColor = isCancelled ? '#991b1b' : '#073a2d';
  const statusBg = isCancelled ? '#fdf2f2' : '#eaf2ed';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Iftar Sponsorship ${statusUpper} — ${data.date}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0 auto !important; padding: 0 !important; height: 100% !important; width: 100% !important; background-color: #f8f6ef; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
    td { font-family: 'Inter', Arial, sans-serif; }
    .heading { font-family: 'Playfair Display', Georgia, serif; color: #1a2421; }
    .body-text { font-family: 'Inter', Arial, sans-serif; color: #5b6b66; line-height: 1.6; font-size: 15px; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; background-color: #f8f6ef;">
  <center style="width: 100%; background-color: #f8f6ef; padding-bottom: 40px;">
    
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto;" class="email-container">
      
      <!-- HEADER -->
      <tr>
        <td style="background-color: #073a2d; text-align: center; padding: 36px 20px; border-top-left-radius: 8px; border-top-right-radius: 8px;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <p style="margin: 0; color: #c79a45; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                  RAMADAN ${data.year} AH • IFTAR MEAL PROGRAM
                </p>
                <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 26px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">
                  ${mosqueHeader}
                </h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- MAIN CONTENT -->
      <tr>
        <td style="background-color: #ffffff; padding: 40px 36px; border-bottom: 1px solid #eae8df;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            
            <tr>
              <td style="padding-bottom: 24px;">
                <p class="body-text" style="margin: 0; font-size: 16px;">
                  Assalamu Alaikum wa Rahmatullahi wa Barakatuh, <strong>${data.sponsorName}</strong>,
                </p>
                <p class="body-text" style="margin: 12px 0 0 0;">
                  ${
                    isCancelled
                      ? `Your Iftar sponsorship for <strong>${data.date}</strong> (${data.year} AH) has been cancelled.`
                      : `Jazakallahu Khairan for your generous commitment to sponsor the community Iftar at ${mosqueDisplay} on <strong>${data.date}</strong>.`
                  }
                </p>
              </td>
            </tr>

            <!-- STATUS BOX -->
            <tr>
              <td style="background-color: ${statusBg}; border-radius: 6px; padding: 18px 24px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #5b6b66; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                  Sponsorship Status
                </p>
                <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: ${statusColor};">
                  ${statusUpper}
                </p>
              </td>
            </tr>

            <!-- DETAILS TABLE -->
            <tr>
              <td style="padding-top: 24px; padding-bottom: 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #eae8df; border-radius: 6px;">
                  <tr style="border-bottom: 1px solid #eae8df;">
                    <td style="padding: 12px 16px; font-size: 14px; color: #5b6b66; width: 40%;">Ramadan Date:</td>
                    <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1a2421;">${data.date} (${data.year} AH)</td>
                  </tr>
                  ${
                    data.numberOfServings
                      ? `<tr style="border-bottom: 1px solid #eae8df;">
                          <td style="padding: 12px 16px; font-size: 14px; color: #5b6b66;">Estimated Servings:</td>
                          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1a2421;">${data.numberOfServings} people</td>
                        </tr>`
                      : ''
                  }
                  ${
                    data.estimatedCost
                      ? `<tr style="border-bottom: 1px solid #eae8df;">
                          <td style="padding: 12px 16px; font-size: 14px; color: #5b6b66;">Pledged Amount:</td>
                          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #073a2d;">${data.currency || 'BDT'} ${data.estimatedCost}</td>
                        </tr>`
                      : ''
                  }
                  ${
                    data.menuDetails
                      ? `<tr>
                          <td style="padding: 12px 16px; font-size: 14px; color: #5b6b66;">Menu Arrangements:</td>
                          <td style="padding: 12px 16px; font-size: 14px; color: #1a2421;">${data.menuDetails}</td>
                        </tr>`
                      : ''
                  }
                </table>
              </td>
            </tr>

            <tr>
              <td>
                <p class="body-text" style="margin: 0; font-size: 14px; color: #788782;">
                  May Allah (SWT) accept your generosity, multiply your rewards, and bless your family in this holy month.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color: #f8f6ef; padding: 28px 20px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
          <p style="margin: 0; font-size: 12px; color: #889691;">
            ${mosqueDisplay} • <a href="${website}" style="color: #073a2d; text-decoration: underline;">${websiteDisp}</a>
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #889691;">
            Questions? Contact <a href="mailto:${support}" style="color: #073a2d;">${support}</a>
          </p>
        </td>
      </tr>

    </table>

  </center>
</body>
</html>`;
}

/**
 * Plaintext fallback for Iftar sponsorship notification.
 */
export function renderIftarSponsorshipText(data: IftarSponsorshipTemplateData): string {
  const mosqueDisplay = data.mosqueName || 'NOOR Central Mosque';
  const isCancelled = data.status.toLowerCase() === 'cancelled';

  return `
Assalamu Alaikum ${data.sponsorName},

${
  isCancelled
    ? `Your Iftar sponsorship for ${data.date} (${data.year} AH) has been cancelled.`
    : `Jazakallahu Khairan for sponsoring community Iftar at ${mosqueDisplay} on ${data.date} (${data.year} AH).`
}

Status: ${data.status.toUpperCase()}
Date: ${data.date}
${data.numberOfServings ? `Servings: ${data.numberOfServings} people\n` : ''}${
    data.estimatedCost ? `Pledged Amount: ${data.currency || 'BDT'} ${data.estimatedCost}\n` : ''
  }${data.menuDetails ? `Menu: ${data.menuDetails}\n` : ''}
May Allah (SWT) accept your good deeds.

${mosqueDisplay}
${data.supportEmail || 'support@noormosque.org'}
`.trim();
}

