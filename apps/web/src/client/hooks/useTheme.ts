import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'accomplish-theme';

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // localStorage blocked in privacy/incognito mode
  }
  return null;
}

function getSystemTheme(): Theme {
  try {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // matchMedia unavailable in some environments
  }
  return 'light';
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function getInitialTheme(): Theme {
  const saved = readSavedTheme();
  return saved ?? getSystemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  // Track whether the user has made an explicit choice so we only persist
  // after a real toggle and not just because of the initial system read.
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => readSavedTheme() !== null,
  );

  // Apply the theme class to <html> whenever it changes.
  useEffect(() => {
    applyTheme(theme);
    if (!hasExplicitChoice) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Silently ignore if storage is unavailable
    }
  }, [theme, hasExplicitChoice]);

  // Keep in sync with OS theme changes, but only if the user has not
  // overridden with an explicit choice.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (!hasExplicitChoice) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mq.addEventListener('change', handleChange);
    return () => {
      mq?.removeEventListener('change', handleChange);
    };
  }, [hasExplicitChoice]);

  const toggleTheme = () => {
    setHasExplicitChoice(true);
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
}
