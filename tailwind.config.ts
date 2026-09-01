import type { Config } from "tailwindcss";

// Design tokens for the GEO Health instrument panel.
// Palette: deep ink base, elevated panel surfaces, and three signal colors
// standing in for "clear signal / partial signal / noise" — the read the
// whole product is built around (see components/ui/ScoreGauge.tsx).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1417",
          panel: "#171E23",
          surface: "#1E262C",
          raised: "#242E35",
          line: "#2C363D",
        },
        signal: {
          cyan: "#5EEAD4",
          cyanDim: "#2DD4BF",
          amber: "#F5A524",
          coral: "#F2545B",
        },
        text: {
          high: "#E8EDEF",
          mid: "#AEB9BE",
          low: "#728088",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 1px 1px, rgba(232,237,239,0.06) 1px, transparent 0)",
      },
      backgroundSize: {
        grid: "16px 16px",
      },
    },
  },
  plugins: [],
};
export default config;
