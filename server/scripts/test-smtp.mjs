import nodemailer from 'nodemailer';

const host = process.env.EMAIL_HOST || 'smtp.titan.email';
const port = parseInt(process.env.EMAIL_PORT || '465', 10);
const secure = process.env.EMAIL_SECURE !== 'false';
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASSWORD;
const from = process.env.EMAIL_FROM || user;
const fromName = process.env.EMAIL_FROM_NAME || 'NOOR';

console.log('--- Titan SMTP Verification Diagnostic ---');
console.log(`Host:     ${host}`);
console.log(`Port:     ${port}`);
console.log(`Security: ${secure ? 'SSL (port 465)' : 'STARTTLS (port 587)'}`);
console.log(`User:     ${user || '(not configured)'}`);
console.log(`From:     "${fromName}" <${from}>`);
console.log(`Password: ${pass ? '••••••••' : '(not configured)'}`);
console.log('-------------------------------------------');

if (!user || !pass || pass === 'replace-with-titan-password' || pass === 'replace-me') {
  console.error('\n❌ ERROR: EMAIL_USER or EMAIL_PASSWORD is missing or still set to placeholder in server/.env');
  console.error('Please update server/.env with your real Titan mailbox or app password.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

console.log('\nConnecting to Titan SMTP server and authenticating...');

try {
  await transporter.verify();
  console.log('\n✅ SUCCESS: Titan SMTP handshake and authentication verified successfully!');
  console.log('Your backend is ready to dispatch emails through Titan.\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Titan SMTP Verification Failed:');
  console.error(error.message || error);
  console.error('\nTroubleshooting tips:');
  console.error('1. Ensure your Titan Application Password was copied accurately.');
  console.error('2. Confirm that Third-party app access / POP/IMAP/SMTP is enabled in Titan.');
  console.error('3. Check if your network/firewall blocks outbound connections to port 465.\n');
  process.exit(1);
}
