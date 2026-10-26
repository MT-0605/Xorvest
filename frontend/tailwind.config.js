/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        xorvest: {
          dark: '#0B0F17',
          card: '#111827',
          gold: '#F59E0B',
          amber: '#F59E0B',
          goldLight: '#FCD34D',
          goldDark: '#B45309'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
