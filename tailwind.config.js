/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // 'class' (et pas 'media') pour piloter le thème manuellement via colorScheme.set()
  // — l'app est dark-first (cf. lib/theme-store.ts).
  darkMode: "class",
  theme: {
    extend: {
      // Design system Sport Motiv — voir constants/colors.ts et .claude/DA.md
      colors: {
        ink: { DEFAULT: "#15100C", 2: "#1B140E" },
        surface: { DEFAULT: "#231A12", 2: "#2D2218" },
        line: { DEFAULT: "rgba(255,238,221,0.08)", 2: "rgba(255,238,221,0.13)" },
        coral: { DEFAULT: "#FF6A45", soft: "rgba(255,106,69,0.15)" },
        amber: { DEFAULT: "#FFB23E", soft: "rgba(255,178,62,0.15)" },
        mint: { DEFAULT: "#5FE0A8", soft: "rgba(95,224,168,0.14)" },
        red: { DEFAULT: "#F2554A", soft: "rgba(242,85,74,0.14)" },
        cream: { DEFAULT: "#FBEEDD", dim: "#B7A18B" },
        // Texte/icône posés sur un aplat coloré
        "on-coral": "#23120A",
        "on-mint": "#0C2C20",
        "on-amber": "#3A2406",
        "on-avatar": "#1A1006",

        // ⚠️ Legacy (template Expo) — à retirer une fois les écrans migrés vers la DA.
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        // Display — Bricolage Grotesque
        display: ["BricolageGrotesque_800ExtraBold"],
        "display-bold": ["BricolageGrotesque_700Bold"],
        "display-semibold": ["BricolageGrotesque_600SemiBold"],
        "display-medium": ["BricolageGrotesque_500Medium"],
        "display-regular": ["BricolageGrotesque_400Regular"],
        // Body — Plus Jakarta Sans
        body: ["PlusJakartaSans_400Regular"],
        "body-medium": ["PlusJakartaSans_500Medium"],
        "body-semibold": ["PlusJakartaSans_600SemiBold"],
        "body-bold": ["PlusJakartaSans_700Bold"],
        "body-extrabold": ["PlusJakartaSans_800ExtraBold"],
      },
      borderRadius: {
        // Rayons spécifiques DA (en plus des défauts Tailwind)
        chip: "13px",
        input: "14px",
        card: "18px",
        hero: "24px",
        sheet: "36px",
      },
      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.02em",
        tight: "-0.01em",
        label: "0.05em", // .flabel
        eyebrow: "0.13em", // pills / eyebrows
      },
    },
  },
  plugins: [],
};
