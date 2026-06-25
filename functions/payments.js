/**
 * NETTUNO — Pagamentos (Stripe). Esqueleto SEGURO, pronto a ativar.
 *
 * NÃO está ligado ao index.js por defeito (evita exigir a dep `stripe` no deploy
 * atual). Para ativar:
 *   1. cd functions && npm i stripe
 *   2. firebase functions:secrets:set STRIPE_KEY
 *      firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *   3. No index.js adicionar:
 *        const pay = require('./payments');
 *        exports.createCheckoutSession = pay.createCheckoutSession;
 *        exports.stripeWebhook        = pay.stripeWebhook;
 *   4. Definir PRO_PRICE_ID (price_… do dashboard Stripe).
 *
 * Segurança: preço definido server-side; webhook valida assinatura; entitlement
 * gravado via Admin SDK (cliente não pode pôr pro=true sozinho — ver rules target).
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getFirestore } = require('firebase-admin/firestore');

const STRIPE_KEY = defineSecret('STRIPE_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

const PRO_PRICE_ID = 'price_REPLACE_ME';        // ID do preço no dashboard Stripe
const SITE = 'https://nettuno-e6036.web.app';

// 1) Iniciar checkout — preço SEMPRE no servidor
const createCheckoutSession = onCall(
  { enforceAppCheck: true, cors: true, region: 'europe-west1', secrets: [STRIPE_KEY] },
  async (req) => {
    const uid = req.auth && req.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login necessário.');

    const stripe = require('stripe')(STRIPE_KEY.value());
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      client_reference_id: uid,
      success_url: `${SITE}/pro-ok.html`,
      cancel_url: `${SITE}/pro-cancel.html`,
      allow_promotion_codes: true,
    });
    return { url: session.url };
  },
);

// 2) Webhook — concede Pro só APÓS verificar a assinatura Stripe
const stripeWebhook = onRequest(
  { region: 'europe-west1', secrets: [STRIPE_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_KEY.value());
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        STRIPE_WEBHOOK_SECRET.value(),
      );
    } catch (err) {
      return res.status(400).send(`Assinatura inválida: ${err.message}`);
    }

    const db = getFirestore();

    // Idempotência: ignora eventos já processados
    const seenRef = db.doc(`stripeEvents/${event.id}`);
    if ((await seenRef.get()).exists) return res.json({ received: true, duplicate: true });

    try {
      if (event.type === 'checkout.session.completed') {
        const s = event.data.object;
        if (s.client_reference_id) {
          await db.doc(`users/${s.client_reference_id}`).set({
            pro: true, proSince: Date.now(), stripeCustomer: s.customer || null,
          }, { merge: true });
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const customer = event.data.object.customer;
        const q = await db.collection('users').where('stripeCustomer', '==', customer).limit(1).get();
        if (!q.empty) await q.docs[0].ref.set({ pro: false, proEndedAt: Date.now() }, { merge: true });
      }
      await seenRef.set({ type: event.type, at: Date.now() });
    } catch (e) {
      return res.status(500).send('erro a processar evento');
    }

    res.json({ received: true });
  },
);

module.exports = { createCheckoutSession, stripeWebhook };
