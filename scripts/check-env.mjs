import { readFileSync, existsSync } from 'node:fs';

// Next.js loads each env file with dotenv, where a repeated key silently takes its
// last value. These files are gitignored, so a stray duplicate leaves no trace in
// review and surfaces only as a confusing runtime error (a mismatched APP_URL, for
// example, fails every auth request the same-origin check). Fail before the server starts.
const files = ['.env', '.env.local', '.env.development.local', '.env.production.local'];
let duplicates = 0;
let scanned = 0;
for (const file of files) {
  if (!existsSync(file)) continue;
  scanned++;
  const lines = new Map();
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
    const key = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1];
    if (key) lines.set(key, [...(lines.get(key) || []), index + 1]);
  });
  // Report keys only. These values are secrets and must never reach a build log.
  for (const [key, at] of lines) {
    if (at.length < 2) continue;
    duplicates++;
    console.error(`${file}: ${key} is defined ${at.length} times (lines ${at.join(', ')}); line ${at.at(-1)} wins.`);
  }
}
if (duplicates) {
  console.error('Remove the duplicate definitions above, keeping one per key.');
  process.exit(1);
}
console.log(`PASS: no duplicate keys across ${scanned} env file${scanned === 1 ? '' : 's'}.`);
