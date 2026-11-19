import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marca: { DEFAULT: "#3ba30e", btn: "#2c840b", oscuro: "#1f5a07", suave: "#eef7e9" },
        tinta: "#1b211d",
        texto: "#4b544e",
        tenue: "#626a65",
        linea: "#e2e6e3",
        fondo: "#f6f7f6",
        oscuro: "#161c18",
      },
      fontFamily: {
        sans: ["var(--fuente)", "system-ui", "sans-serif"],
        titulo: ["var(--fuente-titulo)", "var(--fuente)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
