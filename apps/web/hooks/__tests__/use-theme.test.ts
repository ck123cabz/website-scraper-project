import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/components/shared/ThemeProvider';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import React from 'react';

// Create wrapper with ThemeProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, { defaultTheme: 'system' }, children);
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('should throw error when used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('should provide current theme', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    // Wait for mounted state
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.theme).toBeDefined();
    expect(['light', 'dark', 'system'].includes(result.current.theme)).toBe(true);
  });

  it('should provide resolved theme', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.resolvedTheme).toBeDefined();
    expect(['light', 'dark'].includes(result.current.resolvedTheme)).toBe(true);
  });

  it('should provide setTheme function', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(typeof result.current.setTheme).toBe('function');
  });

  it('should change theme when setTheme is called', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.theme).toBe('dark');
  });

  it('should resolve light theme correctly', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('light');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.resolvedTheme).toBe('light');
  });

  it('should resolve dark theme correctly', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should respect system preference when set to system', async () => {
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('system');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should update document class when theme changes', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class for light theme', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setTheme('light');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should persist theme to localStorage', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should load theme from localStorage on mount', async () => {
    localStorage.setItem('theme', 'dark');

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTheme(), { wrapper });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.theme).toBe('dark');
  });

  it('should support all three theme values', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    // Test light
    act(() => {
      result.current.setTheme('light');
    });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(result.current.theme).toBe('light');

    // Test dark
    act(() => {
      result.current.setTheme('dark');
    });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(result.current.theme).toBe('dark');

    // Test system
    act(() => {
      result.current.setTheme('system');
    });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(result.current.theme).toBe('system');
  });

  it('should return object with all required properties', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('setTheme');
    expect(result.current).toHaveProperty('resolvedTheme');
  });

  it('should handle rapid theme changes', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
      result.current.setTheme('light');
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.theme).toBe('dark');
  });

  it('should persist changes across re-renders', async () => {
    const { result, rerender } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('dark');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    rerender();

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should maintain resolved theme consistency', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.setTheme('light');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const resolved1 = result.current.resolvedTheme;

    rerender();

    const resolved2 = result.current.resolvedTheme;

    expect(resolved1).toBe(resolved2);
  });

  it('should sync document class with theme', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const testThemes: Array<'light' | 'dark'> = ['light', 'dark'];

    for (const theme of testThemes) {
      act(() => {
        result.current.setTheme(theme);
      });

      await new Promise(resolve => setTimeout(resolve, 30));

      const hasDarkClass = document.documentElement.classList.contains('dark');
      const shouldHaveDark = theme === 'dark';

      expect(hasDarkClass).toBe(shouldHaveDark);
    }
  });
});
