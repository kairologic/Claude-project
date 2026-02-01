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
        // KairoLogic Brand Colors
        navy: {
          DEFAULT: '#0B1E3D',
          light: '#1A3A5F',
          dark: '#05101F',
        },
        gold: {
          DEFAULT: '#D4A574',
          light: '#E5C4A0',
          dark: '#B88F5F',
        },
        orange: {
          DEFAULT: '#FF6B35',
          light: '#FF8A5C',
          dark: '#E5531A',
        },
        green: {
          success: '#10B981',
          warning: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
