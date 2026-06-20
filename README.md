# FIFA World Cup 2026 - Live Results Tracker

A live, auto-updating website that tracks FIFA World Cup 2026 results, standings, and schedules.

**Live Site:** [https://mjourdan23.github.io/AI-World-Cup-2026-Results/](https://mjourdan23.github.io/AI-World-Cup-2026-Results/)

## Features

- **Live Scores** - Real-time match scores during games
- **Group Standings** - All 12 groups with full table statistics
- **Match Results** - Complete results history with filters
- **Schedule** - Upcoming match schedule
- **Knockout Bracket** - Knockout stage bracket visualization
- **Auto-Refresh** - Updates every 1-2 minutes automatically

## Data Sources

Data is fetched from multiple authoritative sources:

1. **[football-data.org](https://www.football-data.org/)** - Primary source (free API)
2. **ESPN API** - Fallback source

## Setup

### Enable GitHub Pages

1. Go to **Settings > Pages** in this repository
2. Set **Source** to "Deploy from a branch"
3. Select **main** branch and **/ (root)** folder
4. Click Save

### Add API Key (Recommended)

For the most reliable data:

1. Get a free API key from [football-data.org](https://www.football-data.org/client/register)
2. Go to **Settings > Secrets and variables > Actions**
3. Add a new secret: `FOOTBALL_DATA_TOKEN` with your API key
4. The GitHub Action will use this to fetch data every 30 minutes

### Manual Data Update

You can trigger a data update manually:

1. Go to **Actions** tab
2. Select "Update World Cup Data"
3. Click "Run workflow"

## Architecture

```
index.html          - Main website
css/styles.css      - Styling (dark theme, responsive)
js/api.js           - Data fetching & normalization layer
js/app.js           - UI rendering & interactivity
scripts/fetch-data.py - GitHub Actions data fetcher
data/matches.json   - Cached match data (auto-updated)
data/standings.json - Cached standings data (auto-updated)
```

## Built With

- Pure HTML, CSS, JavaScript (no frameworks)
- GitHub Actions for automated data pipeline
- GitHub Pages for hosting

---
*Built with AI*
