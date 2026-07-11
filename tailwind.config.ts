import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#152238',
        muted: '#5B6472',
        bg: '#FFFFFF',
        section: '#F4F5F3',
        border: '#E4E6E3',
        green: {
          DEFAULT: '#1C7C4C',
          dark: '#155F3A',
          soft: '#E9F5EE',
        },
        gold: {
          DEFAULT: '#B8862E',
          soft: '#FBF1DE',
        },
      },
      fontFamily: {
        display: ['var(--font-inter)'],
        sans: ['var(--font-inter)'],
        mono: ['var(--font-plex-mono)'],
      },
    },
  },
  plugins: [],
}
export default config
