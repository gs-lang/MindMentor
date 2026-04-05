const express = require('express');
const router = express.Router();

// Stripe is optional — if STRIPE_SECRET_KEY is not set, billing routes return
// a "coming soon" response so the app still deploys and runs without Stripe.
const STRIPE_ENABLED = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

if (!STRIPE_ENABLED) {
  console.log('[stripe] STRIPE_SECRET_KEY not set — billing routes in coming-soon mode');
}

function createStripeRoutes(pool) {
  const appUrl = process.env.APP_URL || 'https://mindmentor.replit.app';

  // Create Checkout Session for Pro subscription
  router.post('/create-checkout', async (req, res) => {
    if (!STRIPE_ENABLED) {
      return res.status(503).json({
        error: 'billing_not_configured',
        message: 'Pro plans are coming soon. Contact us at hello@mindmentor.app to get early access.',
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userResult = await pool.query(
        'SELECT id, email, stripe_customer_id, subscription_tier FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.subscription_tier === 'pro') {
        return res.status(400).json({ error: 'Already subscribed to Pro' });
      }

      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { mindmentor_user_id: String(user.id) },
        });
        customerId = customer.id;
        await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
      }

      const priceId = req.body.tier === 'business'
        ? process.env.STRIPE_PRICE_ID_BUSINESS
        : req.body.tier === 'team'
          ? process.env.STRIPE_PRICE_ID_TEAM
          : process.env.STRIPE_PRICE_ID_PRO;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing/cancel`,
        metadata: { mindmentor_user_id: String(userId), tier: req.body.tier || 'pro' },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Customer portal
  router.get('/portal', async (req, res) => {
    if (!STRIPE_ENABLED) {
      return res.status(503).json({
        error: 'billing_not_configured',
        message: 'Billing portal coming soon.',
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    try {
      const userResult = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1', [userId]
      );
      const user = userResult.rows[0];
      if (!user || !user.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing account found' });
      }
      const portalSession = await require('stripe')(process.env.STRIPE_SECRET_KEY)
        .billingPortal.sessions.create({
          customer: user.stripe_customer_id,
          return_url: `${appUrl}/`,
        });
      res.json({ url: portalSession.url });
    } catch (err) {
      console.error('Stripe portal error:', err);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  return router;
}

function createStripeWebhookHandler(pool) {
  return async (req, res) => {
    if (!STRIPE_ENABLED) {
      return res.json({ received: true, note: 'stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const tier = session.metadata?.tier || 'pro';
          await pool.query(
            `UPDATE users SET subscription_tier = $1, stripe_subscription_id = $2
             WHERE stripe_customer_id = $3`,
            [tier, session.subscription, session.customer]
          );
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const tier = ['active', 'trialing'].includes(sub.status) ? 'pro' : 'free';
          await pool.query(
            'UPDATE users SET subscription_tier = $1 WHERE stripe_customer_id = $2',
            [tier, sub.customer]
          );
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          await pool.query(
            `UPDATE users SET subscription_tier = 'free', stripe_subscription_id = NULL
             WHERE stripe_customer_id = $1`,
            [sub.customer]
          );
          break;
        }
      }
    } catch (err) {
      console.error('Webhook processing error:', err);
    }

    res.json({ received: true });
  };
}

module.exports = { createStripeRoutes, createStripeWebhookHandler };
