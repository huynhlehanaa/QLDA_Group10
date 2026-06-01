'use client';

import { useSyncExternalStore } from 'react';
import { authStore } from '@/store/authStore';

export function useAuthStore() {
  return useSyncExternalStore(
    (listener) => authStore.subscribe(listener),
    () => authStore.getSnapshot(),
    () => authStore.getSnapshot()
  );
}
