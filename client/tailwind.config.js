/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: '#0066cc',
        surface: '#f8f9fa',
      },
      fontWeight: {
        300: '300',
        500: '500',
        600: '600',
      },
    },
  },
  plugins: [],
}
