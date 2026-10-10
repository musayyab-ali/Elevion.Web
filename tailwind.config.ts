import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  mode: 'jit',
  jit: true,
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
    container: {
      padding: {
        DEFAULT: '16px',
      },
    },
    colors: {
      transparent: 'transparent',
      'green': 'rgb(var(--c-green) / <alpha-value>)',
      'black': 'rgb(var(--c-black) / <alpha-value>)',
      'secondary': 'rgb(var(--c-secondary) / <alpha-value>)',
      'secondary2': 'rgb(var(--c-secondary2) / <alpha-value>)',
      'surface': 'rgb(var(--c-surface) / <alpha-value>)',
      'red': 'rgb(var(--c-red) / <alpha-value>)',
      'purple': 'rgb(var(--c-purple) / <alpha-value>)',
      'success': 'rgb(var(--c-success) / <alpha-value>)',
      'yellow': 'rgb(var(--c-yellow) / <alpha-value>)',
      'pink': 'rgb(var(--c-pink) / <alpha-value>)',
      'line': 'rgb(var(--c-line) / <alpha-value>)',
      'white': '#ffffff',
      'outline': 'rgba(0, 0, 0, 0.15)',
      'surface2': 'rgba(255, 255, 255, 0.2)',
      'surface1': 'rgba(255, 255, 255, 0.1)',
    },
  },
  plugins: [],
}
export default config
