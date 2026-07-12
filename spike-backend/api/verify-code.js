// api/verify-code.js
// Validates an access code. On first-ever use, stamps "redeemed_at" so the
// code's duration starts counting from the moment it's actually redeemed,
// not from when it was created. Safe to call repeatedly (idempotent).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function computeStatus(row){
  if(!row) return { valid: false, reason: 'not_found' };

  if(row.duration_days === null || row.duration_days === undefined){
    return { valid: true, lifetime: true, expires_at: null };
  }

  const redeemedMs = new Date(row.redeemed_at).getTime();
  const expiresMs = redeemedMs + row.duration_days * 24 * 60 * 60 * 1000;

  if(Date.now() > expiresMs){
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, lifetime: false, expires_at: new Date(expiresMs).toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, reason: 'method_not_allowed' });
  }

  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ valid: false, reason: 'missing_code' });

    const { data: row, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ valid: false, reason: 'server_error' });
    }
    if (!row) return res.status(200).json({ valid: false, reason: 'not_found' });

    // First-time redemption: stamp the start of this code's countdown right now.
    if (!row.redeemed_at) {
      const nowIso = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('access_codes')
        .update({ redeemed_at: nowIso })
        .eq('code', code);
      if (updateErr) {
        console.error('Supabase error:', updateErr);
        return res.status(500).json({ valid: false, reason: 'server_error' });
      }
      row.redeemed_at = nowIso;
    }

    return res.status(200).json(computeStatus(row));
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ valid: false, reason: 'server_error' });
  }
}
