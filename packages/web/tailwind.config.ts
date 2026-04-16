import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2044',
          50: '#E8EDF5',
          100: '#C5CEEA',
          200: '#9AABD8',
          300: '#6E87C5',
          400: '#4969B3',
          500: '#2A519D',
          600: '#1A3A7A',
          700: '#0F2044',
          800: '#0A1633',
          900: '#050B1A',
        },
        brand: {
          DEFAULT: '#E05C2A',
          light: '#F4875B',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,32,68,0.08), 0 8px 24px rgba(15,32,68,0.06)',
        'card-hover': '0 4px 12px rgba(15,32,68,0.12), 0 16px 40px rgba(15,32,68,0.10)',
        pin: '0 2px 8px rgba(15,32,68,0.5)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
