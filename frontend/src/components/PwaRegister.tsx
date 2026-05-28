"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let mounted = true;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        if (!mounted) return;
        console.log('ServiceWorker registered:', reg);

        if (reg.waiting) {
          console.log('Service worker waiting to activate.');
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available, please refresh.');
              } else {
                console.log('Content cached for offline use.');
              }
            }
          });
        });
      } catch (err) {
        console.error('ServiceWorker registration failed:', err);
      }
    };

    register();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
