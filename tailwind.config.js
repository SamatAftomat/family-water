/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        water: {
          blue: "#4A90E2",
          light: "#D6E8F8",
          dark: "#2C5A8A",
        }
      }
    },
  },
  plugins: [],
}