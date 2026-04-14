/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        surface: {
          50: '#fafafa',
          100: '#f5f5f4',
          200: '#e8e8e6',
          800: '#1c1c1e',
          900: '#141414',
          950: '#0d0d0d',
        },
      },
    },
  },
  plugins: [],
}
