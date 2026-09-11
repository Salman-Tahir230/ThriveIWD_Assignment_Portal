/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Teal-green theme, picked from a "teal green" steer rather than
        // exact hex values — treat these as a starting point. Every
        // component below references thrive-* tokens, never raw hex, so
        // adjusting the actual shades here is the only file that needs
        // to change if these aren't quite right.
        thrive: {
          ink: '#0B3D3A',       // deep teal — headers, primary text
          accent: '#2FA88E',    // bright teal-green — CTAs, active states
          sage: '#6FA88A',      // softer green — graded/success states
          sand: '#F4F7F5',      // cool off-white — page background
          line: '#DCE6E1',      // hairline borders on sand background
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
