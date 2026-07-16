// api/history.js
// Returns the permanent trade history log (every signal ever fired, with
// its outcome once resolved). This is an owner-facing analytics endpoint,
// protected by ADMIN_SECRET — not a regular access code — since it's meant
// for performance review, not for regular dashboard viewers.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    .from('trade_history')
    .select('*')
    .order('opened_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
