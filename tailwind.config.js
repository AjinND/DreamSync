/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dream: {
          light: '#A5B4FC', // Light Indigo
          DEFAULT: '#6366F1', // Indigo
          dark: '#4338CA',
        },
        doing: {
          light: '#FDBA74', // Orange
          DEFAULT: '#F97316', // Orange
          dark: '#EA580C',
        },
        done: {
          light: '#86EFAC', // Green
          DEFAULT: '#22C55E', // Green
          dark: '#15803D',
        },
      },
      fontFamily: {
        sans: ['System'], // Will be replaced by Expo Google Fonts later if needed
      }
    },
  },
  plugins: [],
}
