import { getPublicKey, saveSubscription, removeSubscription } from '../config/push.js';

export const getPushPublicKey = (req, res) => {
  const publicKey = getPublicKey();
  if (!publicKey) return res.status(503).json({ message: 'Web Push is not configured' });
  res.json({ publicKey });
};

export const subscribeToPush = async (req, res, next) => {
  try {
    if (!req.body?.endpoint || !req.body?.keys) return res.status(400).json({ message: 'Invalid push subscription' });
    await saveSubscription(req.user.id, req.body);
    res.status(201).json({ message: 'Push notifications enabled' });
  } catch (err) { next(err); }
};

export const unsubscribeFromPush = async (req, res, next) => {
  try {
    await removeSubscription(req.user.id, req.body?.endpoint);
    res.json({ message: 'Push notifications disabled' });
  } catch (err) { next(err); }
};
