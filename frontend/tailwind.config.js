/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0d9488',
        'primary-hover': '#0f766e',
        'bg-main': '#0f172a',
        'bg-card': '#1e293b',
      }
    },
  },
  plugins: [],
}
