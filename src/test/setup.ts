import '@testing-library/jest-dom';

// Recharts' ResponsiveContainer relies on ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverStub;

// useTheme reads the system preference via matchMedia, which jsdom lacks.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
}
