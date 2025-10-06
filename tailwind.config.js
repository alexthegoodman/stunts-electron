/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'theme-primary': 'rgb(var(--theme-primary) / <alpha-value>)',
        'theme-secondary': 'rgb(var(--theme-secondary) / <alpha-value>)',
        'theme-accent': 'rgb(var(--theme-accent) / <alpha-value>)',
        'theme-bg-primary': 'rgb(var(--theme-bg-primary) / <alpha-value>)',
        'theme-bg-secondary': 'rgb(var(--theme-bg-secondary) / <alpha-value>)',
        'theme-text-primary': 'rgb(var(--theme-text-primary) / <alpha-value>)',
        'theme-text-secondary': 'rgb(var(--theme-text-secondary) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
