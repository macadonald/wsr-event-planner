import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          DEFAULT: '#5A3A22',
          50:  '#F5EDE5',
          100: '#E8D5C0',
          200: '#CCA882',
          300: '#B07B44',
          400: '#7A5030',
          500: '#5A3A22',
          600: '#4A2F1B',
          700: '#3A2414',
          800: '#2A190D',
          900: '#1A0E06',
        },
        cream: {
          DEFAULT: '#FDF6ED',
          50:  '#FFFDF9',
          100: '#FDF6ED',
          200: '#F7E8D4',
          300: '#F0D5B5',
          400: '#E0BC86',
          500: '#D0A357',
        },
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
