"""
Fetch World Cup 2026 data from multiple authoritative sources and save as JSON.
Runs via GitHub Actions on a schedule.

Data sources (in priority order):
1. football-data.org API (free tier, 10 req/min)
2. ESPN public API endpoints
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

COMPETITION_ID = 2000  # FIFA World Cup on football-data.org
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# World Cup 2026 date range
WC_START = "20260611"
WC_END = "20260720"


def fetch_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    req.add_header("User-Agent", "WorldCup2026Tracker/1.0")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
        print(f"  Failed to fetch {url}: {e}", file=sys.stderr)
        return None


def fetch_football_data(api_token):
    """Fetch from football-data.org v4 API."""
    if not api_token:
        print("No FOOTBALL_DATA_TOKEN set, skipping football-data.org")
        return None, None

    base = "https://api.football-data.org/v4"
    headers = {"X-Auth-Token": api_token}

    print("Fetching matches from football-data.org...")
    matches = fetch_json(f"{base}/competitions/{COMPETITION_ID}/matches", headers)

    print("Fetching standings from football-data.org...")
    standings = fetch_json(f"{base}/competitions/{COMPETITION_ID}/standings", headers)

    return matches, standings


def fetch_espn():
    """Fetch from ESPN's public API endpoints for FIFA World Cup."""
    print("Fetching from ESPN API...")

    # Fetch matches in chunks (ESPN limits to 100 per request)
    all_events = []
    base_url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"

    # Fetch the full date range
    data = fetch_json(f"{base_url}?dates={WC_START}-{WC_END}&limit=100")
    if data and "events" in data:
        all_events.extend(data["events"])

    # Also fetch a second page if there are more matches
    if len(all_events) == 100:
        # Fetch remaining dates starting from where we left off
        last_date = all_events[-1].get("date", "")[:10].replace("-", "")
        data2 = fetch_json(f"{base_url}?dates={last_date}-{WC_END}&limit=100")
        if data2 and "events" in data2:
            existing_ids = {e["id"] for e in all_events}
            for e in data2["events"]:
                if e["id"] not in existing_ids:
                    all_events.append(e)

    print(f"  Fetched {len(all_events)} match events")

    # Fetch standings
    standings_data = fetch_json(
        "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings"
    )

    matches = []
    for event in all_events:
        match = parse_espn_event(event)
        if match:
            matches.append(match)

    standings = []
    if standings_data and "children" in standings_data:
        for group in standings_data["children"]:
            parsed = parse_espn_standings(group)
            if parsed:
                standings.append(parsed)

    return matches, standings


def parse_espn_event(event):
    """Parse a single ESPN event into our match format."""
    try:
        competition = event.get("competitions", [{}])[0]
        competitors = competition.get("competitors", [])
        if len(competitors) < 2:
            return None

        home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
        away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

        status_name = event.get("status", {}).get("type", {}).get("name", "")
        status_state = event.get("status", {}).get("type", {}).get("state", "")

        if status_state == "post" or "FULL_TIME" in status_name or "FINAL" in status_name:
            status = "FINISHED"
        elif status_state == "in" or "IN_PROGRESS" in status_name or "HALFTIME" in status_name:
            status = "IN_PLAY"
        else:
            status = "SCHEDULED"

        venue_data = competition.get("venue", {})
        if not venue_data:
            venue_data = event.get("venue", {})
        venue = venue_data.get("fullName", "")
        city = venue_data.get("address", {}).get("city", "")
        if city and venue:
            venue = f"{venue}, {city}"

        # Determine stage/group from notes or competition format
        stage = "GROUP_STAGE"
        group = None
        notes = competition.get("notes", [])
        alt_note = competition.get("altGameNote", "")

        if alt_note:
            note_lower = alt_note.lower()
            if "round of 32" in note_lower:
                stage = "ROUND_OF_32"
            elif "round of 16" in note_lower:
                stage = "ROUND_OF_16"
            elif "quarterfinal" in note_lower or "quarter-final" in note_lower:
                stage = "QUARTER_FINALS"
            elif "semifinal" in note_lower or "semi-final" in note_lower:
                stage = "SEMI_FINALS"
            elif "third" in note_lower:
                stage = "THIRD_PLACE"
            elif "final" in note_lower and "semi" not in note_lower and "quarter" not in note_lower:
                stage = "FINAL"
            elif "group" in note_lower:
                stage = "GROUP_STAGE"
                group = alt_note.strip()

        if not group and notes:
            for n in notes:
                headline = n.get("headline", "")
                if "Group" in headline:
                    group = headline.strip()
                    break

        # Extract minute for live matches
        minute = None
        if status == "IN_PLAY":
            clock = event.get("status", {}).get("displayClock", "")
            if clock:
                minute = clock.replace("'", "")

        return {
            "id": event.get("id"),
            "utcDate": event.get("date"),
            "status": status,
            "matchday": None,
            "stage": stage,
            "group": group,
            "homeTeam": {
                "name": home.get("team", {}).get("displayName", "TBD"),
                "shortName": home.get("team", {}).get("shortDisplayName", ""),
                "tla": home.get("team", {}).get("abbreviation", ""),
            },
            "awayTeam": {
                "name": away.get("team", {}).get("displayName", "TBD"),
                "shortName": away.get("team", {}).get("shortDisplayName", ""),
                "tla": away.get("team", {}).get("abbreviation", ""),
            },
            "score": {
                "fullTime": {
                    "home": int(home.get("score", 0)) if status != "SCHEDULED" else None,
                    "away": int(away.get("score", 0)) if status != "SCHEDULED" else None,
                }
            },
            "venue": venue,
        }
    except (KeyError, ValueError, TypeError) as e:
        print(f"  Warning: Failed to parse event: {e}", file=sys.stderr)
        return None


def parse_espn_standings(group):
    """Parse ESPN standings group."""
    try:
        table = []
        for entry in group.get("standings", {}).get("entries", []):
            stats = {}
            for s in entry.get("stats", []):
                if "value" in s:
                    stats[s["name"]] = s["value"]

            table.append({
                "position": int(stats.get("rank", 0)),
                "team": {
                    "name": entry.get("team", {}).get("displayName", ""),
                    "tla": entry.get("team", {}).get("abbreviation", ""),
                },
                "playedGames": int(stats.get("gamesPlayed", 0)),
                "won": int(stats.get("wins", 0)),
                "draw": int(stats.get("ties", 0)),
                "lost": int(stats.get("losses", 0)),
                "goalsFor": int(stats.get("pointsFor", 0)),
                "goalsAgainst": int(stats.get("pointsAgainst", 0)),
                "goalDifference": int(stats.get("pointDifferential", 0)),
                "points": int(stats.get("points", 0)),
            })

        return {
            "group": group.get("name", ""),
            "table": sorted(table, key=lambda x: x["position"]),
        }
    except (KeyError, ValueError, TypeError) as e:
        print(f"  Warning: Failed to parse standings group: {e}", file=sys.stderr)
        return None


def save_json(filename, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved {path} ({os.path.getsize(path)} bytes)")


def main():
    now = datetime.now(timezone.utc).isoformat()
    token = os.environ.get("FOOTBALL_DATA_TOKEN", "")

    # Try football-data.org first
    fd_matches, fd_standings = fetch_football_data(token)

    # Try ESPN as fallback / additional source
    espn_matches, espn_standings = fetch_espn()

    # Use football-data.org as primary, ESPN as fallback
    if fd_matches and fd_matches.get("matches"):
        matches = fd_matches["matches"]
        match_source = "football-data.org"
    else:
        matches = espn_matches or []
        match_source = "espn"

    if fd_standings and fd_standings.get("standings"):
        standings = fd_standings["standings"]
        standings_source = "football-data.org"
    else:
        standings = espn_standings or []
        standings_source = "espn"

    if not matches and not standings:
        print("WARNING: No data fetched from any source!", file=sys.stderr)
        sys.exit(1)

    save_json("matches.json", {
        "matches": matches,
        "lastUpdated": now,
        "source": match_source,
    })

    save_json("standings.json", {
        "standings": standings,
        "lastUpdated": now,
        "source": standings_source,
    })

    print(f"\nData updated at {now}")
    print(f"  Matches: {len(matches)} (from {match_source})")
    print(f"  Standing groups: {len(standings)} (from {standings_source})")


if __name__ == "__main__":
    main()
