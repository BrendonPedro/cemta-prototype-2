import { transform } from "next/dist/build/swc"
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js, jsx, ts,tsx}',
    './components/**/*.{js, jsx, ts,tsx}',
    './app/**/*.{js, jsx, ts,tsx}',
    './src/**/*.{js, jsx, ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        customTeal: '#008080', //'#00BFBF' Adjust accordingly 
        customTeal2: '#00BFBF', //'#00BFBF' Adjust accordingly 
        customBlack: '#000000', //'#333333' Adjust accordingly
        customBlack2: '#333333', //'#333333' Adjust accordingly
                customTealDark: '#2c7a7b',
        customTealLight: '#81e6d9',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        backgroundImage: {
          gradient: "url('/static/background.png')",
        },
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        purple: {
          951: 'rgba(79, 70, 229, 1)',
        },
        gray: {
          950: 'hsla(0, 0%, 100%, 0.6);',
          951: 'hsla(0, 0%, 100%, 0.4);',
          952: '#373b64',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shine": {
          '0%': { transform: 'translateX(-100%) rotate(10deg)' },
          '100%': { transform: 'translateX(100%) rotate(10deg)' }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'spin-slow': 'spin 8s linear infinite',
        'ping-slow': 'ping 10s linear',
        'shine': 'shine 10s infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config


export default config

// import type { Config } from 'tailwindcss';

// const config: Config = {
//   content: [
//     './pages/**/*.{js,ts,jsx,tsx,mdx}',
//     './components/**/*.{js,ts,jsx,tsx,mdx}',
//     './app/**/*.{js,ts,jsx,tsx,mdx}',
//   ],
//   theme: {
//     extend: {
//       backgroundImage: {
//         gradient: "url('/static/background.png')",
//       },
//       colors: {
//         purple: {
//           951: 'rgba(79, 70, 229, 1)',
//         },
//         gray: {
//           950: 'hsla(0, 0%, 100%, 0.6);',
//           951: 'hsla(0, 0%, 100%, 0.4);',
//           952: '#373b64',
//         },
//       },
//     },
//   },
//   plugins: [],
// };
// export default config;