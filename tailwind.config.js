/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#050505", // Deep Black
                card: "#121212",       // Dark Gray Card
                primary: {
                    DEFAULT: "#00E676",  // ZapBet Green
                    foreground: "#000000",
                },
                secondary: {
                    DEFAULT: "#27272a",
                    foreground: "#ffffff",
                },
                muted: {
                    DEFAULT: "#27272a",
                    foreground: "#a1a1a1",
                },
                accent: {
                    DEFAULT: "#27272a",
                    foreground: "#00E676",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#ffffff",
                },
                border: "#27272a",
                input: "#27272a",
                ring: "#00E676",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                lg: "0.5rem",
                md: "calc(0.5rem - 2px)",
                sm: "calc(0.5rem - 4px)",
            },
        },
    },
    plugins: [],
}
