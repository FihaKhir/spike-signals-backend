// api/latest.js
// This endpoint returns the latest signal for every symbol.
// Your website will call this every few seconds to update the dashboard.
// Requires a valid, non-expired access code passed as ?code=... — this is
// what makes the access gate real: even someone who found this URL directly
// can't read signal data without a genuinely valid code.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function isCodeValid(code){
  if (!code) return false;
  const { data: row } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!row || !row.redeemed_at) return false;
  if (row.duration_days === null || row.duration_days === undefined) return true; // lifetime

  const redeemedMs = new Date(row.redeemed_at).getTime();
  const expiresMs = redeemedMs + row.duration_days * 24 * 60 * 60 * 1000;
  return Date.now() <= expiresMs;
}

export default async function handler(req, res) {
  // Allow the website (running in a browser, possibly a different domain) to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET requests are allowed here' });
  }

  const valid = await isCodeValid(req.query.code);
  if (!valid) {
    return res.status(401).json({ error: 'invalid_or_expired_code' });
  }

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
