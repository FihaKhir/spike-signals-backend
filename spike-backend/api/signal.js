// api/signal.js
// This endpoint receives signals POSTed from your MT5 EA (SpikeSignalHub.mq5)
// and saves/updates them in Supabase — one row per symbol, always the latest.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed here' });
  }

  try {
    const { symbol, direction, confidence, components, atr_value, bar_time, sent_at } = req.body;

    if (!symbol || !direction || confidence === undefined) {
      return res.status(400).json({ error: 'Missing required fields (symbol, direction, confidence)' });
    }

    const { error } = await supabase
      .from('signals')
      .upsert(
        {
          symbol,
          direction,
          confidence,
          compression: components?.compression ?? null,
          velocity: components?.velocity ?? null,
          time_since_spike: components?.time_since_spike ?? null,
          atr_value: atr_value ?? null,
          bar_time,
          sent_at
        },
        { onConflict: 'symbol' } // one row per symbol, always overwritten with the latest
      );

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
