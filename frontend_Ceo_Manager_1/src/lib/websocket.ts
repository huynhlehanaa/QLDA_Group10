export function createNotificationSocket(accessToken: string): WebSocket {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const wsBase = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  return new WebSocket(`${wsBase}/ws/notifications?token=${encodeURIComponent(accessToken)}`);
}
