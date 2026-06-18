/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lumen: {
          50: '#f3f1ff',
          100: '#e9e5ff',
          200: '#d5cfff',
          300: '#b7a9ff',
          400: '#9580ff',
          500: '#7c6dd8',
          600: '#534AB7',
          700: '#4a3d9e',
          800: '#3d3382',
          900: '#342d6b',
        },
      },
    },
  },
  plugins: [],
}
