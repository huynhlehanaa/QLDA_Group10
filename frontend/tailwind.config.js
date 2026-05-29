/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1b1f2a',
        mist: '#eef2f7',
        brand: '#0f766e',
        accent: '#fb923c',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 12px 30px rgba(11, 18, 32, 0.12)',
      },
    },
  },
  plugins: [],
}

