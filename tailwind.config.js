/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50:  '#e0f7ff',
          100: '#b3edff',
          200: '#80e1ff',
          300: '#4dd4fc',
          400: '#1ec8f7',
          500: '#06b4e9',
          600: '#0090c7',
          700: '#006da0',
          800: '#004e78',
          900: '#003050',
        },
        sand: {
          50:  '#fff9f0',
          100: '#fef0d6',
          200: '#fde4b4',
          300: '#fbd48c',
          400: '#f9c265',
          500: '#f7ae3e',
          600: '#e09020',
          700: '#b87015',
          800: '#8f520d',
          900: '#663808',
        },
        palm: {
          400: '#4caf65',
          500: '#2e9e48',
          600: '#1a8134',
        },
        coral: {
          400: '#ff7f6b',
          500: '#ff5a42',
          600: '#e63a22',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'wave-pattern': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 80'%3E%3Cpath fill='%23e0f7ff' fill-opacity='1' d='M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z'/%3E%3C/svg%3E\")",
      },
      animation: {
        'wave': 'wave 8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fadeIn': 'fadeIn 0.5s ease-out both',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-5%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
