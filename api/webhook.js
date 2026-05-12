import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

function generateToken() {
  return 'RC-' + crypto.randomBytes(16).toString('hex').toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {

      // New subscriber — generate token and email them
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const email = session.customer_details?.email;
        const subscriptionId = session.subscription;
        const token = generateToken();

        // Store in Supabase
        const { error } = await supabase.from('subscribers').upsert({
          email,
          token,
          active: true,
          stripe_subscription_id: subscriptionId,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days
        }, { onConflict: 'email' });

        if (error) {
          console.error('Supabase error:', error);
          break;
        }

        // Send welcome email with token
        await resend.emails.send({
          from: 'Roof Code NZ <noreply@roofcode-nz.vercel.app>',
          to: email,
          subject: 'Welcome to Roof Code NZ Pro 🏠',
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
              <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
                <h1 style="color:white;margin:0;font-size:24px;">Roof Code NZ Pro</h1>
                <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px;">COP v26.03 · Unlimited Access</p>
              </div>

              <p style="color:#1e293b;font-size:16px;">Kia ora!</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;">Thanks for subscribing to Roof Code NZ Pro. You now have unlimited access to precise NZ roofing code guidance from MRM COP v26.03.</p>

              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
                <p style="color:#1e40af;font-size:13px;margin:0 0 8px;font-weight:600;">YOUR UNLOCK CODE</p>
                <p style="color:#1d4ed8;font-size:24px;font-weight:700;letter-spacing:0.1em;margin:0;font-family:monospace;">${token}</p>
                <p style="color:#64748b;font-size:12px;margin:8px 0 0;">Enter this in the Roof Code NZ app to unlock unlimited access</p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;"><strong>How to use it:</strong><br>
              1. Go to <a href="https://roofcode-nz.vercel.app" style="color:#2563eb;">roofcode-nz.vercel.app</a><br>
              2. Use your 5 free questions (or wait for the paywall)<br>
              3. Click Subscribe → enter your unlock code above<br>
              4. Unlimited access activated!</p>

              <p style="color:#475569;font-size:14px;line-height:1.6;">Your subscription renews monthly at NZ$3.99. You'll receive a new unlock code by email with each renewal.</p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;">Roof Code NZ is an independent platform. Not affiliated with MBIE, NZMRM or the NZ Government. Always verify against the current COP and manufacturer specs.</p>
            </div>
          `,
        });

        console.log(`New subscriber: ${email}, token: ${token}`);
        break;
      }

      // Subscription renewed — refresh token expiry
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subscriptionId = invoice.subscription;
        const token = generateToken();

        // Get subscriber by subscription ID
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('email')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!subscriber) break;

        // Update token and expiry
        await supabase.from('subscribers').update({
          token,
          active: true,
          expires_at: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('stripe_subscription_id', subscriptionId);

        // Email new token
        await resend.emails.send({
          from: 'Roof Code NZ <noreply@roofcode-nz.vercel.app>',
          to: subscriber.email,
          subject: 'Roof Code NZ — Your monthly unlock code',
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
              <h2 style="color:#0f172a;">Your Roof Code NZ renewal code</h2>
              <p style="color:#475569;font-size:14px;">Your subscription has renewed. Here's your new unlock code:</p>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;">
                <p style="color:#1e40af;font-size:13px;margin:0 0 8px;font-weight:600;">YOUR UNLOCK CODE</p>
                <p style="color:#1d4ed8;font-size:24px;font-weight:700;letter-spacing:0.1em;margin:0;font-family:monospace;">${token}</p>
              </div>
              <p style="color:#475569;font-size:14px;margin-top:16px;">Enter this at <a href="https://roofcode-nz.vercel.app" style="color:#2563eb;">roofcode-nz.vercel.app</a> to continue your unlimited access.</p>
            </div>
          `,
        });

        console.log(`Subscription renewed: ${subscriber.email}`);
        break;
      }

      // Subscription cancelled — deactivate
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await supabase.from('subscribers').update({
          active: false,
        }).eq('stripe_subscription_id', subscription.id);
        console.log(`Subscription cancelled: ${subscription.id}`);
        break;
      }

      // Payment failed — deactivate
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await supabase.from('subscribers').update({
          active: false,
        }).eq('stripe_subscription_id', invoice.subscription);
        console.log(`Payment failed: ${invoice.subscription}`);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Get raw body for Stripe signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export const config = {
  api: { bodyParser: false },
};
