/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
          './app/**/*.{js,ts,jsx,tsx,mdx}',
          './lib/**/*.{js,ts,jsx,tsx}',
          './components/**/*.{js,ts,jsx,tsx,mdx}',
        ],
    theme: {
          extend: {
                  fontFamily: {
                            jost: ['var(--font-jost)', 'sans-serif'],
                            oswald: ['var(--font-oswald)', 'sans-serif'],
                            dancing: ['var(--font-dancing)', 'cursive'],
                  },
                  colors: {
                            foodu: {
                                        red: '#eb0029',
                                        orange: '#f76e2a',
                                        cream: '#faf1df',
                                        dark: '#04000b',
                            },
                  },
          },
    },
    plugins: [],
}
