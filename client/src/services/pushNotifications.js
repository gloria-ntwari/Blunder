import api from './api.js';

const decodeVapidKey = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

/** Enable Web Push. Permission is requested only when explicitly allowed. */
export async function enablePushNotifications({ requestPermission = false } = {}) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('This browser does not support web push notifications.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const { data } = await api.get('/notifications/push/public-key');
  if (!data.publicKey) throw new Error('Web Push is not configured on the server.');

  let permission = Notification.permission;
  if (permission === 'default' && requestPermission) permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in Chrome site settings.');

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(data.publicKey),
    });
  }

  await api.post('/notifications/push/subscribe', subscription.toJSON());
  return true;
}
