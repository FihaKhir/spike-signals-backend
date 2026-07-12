// api/heartbeat.js
// The EA pings this every timer cycle (every few seconds), regardless of
// whether any signal fires. The website checks this to know whether the
// robot is actually running, instead of guessing from signal activity —
// since a quiet market can look identical to a disconnected EA otherwise.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ONLINE_THRESHOLD_MS = 30 * 1000; // no heartbeat in 30s => considered offline

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { error } = await supabase
      .from('heartbeat')
      .upsert({ id: 1, last_seen: new Date().toISOString() });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('heartbeat')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const lastSeenMs = data ? new Date(data.last_seen).getTime() : 0;
    const online = (Date.now() - lastSeenMs) < ONLINE_THRESHOLD_MS;
    return res.status(200).json({ last_seen: data?.last_seen || null, online });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}
