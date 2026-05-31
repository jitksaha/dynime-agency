#!/usr/bin/env node
/**
 * Secret-safe DATABASE_URL builder.
 *
 * Reads SUPABASE_DB_URL (which may contain unescaped special characters in the
 * password) from the environment, URL-encodes the password, and prints a valid
 * connection URL on stdout. Never writes secrets to disk.
 *
 * Usage:  DATABASE_URL="$(node scripts/db-url.mjs)" npx prisma db pull
 */
const raw = process.env.SUPABASE_DB_URL;
if (!raw) {
  console.error('SUPABASE_DB_URL is not set');
  process.exit(1);
}

let s = raw.trim();
const scheme = s.startsWith('postgresql://')
  ? 'postgresql://'
  : s.startsWith('postgres://')
    ? 'postgres://'
    : null;
if (!scheme) {
  console.error('SUPABASE_DB_URL must start with postgresql:// or postgres://');
  process.exit(1);
}
s = s.slice(scheme.length);

// user is everything up to the first ':'
const user = s.slice(0, s.indexOf(':'));
let rest = s.slice(s.indexOf(':') + 1);

// host section begins at the last '@' (password may itself contain '@')
const atIdx = rest.lastIndexOf('@');
const password = rest.slice(0, atIdx);
const hostAndAfter = rest.slice(atIdx + 1);

const encUser = encodeURIComponent(user);
const encPass = encodeURIComponent(password);

let url = `${scheme}${encUser}:${encPass}@${hostAndAfter}`;
// Ensure sslmode for Supabase pooler connections
if (!/[?&]sslmode=/.test(url)) {
  url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
}
process.stdout.write(url);
