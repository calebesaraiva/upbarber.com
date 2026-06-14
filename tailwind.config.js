/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D4AF37',
          dark: '#A07830',
        },
        dark: {
          DEFAULT: '#0D0D0D',
          100: '#141414',
          200: '#1A1A1A',
          300: '#222222',
          400: '#2A2A2A',
          500: '#333333',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      }
    },
  },
  plugins: [],
}
