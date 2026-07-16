// api/generate-code.js
// Creates a new access code. Protected by ADMIN_SECRET (set in Vercel's
// environment variables) so only you can generate codes, never the public.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function randomCode(){
  return Math.random().toString(36).slice(2, 6).toUpperCase()
       + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { admin_secret, duration_days, label } = req.body;

  if (!admin_secret || admin_secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // duration_days: 5, 15, 30, or null for lifetime
  const code = randomCode();

  const { error } = await supabase
    .from('access_codes')
    .insert({ code, duration_days: duration_days ?? null, label: label || null });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ code, duration_days: duration_days ?? null });
}
