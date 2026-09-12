import { env } from '../config/env.js';

/**
 * SMS delivery, behind a swappable transport.
 *
 * OTP_TRANSPORT=console prints the code to the server terminal. That is the
 * default on purpose: Twilio trial accounts only deliver to pre-verified
 * numbers, which makes a live exhibition demo fragile. Console mode lets the
 * full OTP flow be demonstrated with nothing to configure and nothing to pay.
 *
 * OTP_TRANSPORT=twilio sends a real SMS. Twilio is loaded lazily so it never
 * has to be installed for a console-mode run.
 */

export async function sendSms({ to, body }) {
  if (env.otpTransport === 'twilio') {
    return sendViaTwilio({ to, body });
  }
  return sendViaConsole({ to, body });
}

function sendViaConsole({ to, body }) {
  const line = '='.repeat(64);
  console.log(
    `\n${line}\n[VitalQR] SMS (console transport - not actually sent)\n` +
      `To:   ${to}\n${body}\n${line}\n`
  );
  return { transport: 'console', delivered: true };
}

async function sendViaTwilio({ to, body }) {
  const { accountSid, authToken, fromNumber } = env.twilio;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'OTP_TRANSPORT=twilio but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are not all set in server/.env'
    );
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Twilio rejected the message (${res.status}): ${detail}`);
  }

  return { transport: 'twilio', delivered: true };
}
