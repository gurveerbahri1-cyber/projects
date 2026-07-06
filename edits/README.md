# HostGuard — Guest Rating Platform

A premium dark-themed dashboard for property hosts to review, rate, and manage guest experiences with detailed analytics.

## Features

- **Dashboard** — Overview of stats, pending guests, and recent reviews
- **Guest Directory** — Searchable/filterable table of all guests with status tracking
- **Review System** — Multi-step modal flow: select guest → rate across 6 categories → add notes & tags → confirm & submit
- **Analytics** — Radar chart (category averages), bar chart (rating distribution), timeline, and top-rated guests
- **Responsive** — Mobile-friendly with collapsible sidebar

## Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, glassmorphism, gradients, animations
- **Vanilla JavaScript** — No frameworks or dependencies
- **Google Fonts** — Inter typeface

## Getting Started

### Local Development

Simply open `index.html` in your browser, or use a local server:

```bash
npx serve .
```

Or use the dev script:

```bash
npm run dev
```

### Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel Dashboard](https://vercel.com/new)
3. Deploy — no build step needed, it's a static site

Or use the Vercel CLI:

```bash
npx vercel
```

## Project Structure

```
├── index.html          # Main HTML — app structure & layout
├── style.css           # Design system — all styles & responsive
├── app.js              # Application logic — rendering, interactions, modals
├── vercel.json         # Vercel deployment configuration
├── package.json        # Project metadata
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## License

MIT
