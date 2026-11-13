/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="carbon"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

