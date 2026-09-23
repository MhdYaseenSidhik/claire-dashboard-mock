/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
      },
      // Type scale — reads the tokens (12/14/16/20/24/32). Use these named
      // sizes, not Tailwind's numeric defaults, so the scale stays closed.
      fontSize: {
        caption: ['var(--text-caption)', { lineHeight: 'var(--leading-normal)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-tight)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-tight)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
      },
      // 4px spacing scale — the only gaps/paddings components should use.
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        12: 'var(--space-12)',
      },
      // Control heights — one set (32/36/40).
      height: {
        control: 'var(--control-md)',
        'control-sm': 'var(--control-sm)',
        'control-lg': 'var(--control-lg)',
      },
      maxWidth: { page: 'var(--page-max)' },
      borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)' },
      boxShadow: {
        e1: 'var(--elev-1)',
        e2: 'var(--elev-2)',
        e3: 'var(--elev-3)',
      },
      transitionTimingFunction: { out: 'var(--ease-out)' },
      transitionDuration: { DEFAULT: 'var(--motion)', fast: 'var(--motion-fast)' },
    },
  },
  plugins: [],
};
