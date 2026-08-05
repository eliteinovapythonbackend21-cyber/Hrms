/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Gold — primary brand color (dark-first theme), sourced from the
        // logo's wrap-around ribbon.
        primary: {
          50: "#fdf8e7",
          100: "#f9ecc2",
          200: "#f3d98a",
          300: "#ecc356",
          400: "#e2a938",
          500: "#d4941f",
          600: "#b47417",
          700: "#925a16",
          800: "#784a18",
          900: "#653e19",
        },
        // Teal — secondary accent, sourced from the globe-mark logo.
        accent: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
    },
  },
  plugins: [],
};
