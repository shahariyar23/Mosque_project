export interface ReceiptIssuedTemplateData {
  receiptNumber: string;
  amount: string;
  currency: string;
  fundName: string;
  donorName: string;
  paymentMethod?: string | null;
  issuedAt: string;
  mosqueName?: string;
  mosqueAddress?: string;
  websiteUrl?: string;
  websiteDisplay?: string;
  supportEmail?: string;
}

/**
 * Renders an official, branded HTML receipt email for NOOR community members.
 */
export function renderReceiptIssuedHtml(data: ReceiptIssuedTemplateData): string {
  const mosqueDisplay = data.mosqueName || 'NOOR Central Mosque';
  const mosqueHeader = mosqueDisplay.toUpperCase();
  const address = data.mosqueAddress || 'NOOR Community, Bangladesh';
  const website = data.websiteUrl || 'https://noormosque.org';
  const websiteDisp = data.websiteDisplay || 'www.noormosque.org';
  const support = data.supportEmail || 'support@noormosque.org';
  const method = (data.paymentMethod || 'CASH').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payment Receipt — ${data.receiptNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0 auto !important; padding: 0 !important; height: 100% !important; width: 100% !important; background-color: #f8f6ef; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
    td { font-family: 'Inter', Arial, sans-serif; }
    .heading { font-family: 'Playfair Display', Georgia, serif; color: #1a2421; }
    .body-text { font-family: 'Inter', Arial, sans-serif; color: #5b6b66; line-height: 1.6; font-size: 15px; }
    .meta-text { font-family: 'Montserrat', Helvetica, sans-serif; color: #5b6b66; letter-spacing: 1px; text-transform: uppercase; }
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
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-weight: 600; color: #c79a45; letter-spacing: 4px; margin: 0;">NOOR</div>
                <div style="font-family: 'Montserrat', Helvetica, sans-serif; font-size: 10px; color: #e0be79; letter-spacing: 2px; margin-top: 6px; text-transform: uppercase;">Official Payment Receipt</div>
                <div style="margin-top: 16px; text-align: center;">
                  <span style="color: #c79a45; font-size: 14px;">✦</span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background-color: #ffffff; padding: 36px 40px;" class="mobile-padding">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <h1 class="heading" style="font-size: 22px; line-height: 1.3; margin: 0 0 12px 0; color: #073a2d;">
                  JazakAllahu Khayran, ${data.donorName}
                </h1>
                <p class="body-text" style="margin: 0 0 24px 0; font-size: 14.5px;">
                  We gratefully acknowledge receipt of your contribution to <strong>${mosqueDisplay}</strong>. Your support helps sustain the house of Allah and our community initiatives.
                </p>

                <!-- RECEIPT CARD -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf9f4; border: 1px solid #e7e6dc; border-radius: 8px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 24px;">
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 16px; border-bottom: 1px solid #e7e6dc;">
                            <div style="font-family: 'Montserrat', Helvetica, sans-serif; font-size: 11px; color: #69726d; text-transform: uppercase; letter-spacing: 1px;">Receipt Number</div>
                            <div style="font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #073a2d; margin-top: 4px;">${data.receiptNumber}</div>
                          </td>
                          <td style="padding-bottom: 16px; border-bottom: 1px solid #e7e6dc; text-align: right;">
                            <div style="font-family: 'Montserrat', Helvetica, sans-serif; font-size: 11px; color: #69726d; text-transform: uppercase; letter-spacing: 1px;">Amount Received</div>
                            <div style="font-family: 'Inter', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #0d4d3b; margin-top: 4px;">৳ ${data.amount} <span style="font-size: 12px; font-weight: 500; color: #69726d;">${data.currency}</span></div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding-top: 14px; padding-bottom: 8px; width: 50%;">
                            <div style="font-size: 12px; color: #69726d;">Designated Fund</div>
                            <div style="font-size: 13.5px; font-weight: 600; color: #17211d; margin-top: 2px;">${data.fundName}</div>
                          </td>
                          <td style="padding-top: 14px; padding-bottom: 8px; text-align: right; width: 50%;">
                            <div style="font-size: 12px; color: #69726d;">Payment Method</div>
                            <div style="font-size: 13.5px; font-weight: 600; color: #17211d; margin-top: 2px;">${method}</div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding-top: 8px;">
                            <div style="font-size: 12px; color: #69726d;">Donor / Contributor</div>
                            <div style="font-size: 13.5px; font-weight: 600; color: #17211d; margin-top: 2px;">${data.donorName}</div>
                          </td>
                          <td style="padding-top: 8px; text-align: right;">
                            <div style="font-size: 12px; color: #69726d;">Issue Date</div>
                            <div style="font-size: 13.5px; font-weight: 600; color: #17211d; margin-top: 2px;">${data.issuedAt}</div>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <p class="body-text" style="margin: 0; font-size: 13px; color: #69726d; text-align: center;">
                  May Allah accept your good deeds and grant barakah in your wealth and family.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color: #f8f6ef; border-top: 1px solid #e7e6dc; padding: 24px 20px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
          <div style="font-size: 12px; font-weight: 600; color: #1a2421;">${mosqueHeader}</div>
          <div style="font-size: 11.5px; color: #69726d; margin-top: 4px;">${address}</div>
          <div style="font-size: 11.5px; color: #69726d; margin-top: 6px;">
            <a href="${website}" style="color: #0d4d3b; text-decoration: underline;">${websiteDisp}</a> &nbsp;|&nbsp;
            <a href="mailto:${support}" style="color: #0d4d3b; text-decoration: underline;">${support}</a>
          </div>
        </td>
      </tr>

    </table>

  </center>
</body>
</html>`;
}

/**
 * Renders fallback plain-text version of the receipt email.
 */
export function renderReceiptIssuedText(data: ReceiptIssuedTemplateData): string {
  const mosqueDisplay = data.mosqueName || 'NOOR Central Mosque';
  return `PAYMENT RECEIPT — ${data.receiptNumber}
${mosqueDisplay}
========================================

JazakAllahu Khayran, ${data.donorName}

Receipt Number:  ${data.receiptNumber}
Amount:          ৳ ${data.amount} ${data.currency}
Fund:            ${data.fundName}
Payment Method:  ${data.paymentMethod || 'CASH'}
Date:            ${data.issuedAt}
Donor:           ${data.donorName}

May Allah accept your good deeds and grant barakah in your wealth and family.

${mosqueDisplay}
Website: ${data.websiteUrl || 'https://noormosque.org'}
`;
}
