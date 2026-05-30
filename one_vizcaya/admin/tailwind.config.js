/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        provincial: {
          50:  '#E8F5E9',
          100: '#C8E6C9',
          600: '#388E3C',
          700: '#2E7D32',
          800: '#1B5E20',
        },
        municipal: {
          700: '#1565C0',
          800: '#0D47A1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
