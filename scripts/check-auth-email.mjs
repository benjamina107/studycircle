import { config } from 'dotenv';
import { pathToFileURL } from 'node:url';

// Explicit opt-in smoke test: requests one confirmation resend, never retries.
// Supabase deliberately obscures account existence; HTTP success is not delivery.
export async function checkAuthEmail({ url, key, email, send = false }, request = fetch) {
  if (!send) throw new Error('Use --send to authorize one real verification email.');
  if (!/^[^@\s]+@calpoly\.edu$/i.test(email ?? '')) throw new Error('Provide an authorized Cal Poly test address.');
  const base = new URL(url);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.username || base.password) {
    throw new Error('Expected the hosted Supabase HTTPS project URL.');
  }
  if (!key?.startsWith('sb_publishable_')) throw new Error('A publishable key is required; do not use a secret key.');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  const settings = await request(new URL('/auth/v1/settings', base), { headers, signal: AbortSignal.timeout(15000) });
  if (!settings.ok) throw new Error(`Auth settings failed (HTTP ${settings.status}).`);
  const auth = await settings.json();
  if (auth.external?.email !== true || auth.mailer_autoconfirm !== false) {
    throw new Error('Email signup and required email confirmation must both be enabled.');
  }
  const response = await request(new URL('/auth/v1/resend', base), {
    method: 'POST', headers, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ type: 'signup', email: email.trim().toLowerCase() }),
  });
  if (response.status === 429) throw new Error('Email rate limit reached. No retry sent; inspect Auth rate limits and wait for the window.');
  if (!response.ok) throw new Error(`Confirmation resend failed (HTTP ${response.status}); inspect Supabase Auth and Resend logs.`);
  return { accepted: true, delivered: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  config({ path: '.env.local', quiet: true });
  try {
    await checkAuthEmail({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      email: process.env.EMAIL_TEST_TO, send: process.argv.includes('--send') });
    console.log('ACCEPTED: one resend request. Delivery is NOT yet verified: match the new message in Resend and confirm receipt in the test inbox.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
