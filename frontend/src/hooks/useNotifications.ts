'use client';

import { useEffect, useRef, useState } from 'react';
import { createNotificationSocket } from '@/lib/websocket';
import { authStore } from '@/store/authStore';

export function useNotifications() {
  const [messages, setMessages] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!authStore.state.accessToken) return;
    const ws = createNotificationSocket(authStore.state.accessToken);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      setMessages((prev) => [event.data, ...prev].slice(0, 20));
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, []);

  return { messages };
}
