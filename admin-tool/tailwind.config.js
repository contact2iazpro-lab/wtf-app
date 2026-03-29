/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    // Include game source files so Tailwind generates all classes used by
    // real QuestionScreen / RevelationScreen components in the live preview
    '../src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: { DEFAULT: '#FF6B1A', dark: '#D94A10' },
      },
    },
  },
  plugins: [],
}
