/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentineledge: {
          // Core theme
          dark: '#0A1929',
          darker: '#050B14',
          blue: '#00E5FF',
          
          // Threat levels
          safe: '#00FF88',
          warning: '#FFB020',
          danger: '#FF3D3D',
          critical: '#FF0055',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 229, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 229, 255, 0.5)',
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-red': '0 0 20px rgba(255, 61, 61, 0.3)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

