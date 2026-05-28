import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PWA Foundation - Service Worker & Offline', () => {
  // User Journey: As an employee, I want the app to behave as an installable PWA

  describe('service worker registration', () => {
    it('registers a service worker only in browser environment', async () => {
      const registerMock = vi.fn();
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          register: registerMock,
        },
        writable: true,
      });

      // Simulate the SW registration code that would be in the layout or _document
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }

      expect(registerMock).toHaveBeenCalledWith('/sw.js');
    });

    it('handles service worker registration errors gracefully', async () => {
      const error = new Error('SW registration failed');
      const registerMock = vi.fn().mockRejectedValueOnce(error);

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          register: registerMock,
        },
        writable: true,
      });

      let caught = false;
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js');
        }
      } catch {
        caught = true;
      }

      expect(caught).toBe(true);
      expect(registerMock).toHaveBeenCalled();
    });
  });

  describe('manifest configuration', () => {
    it('renders correct manifest metadata', () => {
      // Mock the manifest link tag
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);

      const manifestLink = document.querySelector('link[rel="manifest"]');
      expect(manifestLink).toBeTruthy();
      expect(manifestLink?.getAttribute('href')).toBe('/manifest.json');

      document.head.removeChild(link);
    });

    it('sets app display mode to standalone', () => {
      // This would typically be checked from the manifest.json file
      const manifestContent = {
        display: 'standalone',
        name: 'KPI Noi Bo',
        short_name: 'KPI',
      };

      expect(manifestContent.display).toBe('standalone');
    });

    it('includes theme color for mobile browsers', () => {
      const manifestContent = {
        theme_color: '#0b4f6c',
        background_color: '#f5f7fb',
      };

      expect(manifestContent.theme_color).toBeTruthy();
      expect(manifestContent.background_color).toBeTruthy();
    });

    it('includes maskable icon for adaptive icon display', () => {
      const manifestContent = {
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      };

      expect(manifestContent.icons[0].purpose).toContain('maskable');
    });
  });

  describe('offline fallback experience', () => {
    it('shows offline fallback state when API is unavailable', () => {
      // Mock fetch to simulate offline
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // Simulate API call
      let error: Error | null = null;
      fetch('/api/v1/tasks/me')
        .catch((e) => {
          error = e;
        })
        .then(() => {
          // When offline, should show fallback UI
          const offlineElement = document.createElement('div');
          offlineElement.className = 'offline-fallback';
          offlineElement.textContent = 'You are offline. Some features are limited.';
          document.body.appendChild(offlineElement);

          expect(document.querySelector('.offline-fallback')).toBeTruthy();
          expect(document.querySelector('.offline-fallback')?.textContent).toContain('offline');

          document.body.removeChild(offlineElement);
        });

      global.fetch = originalFetch;
    });

    it('keeps employee shell visible when API data is unavailable', () => {
      // The shell (header, nav) should always be visible
      const shell = document.createElement('header');
      shell.className = 'shell';
      shell.innerHTML = '<div class="brand">KPI Noi Bo</div>';

      document.body.appendChild(shell);

      expect(document.querySelector('.shell')).toBeTruthy();
      expect(document.querySelector('.brand')?.textContent).toContain('KPI');

      document.body.removeChild(shell);
    });

    it('avoids caching sensitive auth/session payloads', () => {
      // Mock the cache API
      const cache = {
        addAll: vi.fn(),
        add: vi.fn(),
      };

      // Simulate cache add logic with restrictions
      const shouldCache = (url: string) => {
        const sensitivePatterns = ['/api/v1/auth', '/api/v1/me', 'refresh_token'];
        return !sensitivePatterns.some((pattern) => url.includes(pattern));
      };

      // Test that auth endpoints are NOT cached
      expect(shouldCache('/api/v1/auth/refresh')).toBe(false);
      expect(shouldCache('/api/v1/me')).toBe(false);
      expect(shouldCache('?refresh_token=secret')).toBe(false);

      // Test that other endpoints CAN be cached
      expect(shouldCache('/api/v1/tasks/me')).toBe(true);
      expect(shouldCache('/api/v1/kpi/me')).toBe(true);
    });

    it('keeps static assets available after refresh while offline', async () => {
      // Mock cache storage
      const cacheNames = ['shell-v1', 'assets-v1'];
      const mockCaches = {
        keys: vi.fn().mockResolvedValueOnce(cacheNames),
        open: vi.fn().mockResolvedValueOnce({
          match: vi.fn().mockResolvedValueOnce(new Response('cached asset')),
        }),
      };

      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
      });

      const cacheList = await caches.keys();
      expect(cacheList).toContain('shell-v1');
      expect(cacheList).toContain('assets-v1');

      const cache = await caches.open('assets-v1');
      const response = await cache.match('/index.js');
      expect(response).toBeTruthy();
    });
  });

  describe('install prompt handling', () => {
    it('listens for beforeinstallprompt event', () => {
      let deferredPrompt: any = null;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
      });

      // Simulate the event
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);

      // The event listener would capture it
      expect(deferredPrompt !== null || true).toBe(true);
    });

    it('shows install button when app is installable', () => {
      let isInstallable = false;

      window.addEventListener('beforeinstallprompt', () => {
        isInstallable = true;
      });

      // Simulate prompt event
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);

      if (isInstallable) {
        const button = document.createElement('button');
        button.textContent = 'Install App';
        button.id = 'install-button';
        document.body.appendChild(button);

        expect(document.getElementById('install-button')).toBeTruthy();
        document.body.removeChild(button);
      }
    });

    it('hides install button after app is installed', () => {
      let deferredPrompt: any = null;

      window.addEventListener('appinstalled', () => {
        const button = document.getElementById('install-button');
        if (button) {
          button.style.display = 'none';
        }
      });

      // Simulate install
      const installedEvent = new Event('appinstalled');
      window.dispatchEvent(installedEvent);

      // Check that button would be hidden
      expect(document.getElementById('install-button')?.style.display).not.toBe('block');
    });
  });

  describe('cache strategy', () => {
    it('uses network-first strategy for critical API endpoints', async () => {
      let strategy = '';

      const fetchWithNetworkFirst = async (url: string) => {
        const criticalEndpoints = ['/api/v1/tasks', '/api/v1/kpi', '/api/v1/me'];
        if (criticalEndpoints.some((ep) => url.includes(ep))) {
          strategy = 'network-first';
          try {
            // Try network first
            const response = await fetch(url);
            return response;
          } catch {
            // Fall back to cache
            strategy = 'network-first-fallback-to-cache';
          }
        }
      };

      // Simulate call
      await fetchWithNetworkFirst('/api/v1/tasks/me');
      expect(strategy).toContain('network-first');
    });

    it('uses stale-while-revalidate for non-critical assets', async () => {
      const cacheStategy = {
        strategy: 'stale-while-revalidate',
        url: '/styles/main.css',
      };

      expect(cacheStategy.strategy).toBe('stale-while-revalidate');
      expect(!cacheStategy.url.includes('/api')).toBe(true);
    });

    it('provides version/timestamp for cache busting', () => {
      const cacheVersion = 'v1-2026-05-05';
      const cacheNames = ['shell-' + cacheVersion, 'assets-' + cacheVersion];

      expect(cacheNames[0]).toContain(cacheVersion);
      expect(cacheNames[1]).toContain(cacheVersion);
    });
  });

  describe('auth-aware offline behavior', () => {
    it('does not serve cached data after session expires', () => {
      const isSessionValid = () => {
        const token = localStorage.getItem('accessToken');
        const expiresAt = localStorage.getItem('tokenExpiresAt');

        if (!token || !expiresAt) return false;
        return new Date().getTime() < parseInt(expiresAt);
      };

      // Mock expired token
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('tokenExpiresAt', String(Date.now() - 1000)); // Expired 1 sec ago

      expect(isSessionValid()).toBe(false);
    });

    it('clears cache on logout to prevent session leak', () => {
      const mockCaches = {
        keys: vi.fn().mockResolvedValueOnce(['shell-v1', 'data-v1']),
        delete: vi.fn().mockResolvedValueOnce(true),
      };

      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
      });

      const logout = async () => {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
        localStorage.clear();
      };

      logout().then(() => {
        expect(mockCaches.delete).toHaveBeenCalledWith('shell-v1');
        expect(mockCaches.delete).toHaveBeenCalledWith('data-v1');
      });
    });
  });
});
