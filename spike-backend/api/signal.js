// api/signal.js
// Receives both new signals AND status updates (TP/SL hit) from the MT5 EA.
// Upsert only touches the fields provided, so a status-only update won't
// wipe out the entry/SL/TP data already stored for that symbol.

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
    const {
      symbol, family, direction, confidence, components, confirmations,
      atr_value, entry_price, sl_price, tp_price,
      ticks_since_jump, expected_gap_ticks, family_score,
      timeframe, status, hit_time, bar_time, sent_at
    } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Missing required field: symbol' });
    }

    // Build the row with only the fields that were actually sent, so a
    // status-only update (TP/SL hit) doesn't overwrite other columns with null.
    const row = { symbol };
    if (family !== undefined) row.family = family;
    if (direction !== undefined) row.direction = direction;
    if (confidence !== undefined) row.confidence = confidence;
    if (confirmations !== undefined) row.confirmations = confirmations;
    if (components?.compression !== undefined) row.compression = components.compression;
    if (components?.velocity !== undefined) row.velocity = components.velocity;
    if (components?.time_since_spike !== undefined) row.time_since_spike = components.time_since_spike;
    if (atr_value !== undefined) row.atr_value = atr_value;
    if (entry_price !== undefined) row.entry_price = entry_price;
    if (sl_price !== undefined) row.sl_price = sl_price;
    if (tp_price !== undefined) row.tp_price = tp_price;
    if (ticks_since_jump !== undefined) row.ticks_since_jump = ticks_since_jump;
    if (expected_gap_ticks !== undefined) row.expected_gap_ticks = expected_gap_ticks;
    if (family_score !== undefined) row.family_score = family_score;
    if (timeframe !== undefined) row.timeframe = timeframe;
    if (status !== undefined) row.status = status;
    if (hit_time !== undefined) row.hit_time = hit_time;
    if (bar_time !== undefined) row.bar_time = bar_time;
    if (sent_at !== undefined) row.sent_at = sent_at;

    const { error } = await supabase
      .from('signals')
      .upsert(row, { onConflict: 'symbol' });

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
