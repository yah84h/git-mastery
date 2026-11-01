/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        panel: v('panel'),
        raised: v('raised'),
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
        faint: v('faint'),
        accent: v('accent'),
        'accent-fg': v('accent-fg'),
        ok: v('ok'),
        bad: v('bad'),
        warn: v('warn'),
        info: v('info'),
        b1: v('b1'),
        b2: v('b2'),
        b3: v('b3'),
        b4: v('b4'),
        term: v('term'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0)', opacity: '0' }, '70%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(6px)', opacity: '0' }, '100%': { transform: 'none', opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
        glow: { '0%': { boxShadow: '0 0 0 0 rgb(var(--ok) / .55)' }, '100%': { boxShadow: '0 0 0 14px rgb(var(--ok) / 0)' } },
      },
      animation: {
        pop: 'pop .45s cubic-bezier(.2,.8,.3,1.2) both',
        rise: 'rise .35s ease-out both',
        shake: 'shake .4s ease-in-out',
        glow: 'glow .8s ease-out',
      },
    },
  },
  plugins: [],
};
