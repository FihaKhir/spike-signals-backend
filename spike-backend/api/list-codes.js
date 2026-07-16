// api/list-codes.js
// Lists all access codes with their live status, so you can see at a glance
// what's active, expired, or never used. Protected by the same admin secret.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function computeStatus(row){
  if (!row.redeemed_at) return 'unused';
  if (row.duration_days === null || row.duration_days === undefined) return 'lifetime';
  const redeemedMs = new Date(row.redeemed_at).getTime();
  const expiresMs = redeemedMs + row.duration_days * 24 * 60 * 60 * 1000;
  return Date.now() <= expiresMs ? 'active' : 'expired';
}

function expiryDate(row){
  if (!row.redeemed_at || row.duration_days === null || row.duration_days === undefined) return null;
  const redeemedMs = new Date(row.redeemed_at).getTime();
  return new Date(redeemedMs + row.duration_days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const adminSecret = req.query.admin_secret;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { data, error } = await supabase
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const enriched = data.map(row => ({
    ...row,
    status: computeStatus(row),
    expires_at: expiryDate(row)
  }));

  return res.status(200).json(enriched);
}
