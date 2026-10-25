import webpush from 'web-push';
import { query } from './db.js';

const configured = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL;
if (configured) {
  webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

export const getPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

export const saveSubscription = async (userId, subscription) => {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription, updated_at = NOW()`,
    [userId, subscription.endpoint, JSON.stringify(subscription)]
  );
};

export const removeSubscription = async (userId, endpoint) => {
  await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
};

export const sendPushToAll = async (payload) => {
  if (!configured) return;
  const result = await query('SELECT endpoint, subscription FROM push_subscriptions');
  await Promise.all(result.rows.map(async ({ endpoint, subscription }) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
      } else {
        console.error('[Web Push]', err.message);
      }
    }
  }));
};
