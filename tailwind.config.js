/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#090D16',
          900: '#0F172A',
          800: '#161F33',
          700: '#1E293B',
          600: '#334155',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
          800: '#312E81',
          900: '#1E1B4B',
          950: '#0F0E2A',
        },
        coral: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
        },
        neon: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          700: '#047857',
        },
      },
      fontFamily: {
        display: ['"Questrial"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        sans: ['"Questrial"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 14px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.04)',
        float: '0 16px 40px -8px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
