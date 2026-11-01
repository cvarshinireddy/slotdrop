// Every color resolves to a CSS variable (see src/styles/tokens.css), so light/dark is a class swap and
// no component ever contains a hex value. `<alpha-value>` keeps utilities like bg-primary/10 working.
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

const status = (name) => ({
  DEFAULT: token(`status-${name}`),
  bg: token(`status-${name}-bg`),
  fg: token(`status-${name}-fg`),
  border: token(`status-${name}-border`),
});

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        border: token('border'),
        foreground: token('foreground'),
        muted: { foreground: token('muted-foreground') },
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground'), soft: token('primary-soft'), 'soft-foreground': token('primary-soft-foreground') },
        ring: token('ring'),
        qr: { bg: token('qr-bg'), fg: token('qr-fg') },
        status: {
          received: status('received'),
          booked: status('booked'),
          delivered: status('delivered'),
          overdue: status('overdue'),
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Figtree Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      // Type scale 12 / 14 / 16 / 20 / 28 / 36
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: { xl: '0.75rem', '2xl': 'var(--radius)', '3xl': '1.5rem' },
      boxShadow: { soft: 'var(--shadow-sm)', lift: 'var(--shadow-md)' },
      transitionDuration: { fast: '120ms', base: '200ms' },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)' },
      minHeight: { tap: '2.75rem' }, // 44px minimum tap target
      minWidth: { tap: '2.75rem' },
    },
  },
  plugins: [],
};
