import { config } from 'dotenv';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key?.startsWith('sb_publishable_'), 'Missing public Supabase config');
const headers = { apikey: key };
const settings = await fetch(`${url}/auth/v1/settings`, { headers });
assert.equal(settings.status, 200, 'Project Auth connection failed');
const auth = await settings.json();
assert.equal(auth.external.email, true, 'Email provider must be enabled');
assert.equal(auth.mailer_autoconfirm, false, 'Email confirmation must be required');
const contract = JSON.parse(await readFile(new URL('../tests/schema-contract.json',import.meta.url),'utf8'));
for (const table of Object.keys(contract)) {
 const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
 const denied = await response.json();
 assert.equal(response.status, 401, `Anonymous ${table} access must be denied`);
 assert.equal(denied.code, '42501', `Expected access denial for ${table}, not a missing table`);
}
console.log('PASS: public key connects; email confirmation required; all 17 application tables deny anonymous access.');
