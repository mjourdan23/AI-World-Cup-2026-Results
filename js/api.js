const WorldCupAPI = (() => {
    const COMPETITION_ID = 2000; // FIFA World Cup on football-data.org
    const CACHE_KEY = 'wc2026_cache';
    const CACHE_TTL = 120_000; // 2 minutes

    // Flag emoji map for all 48 World Cup 2026 teams
    const FLAGS = {
        'Qatar': '\u{1F1F6}\u{1F1E6}', 'Ecuador': '\u{1F1EA}\u{1F1E8}', 'Senegal': '\u{1F1F8}\u{1F1F3}',
        'Netherlands': '\u{1F1F3}\u{1F1F1}', 'England': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
        'Iran': '\u{1F1EE}\u{1F1F7}', 'USA': '\u{1F1FA}\u{1F1F8}', 'United States': '\u{1F1FA}\u{1F1F8}',
        'Wales': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
        'Argentina': '\u{1F1E6}\u{1F1F7}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
        'Mexico': '\u{1F1F2}\u{1F1FD}', 'Poland': '\u{1F1F5}\u{1F1F1}',
        'France': '\u{1F1EB}\u{1F1F7}', 'Australia': '\u{1F1E6}\u{1F1FA}',
        'Denmark': '\u{1F1E9}\u{1F1F0}', 'Tunisia': '\u{1F1F9}\u{1F1F3}',
        'Spain': '\u{1F1EA}\u{1F1F8}', 'Costa Rica': '\u{1F1E8}\u{1F1F7}',
        'Germany': '\u{1F1E9}\u{1F1EA}', 'Japan': '\u{1F1EF}\u{1F1F5}',
        'Belgium': '\u{1F1E7}\u{1F1EA}', 'Canada': '\u{1F1E8}\u{1F1E6}',
        'Morocco': '\u{1F1F2}\u{1F1E6}', 'Croatia': '\u{1F1ED}\u{1F1F7}',
        'Brazil': '\u{1F1E7}\u{1F1F7}', 'Serbia': '\u{1F1F7}\u{1F1F8}',
        'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Cameroon': '\u{1F1E8}\u{1F1F2}',
        'Portugal': '\u{1F1F5}\u{1F1F9}', 'Ghana': '\u{1F1EC}\u{1F1ED}',
        'Uruguay': '\u{1F1FA}\u{1F1FE}', 'Korea Republic': '\u{1F1F0}\u{1F1F7}',
        'South Korea': '\u{1F1F0}\u{1F1F7}',
        'Italy': '\u{1F1EE}\u{1F1F9}', 'Colombia': '\u{1F1E8}\u{1F1F4}',
        'Nigeria': '\u{1F1F3}\u{1F1EC}', 'Paraguay': '\u{1F1F5}\u{1F1FE}',
        'Chile': '\u{1F1E8}\u{1F1F1}', 'Peru': '\u{1F1F5}\u{1F1EA}',
        'Egypt': '\u{1F1EA}\u{1F1EC}', 'Algeria': '\u{1F1E9}\u{1F1FF}',
        'Turkey': '\u{1F1F9}\u{1F1F7}', 'Uzbekistan': '\u{1F1FA}\u{1F1FF}',
        'Bolivia': '\u{1F1E7}\u{1F1F4}', 'Indonesia': '\u{1F1EE}\u{1F1E9}',
        'Ukraine': '\u{1F1FA}\u{1F1E6}', 'Panama': '\u{1F1F5}\u{1F1E6}',
        'Slovenia': '\u{1F1F8}\u{1F1EE}', 'Albania': '\u{1F1E6}\u{1F1F1}',
        'Honduras': '\u{1F1ED}\u{1F1F3}', 'Jamaica': '\u{1F1EF}\u{1F1F2}',
        'Scotland': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
        'Austria': '\u{1F1E6}\u{1F1F9}', 'Ireland': '\u{1F1EE}\u{1F1EA}',
        'Republic of Ireland': '\u{1F1EE}\u{1F1EA}',
        'Bahrain': '\u{1F1E7}\u{1F1ED}', 'Trinidad and Tobago': '\u{1F1F9}\u{1F1F9}',
        'Ivory Coast': '\u{1F1E8}\u{1F1EE}', "Côte d'Ivoire": '\u{1F1E8}\u{1F1EE}',
        'New Zealand': '\u{1F1F3}\u{1F1FF}', 'DR Congo': '\u{1F1E8}\u{1F1E9}',
        'Venezuela': '\u{1F1FB}\u{1F1EA}', 'Dem. Rep. Congo': '\u{1F1E8}\u{1F1E9}',
        'Congo DR': '\u{1F1E8}\u{1F1E9}', 'Mali': '\u{1F1F2}\u{1F1F1}',
        'Burkina Faso': '\u{1F1E7}\u{1F1EB}', 'Tanzania': '\u{1F1F9}\u{1F1FF}',
        'Uganda': '\u{1F1FA}\u{1F1EC}', 'Kenya': '\u{1F1F0}\u{1F1EA}',
        'Zambia': '\u{1F1FF}\u{1F1F2}', 'Zimbabwe': '\u{1F1FF}\u{1F1FC}',
        'Mozambique': '\u{1F1F2}\u{1F1FF}',
    };

    function getFlag(teamName) {
        if (!teamName) return '⚽';
        for (const [key, flag] of Object.entries(FLAGS)) {
            if (teamName.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(teamName.toLowerCase())) {
                return flag;
            }
        }
        return '\u{1F3F3}\u{FE0F}';
    }

    function getCachedData() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const cached = JSON.parse(raw);
            if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
        } catch { /* ignore */ }
        return null;
    }

    function setCachedData(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch { /* ignore */ }
    }

    // Fetch from the pre-cached data files (updated by GitHub Actions)
    async function fetchCachedJSON(filename) {
        const cacheBuster = `?t=${Math.floor(Date.now() / 60000)}`;
        const resp = await fetch(`data/${filename}${cacheBuster}`);
        if (!resp.ok) return null;
        return resp.json();
    }

    // Primary: Use GitHub Actions cached data
    async function fetchFromCache() {
        const [matches, standings] = await Promise.all([
            fetchCachedJSON('matches.json'),
            fetchCachedJSON('standings.json')
        ]);

        if (!matches && !standings) return null;

        return {
            matches: matches?.matches || [],
            standings: standings?.standings || [],
            source: 'cached',
            lastUpdated: matches?.lastUpdated || standings?.lastUpdated || new Date().toISOString()
        };
    }

    // Fallback: Fetch from football-data.org (requires API token)
    async function fetchFromFootballData(apiToken) {
        if (!apiToken) return null;

        const headers = { 'X-Auth-Token': apiToken };
        const base = 'https://api.football-data.org/v4';

        try {
            const [matchesResp, standingsResp] = await Promise.all([
                fetch(`${base}/competitions/${COMPETITION_ID}/matches`, { headers }),
                fetch(`${base}/competitions/${COMPETITION_ID}/standings`, { headers })
            ]);

            const matchesData = matchesResp.ok ? await matchesResp.json() : null;
            const standingsData = standingsResp.ok ? await standingsResp.json() : null;

            return {
                matches: matchesData?.matches || [],
                standings: standingsData?.standings || [],
                source: 'football-data.org',
                lastUpdated: new Date().toISOString()
            };
        } catch {
            return null;
        }
    }

    // Normalize match data from football-data.org format
    function normalizeMatch(m) {
        const homeTeam = m.homeTeam?.name || m.homeTeam?.shortName || m.home_team || 'TBD';
        const awayTeam = m.awayTeam?.name || m.awayTeam?.shortName || m.away_team || 'TBD';
        const homeCode = m.homeTeam?.tla || m.home_code || homeTeam.substring(0, 3).toUpperCase();
        const awayCode = m.awayTeam?.tla || m.away_code || awayTeam.substring(0, 3).toUpperCase();

        let status = 'SCHEDULED';
        if (m.status === 'FINISHED' || m.status === 'finished') status = 'FINISHED';
        else if (m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME' ||
                 m.status === 'in_play' || m.status === 'live') status = 'LIVE';
        else if (m.status === 'TIMED' || m.status === 'SCHEDULED' || m.status === 'scheduled') status = 'SCHEDULED';

        return {
            id: m.id,
            utcDate: m.utcDate || m.date || m.datetime,
            status,
            matchday: m.matchday || m.group_matchday,
            stage: m.stage || m.round || 'GROUP_STAGE',
            group: m.group || m.group_name || null,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeCode,
            awayCode,
            homeFlag: getFlag(homeTeam),
            awayFlag: getFlag(awayTeam),
            homeScore: m.score?.fullTime?.home ?? m.home_score ?? null,
            awayScore: m.score?.fullTime?.away ?? m.away_score ?? null,
            venue: m.venue || m.stadium || '',
            minute: m.minute || null,
        };
    }

    // Normalize standings data
    function normalizeStandings(standings) {
        if (!standings || !standings.length) return [];

        return standings.map(group => {
            const table = (group.table || group.teams || []).map(entry => ({
                position: entry.position || entry.rank,
                team: entry.team?.name || entry.team || entry.name,
                code: entry.team?.tla || entry.code || '',
                flag: getFlag(entry.team?.name || entry.team || entry.name || ''),
                played: entry.playedGames || entry.played || 0,
                won: entry.won || 0,
                draw: entry.draw || entry.drawn || 0,
                lost: entry.lost || 0,
                goalsFor: entry.goalsFor || entry.goals_for || 0,
                goalsAgainst: entry.goalsAgainst || entry.goals_against || 0,
                goalDifference: entry.goalDifference || entry.goal_difference || 0,
                points: entry.points || 0,
            }));

            return {
                group: group.group || group.name || group.group_name,
                table: table.sort((a, b) => a.position - b.position)
            };
        });
    }

    async function fetchAll() {
        const cached = getCachedData();
        if (cached) return cached;

        // Try GitHub Actions cached data first
        let data = await fetchFromCache();

        // Fallback to API
        if (!data) {
            const token = localStorage.getItem('football_data_token');
            data = await fetchFromFootballData(token);
        }

        if (data) {
            data.matches = data.matches.map(normalizeMatch);
            data.standings = normalizeStandings(data.standings);
            setCachedData(data);
        }

        return data;
    }

    return { fetchAll, getFlag, normalizeMatch, normalizeStandings };
})();
