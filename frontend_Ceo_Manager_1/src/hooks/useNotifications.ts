'use client';

import { useEffect, useRef, useState } from 'react';
import { createNotificationSocket } from '@/lib/websocket';
import { useAuthStore } from '@/store/useAuthStore';

export function useNotifications() {
  const { accessToken } = useAuthStore();
  const [messages, setMessages] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const ws = createNotificationSocket(accessToken);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      setMessages((prev) => [event.data, ...prev].slice(0, 20));
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [accessToken]);

  return { messages };
}
