import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const token = (name: string) => `rgb(var(--hl-${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        green: {
          DEFAULT: token('green'),
          dark: token('green-dark'),
          darker: token('green-darker'),
          soft: token('green-soft'),
          tint: token('green-tint'),
        },
        brand: { DEFAULT: token('green'), dark: token('green-dark') },
        gold: { DEFAULT: token('gold'), dark: token('gold-dark'), soft: token('gold-soft') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2') },
        stone: {
          50: token('stone-50'),
          100: token('stone-100'),
          200: token('stone-200'),
          300: token('stone-300'),
          500: token('stone-500'),
        },
        muted: token('muted'),
        subtle: token('subtle'),
        border: { DEFAULT: token('border'), strong: token('border-strong') },
        success: token('success'),
        warning: { DEFAULT: token('warning'), dark: token('warning-dark') },
        danger: token('danger'),
        error: token('error'),
        info: { DEFAULT: token('info'), dark: token('info-dark') },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-ethiopic)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'var(--font-ethiopic)', 'system-ui', 'sans-serif'],
        ethiopic: ['var(--font-ethiopic)', 'var(--font-sans)', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1.4' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.6' }],
        h3: ['1.25rem', { lineHeight: '1.3' }],
        'h3-lg': ['1.5rem', { lineHeight: '1.3' }],
        h2: ['1.625rem', { lineHeight: '1.2' }],
        'h2-lg': ['2.125rem', { lineHeight: '1.15' }],
        h1: ['2rem', { lineHeight: '1.15' }],
        'h1-lg': ['2.75rem', { lineHeight: '1.1' }],
        display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['4rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '20px' },
      boxShadow: {
        xs: '0 1px 2px rgb(21 34 56 / 0.06)',
        sm: '0 1px 3px rgb(21 34 56 / 0.08), 0 1px 2px rgb(21 34 56 / 0.04)',
        md: '0 6px 16px rgb(21 34 56 / 0.10), 0 2px 4px rgb(21 34 56 / 0.06)',
        lg: '0 16px 40px rgb(21 34 56 / 0.14)',
      },
      maxWidth: { content: '80rem' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
        'slide-in-right': 'slide-in-right 220ms ease-out',
      },
    },
  },
  plugins: [typography],
}
export default config
