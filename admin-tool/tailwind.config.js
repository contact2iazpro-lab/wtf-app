/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        orange: { DEFAULT: '#FF6B1A', dark: '#D94A10' },
      },
    },
  },
  plugins: [],
}
