import colors from 'tailwindcss/colors';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/pages/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#121212', // rgb(18 18 18) — page background
        surface: '#292a2d', // rgb(41, 42, 45) - cards, inputs, dropdowns; hover bg on bare canvas
        'surface-hover': colors.neutral[800], // active/selected state, hover bg inside a surface, skeletons
        line: colors.neutral[700], // borders, dividers, section underlines
        'line-focus': colors.neutral[500], // focused input border
        ink: {
          DEFAULT: colors.neutral[100], // primary text, headings, active/hover-max text
          muted: colors.neutral[400], // secondary text, labels, inactive state
          faint: colors.neutral[500], // persistent icons, placeholders, "+" buttons
          subtle: colors.neutral[600], // hover-reveal icons (drag handle, edit/delete at rest)
        },
      },
    },
  },
  plugins: [],
};

export default config;
