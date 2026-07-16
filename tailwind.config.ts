import type { Config } from 'tailwindcss';

/**
 * Design tokens are defined once here and mirrored as CSS variables in src/index.css.
 * Components must consume the semantic names (bg-surface, text-gold) — never raw hex.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        black: 'var(--black)',
        'black-soft': 'var(--black-soft)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        white: 'var(--white)',
        gray: 'var(--gray)',
        'gray-soft': 'var(--gray-soft)',
        gold: 'var(--gold)',
        'gold-light': 'var(--gold-light)',
        'gold-dim': 'var(--gold-dim)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        protein: 'var(--protein)',
        carbs: 'var(--carbs)',
        fat: 'var(--fat)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        strong: 'var(--border-strong)',
      },
      borderRadius: {
        lg: '22px',
        md: '14px',
        sm: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        app: '480px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.22,1,.36,1)',
      },
      backgroundImage: {
        'app-glow': 'radial-gradient(ellipse 120% 80% at 50% -10%, #1c1a15 0%, var(--black) 55%)',
        'gold-mark': 'linear-gradient(145deg, var(--gold-light), var(--gold) 55%, var(--gold-dim))',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
