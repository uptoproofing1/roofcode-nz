import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ valid: false, error: 'No token provided' });
  }

  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('email, active, expires_at')
      .eq('token', token.trim().toUpperCase())
      .single();

    if (error || !data) {
      return res.status(200).json({ valid: false, error: 'Token not found' });
    }

    const expired = new Date(data.expires_at) < new Date();

    if (!data.active || expired) {
      return res.status(200).json({ valid: false, error: 'Token expired or inactive' });
    }

    return res.status(200).json({ valid: true, email: data.email });

  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
}
