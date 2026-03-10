import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// A helper to set up matchMedia so we can toggle system preference in tests.
function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches: prefersDark,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.push(fn);
    },
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    },
    _changeMatches: (newVal: boolean) => {
      (mql as { matches: boolean }).matches = newVal;
      listeners.forEach((fn) => fn({ matches: newVal } as MediaQueryListEvent));
    },
  };
  vi.stubGlobal('matchMedia', (_query: string) => mql);
  return mql;
}

describe('useTheme hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial theme detection', () => {
    it('should default to light when no saved preference and system is light', () => {
      mockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should default to dark when no saved preference and system is dark', () => {
      mockMatchMedia(true);

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should use saved light preference over system dark preference', () => {
      mockMatchMedia(true);
      localStorageMock.setItem('accomplish-theme', 'light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should use saved dark preference over system light preference', () => {
      mockMatchMedia(false);
      localStorageMock.setItem('accomplish-theme', 'dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('toggleTheme()', () => {
    it('should switch from light to dark', () => {
      mockMatchMedia(false);

      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should switch from dark to light', () => {
      mockMatchMedia(true);

      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should persist the choice to localStorage after toggle', () => {
      mockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorageMock.getItem('accomplish-theme')).toBe('dark');
    });

    it('should toggle back and update localStorage', () => {
      mockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(localStorageMock.getItem('accomplish-theme')).toBe('light');
    });
  });

  describe('system preference changes', () => {
    it('should react to system dark mode change when no explicit choice made', () => {
      const mql = mockMatchMedia(false);

      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('light');

      act(() => {
        mql._changeMatches(true);
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should ignore system changes after user toggles', () => {
      const mql = mockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme(); // user chose dark
      });

      act(() => {
        mql._changeMatches(false); // system goes back to light
      });

      // Should still be dark because user made an explicit choice
      expect(result.current.theme).toBe('dark');
    });
  });
});
