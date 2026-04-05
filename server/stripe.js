const express = require('express');
const router = express.Router();

function createStripeRoutes(pool) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL || 'https://mindmentor.replit.app';

  // Create Checkout Session for Pro subscription
  router.post('/create-checkout', async (req, res) => {
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

      // Create or reuse Stripe customer
      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { mindmentor_user_id: String(user.id) },
        });
        customerId = customer.id;
        await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing/cancel`,
        metadata: { mindmentor_user_id: String(userId) },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Customer portal for managing subscription
  router.get('/portal', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userResult = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];

      if (!user || !user.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing account found' });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
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

// Webhook handler — must be registered BEFORE express.json() middleware
// because Stripe needs the raw body for signature verification
function createStripeWebhookHandler(pool) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  return async (req, res) => {
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
          const customerId = session.customer;
          const subscriptionId = session.subscription;

          await pool.query(
            `UPDATE users SET subscription_tier = 'pro', stripe_subscription_id = $1
             WHERE stripe_customer_id = $2`,
            [subscriptionId, customerId]
          );
          console.log(`User upgraded to Pro: customer=${customerId}`);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          const status = subscription.status;

          // Active or trialing = pro, anything else = free
          const tier = ['active', 'trialing'].includes(status) ? 'pro' : 'free';
          await pool.query(
            'UPDATE users SET subscription_tier = $1 WHERE stripe_customer_id = $2',
            [tier, customerId]
          );
          console.log(`Subscription updated: customer=${customerId}, status=${status}, tier=${tier}`);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customerId = subscription.customer;

          await pool.query(
            `UPDATE users SET subscription_tier = 'free', stripe_subscription_id = NULL
             WHERE stripe_customer_id = $1`,
            [customerId]
          );
          console.log(`Subscription cancelled: customer=${customerId}`);
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
