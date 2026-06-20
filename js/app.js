(() => {
    let allData = null;
    let refreshInterval = null;

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function formatTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function isToday(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }

    function isYesterday(dateStr) {
        const d = new Date(dateStr);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
    }

    function stageLabel(stage) {
        const labels = {
            'GROUP_STAGE': 'Group Stage',
            'ROUND_OF_32': 'Round of 32',
            'LAST_32': 'Round of 32',
            'ROUND_OF_16': 'Round of 16',
            'LAST_16': 'Round of 16',
            'QUARTER_FINALS': 'Quarter-Finals',
            'QUARTER_FINAL': 'Quarter-Finals',
            'SEMI_FINALS': 'Semi-Finals',
            'SEMI_FINAL': 'Semi-Finals',
            'THIRD_PLACE': 'Third Place',
            'FINAL': 'Final',
        };
        return labels[stage] || stage?.replace(/_/g, ' ') || '';
    }

    function groupLabel(group) {
        if (!group) return '';
        return group
            .replace('FIFA World Cup, ', '')
            .replace('GROUP_', 'Group ')
            .replace('Group_', 'Group ');
    }

    function renderMatchCard(match) {
        const isLive = match.status === 'LIVE';
        const isFinished = match.status === 'FINISHED';
        const statusClass = isLive ? 'live' : isFinished ? 'finished' : 'scheduled';
        const statusText = isLive ? (match.minute ? `${match.minute}'` : 'LIVE') :
                          isFinished ? 'FT' : formatTime(match.utcDate);

        const scoreHtml = (isFinished || isLive)
            ? `<span>${match.homeScore ?? 0}</span><span class="separator">-</span><span>${match.awayScore ?? 0}</span>`
            : `<span>${formatTime(match.utcDate)}</span>`;

        return `
            <div class="match-card ${isLive ? 'live' : ''}">
                <div class="match-header">
                    <span class="match-stage">${match.group ? groupLabel(match.group) : stageLabel(match.stage)}</span>
                    <span class="match-status ${statusClass}">${statusText}</span>
                </div>
                <div class="match-teams">
                    <div class="team">
                        <span class="team-flag">${match.homeFlag}</span>
                        <span class="team-name">${match.homeTeam}</span>
                        <span class="team-code">${match.homeCode}</span>
                    </div>
                    <div class="match-score ${isFinished || isLive ? '' : 'pending'}">
                        ${scoreHtml}
                    </div>
                    <div class="team">
                        <span class="team-flag">${match.awayFlag}</span>
                        <span class="team-name">${match.awayTeam}</span>
                        <span class="team-code">${match.awayCode}</span>
                    </div>
                </div>
                ${match.venue ? `
                <div class="match-footer">
                    <span class="match-venue">${match.venue}</span>
                    <span>${formatDate(match.utcDate)}</span>
                </div>` : ''}
            </div>
        `;
    }

    function renderMatchListItem(match) {
        const isLive = match.status === 'LIVE';
        const isFinished = match.status === 'FINISHED';
        const statusText = isLive ? (match.minute ? `${match.minute}'` : 'LIVE') :
                          isFinished ? 'FT' : formatTime(match.utcDate);

        const scoreDisplay = (isFinished || isLive)
            ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
            : 'vs';

        return `
            <div class="match-list-item">
                <div class="team-home">${match.homeFlag} ${match.homeTeam}</div>
                <div class="score">${scoreDisplay}</div>
                <div class="team-away">${match.awayTeam} ${match.awayFlag}</div>
                <div class="meta">
                    <div>${statusText}</div>
                    <div>${match.group ? groupLabel(match.group) : stageLabel(match.stage)}</div>
                </div>
            </div>
        `;
    }

    function renderTodayMatches(matches) {
        const container = document.getElementById('todayMatches');
        const today = matches.filter(m => isToday(m.utcDate));

        if (!today.length) {
            container.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">📅</div>
                    <p>No matches scheduled for today.</p>
                    <p style="margin-top:8px;font-size:0.85rem;">Check the Schedule tab for upcoming matches.</p>
                </div>`;
            return;
        }

        const live = today.filter(m => m.status === 'LIVE');
        const others = today.filter(m => m.status !== 'LIVE');
        container.innerHTML = [...live, ...others].map(renderMatchCard).join('');
    }

    function renderResults(matches) {
        const container = document.getElementById('resultsList');
        const finished = matches
            .filter(m => m.status === 'FINISHED')
            .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));

        if (!finished.length) {
            container.innerHTML = '<div class="no-data"><div class="no-data-icon">⏳</div><p>No results yet.</p></div>';
            return;
        }

        const grouped = {};
        finished.forEach(m => {
            const dateKey = formatDate(m.utcDate);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(m);
        });

        let html = '';
        for (const [date, games] of Object.entries(grouped)) {
            html += `<div class="date-header">${date}</div>`;
            html += games.map(renderMatchListItem).join('');
        }
        container.innerHTML = html;
    }

    function renderStandings(standings) {
        const container = document.getElementById('standingsGrid');
        if (!standings || !standings.length) {
            container.innerHTML = '<div class="no-data"><div class="no-data-icon">📊</div><p>Standings data not yet available.</p></div>';
            return;
        }

        container.innerHTML = standings.map(group => `
            <div class="group-card">
                <div class="group-header">${groupLabel(group.group)}</div>
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GF</th>
                            <th>GA</th>
                            <th>GD</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.table.map((row, i) => {
                            const qualClass = i < 2 ? 'qualified' : i === 2 ? 'playoff' : '';
                            const gdClass = row.goalDifference > 0 ? 'gd-positive' :
                                           row.goalDifference < 0 ? 'gd-negative' : '';
                            return `
                            <tr class="${qualClass}">
                                <td>${row.position}</td>
                                <td>${row.flag} ${row.team}</td>
                                <td>${row.played}</td>
                                <td>${row.won}</td>
                                <td>${row.draw}</td>
                                <td>${row.lost}</td>
                                <td>${row.goalsFor}</td>
                                <td>${row.goalsAgainst}</td>
                                <td class="${gdClass}">${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
                                <td class="pts">${row.points}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `).join('');
    }

    function renderSchedule(matches) {
        const container = document.getElementById('scheduleList');
        const upcoming = matches
            .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
            .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

        if (!upcoming.length) {
            container.innerHTML = '<div class="no-data"><div class="no-data-icon">✅</div><p>No more scheduled matches — the tournament may be complete!</p></div>';
            return;
        }

        const grouped = {};
        upcoming.forEach(m => {
            const dateKey = formatDate(m.utcDate);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(m);
        });

        let html = '';
        for (const [date, games] of Object.entries(grouped)) {
            html += `<div class="date-header">${date}</div>`;
            html += games.map(renderMatchListItem).join('');
        }
        container.innerHTML = html;
    }

    function renderKnockout(matches) {
        const container = document.getElementById('knockoutBracket');
        const placeholder = document.getElementById('knockoutPlaceholder');

        const knockoutStages = ['ROUND_OF_32', 'LAST_32', 'ROUND_OF_16', 'LAST_16',
                                'QUARTER_FINALS', 'QUARTER_FINAL', 'SEMI_FINALS',
                                'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'];
        const knockoutMatches = matches.filter(m => knockoutStages.includes(m.stage));

        if (!knockoutMatches.length) {
            if (placeholder) placeholder.style.display = 'block';
            return;
        }
        if (placeholder) placeholder.style.display = 'none';

        const stageOrder = ['ROUND_OF_32', 'LAST_32', 'ROUND_OF_16', 'LAST_16',
                           'QUARTER_FINALS', 'QUARTER_FINAL', 'SEMI_FINALS',
                           'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'];

        const byStage = {};
        knockoutMatches.forEach(m => {
            const key = m.stage;
            if (!byStage[key]) byStage[key] = [];
            byStage[key].push(m);
        });

        let html = '';
        for (const stage of stageOrder) {
            if (!byStage[stage]) continue;
            const games = byStage[stage].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

            html += `
                <div class="bracket-round">
                    <div class="bracket-round-title">${stageLabel(stage)}</div>
                    <div class="bracket-matches">
                        ${games.map(m => {
                            const isFinished = m.status === 'FINISHED';
                            const homeWin = isFinished && (m.homeScore ?? 0) > (m.awayScore ?? 0);
                            const awayWin = isFinished && (m.awayScore ?? 0) > (m.homeScore ?? 0);

                            return `
                            <div class="bracket-match">
                                <div class="bracket-team ${homeWin ? 'winner' : ''}">
                                    <span>${m.homeFlag} ${m.homeTeam}</span>
                                    <span class="bracket-team-score">${isFinished || m.status === 'LIVE' ? (m.homeScore ?? 0) : ''}</span>
                                </div>
                                <div class="bracket-team ${awayWin ? 'winner' : ''}">
                                    <span>${m.awayFlag} ${m.awayTeam}</span>
                                    <span class="bracket-team-score">${isFinished || m.status === 'LIVE' ? (m.awayScore ?? 0) : ''}</span>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        }
        container.innerHTML = html;
    }

    function updateStatus(data) {
        const indicator = document.getElementById('liveIndicator');
        const statusText = document.getElementById('statusText');
        const lastUpdate = document.getElementById('lastUpdate');
        const pulse = indicator.querySelector('.pulse');

        const hasLive = data?.matches?.some(m => m.status === 'LIVE');

        if (hasLive) {
            pulse.classList.add('live');
            statusText.textContent = 'LIVE matches in progress';
        } else {
            pulse.classList.remove('live');
            statusText.textContent = `Data from ${data?.source || 'cache'}`;
        }

        if (data?.lastUpdated) {
            const d = new Date(data.lastUpdated);
            lastUpdate.textContent = d.toLocaleString();
        }
    }

    async function loadData() {
        try {
            const data = await WorldCupAPI.fetchAll();
            if (!data) {
                showError('Unable to fetch World Cup data. The data will appear once the GitHub Action populates it.');
                return;
            }

            allData = data;
            renderTodayMatches(data.matches);
            renderResults(data.matches);
            renderStandings(data.standings);
            renderSchedule(data.matches);
            renderKnockout(data.matches);
            updateStatus(data);
            setupAutoRefresh(data);
        } catch (err) {
            console.error('Failed to load data:', err);
            showError('Failed to load match data. Will retry shortly...');
        }
    }

    function showError(msg) {
        const container = document.getElementById('todayMatches');
        container.innerHTML = `<div class="error-message">${msg}</div>`;
    }

    function setupAutoRefresh(data) {
        if (refreshInterval) clearInterval(refreshInterval);

        const hasLive = data?.matches?.some(m => m.status === 'LIVE');
        const interval = hasLive ? 60_000 : 120_000; // 1 min if live, 2 min otherwise

        refreshInterval = setInterval(async () => {
            localStorage.removeItem('wc2026_cache');
            await loadData();
        }, interval);
    }

    // Filter handler
    document.getElementById('resultFilter')?.addEventListener('change', (e) => {
        if (!allData) return;
        const filter = e.target.value;
        let filtered = allData.matches.filter(m => m.status === 'FINISHED');

        if (filter === 'today') filtered = filtered.filter(m => isToday(m.utcDate));
        else if (filter === 'yesterday') filtered = filtered.filter(m => isYesterday(m.utcDate));
        else if (filter === 'group') filtered = filtered.filter(m => m.stage === 'GROUP_STAGE');
        else if (filter === 'knockout') filtered = filtered.filter(m => m.stage !== 'GROUP_STAGE');

        const container = document.getElementById('resultsList');
        if (!filtered.length) {
            container.innerHTML = '<div class="no-data"><p>No matches found for this filter.</p></div>';
            return;
        }

        filtered.sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
        const grouped = {};
        filtered.forEach(m => {
            const dateKey = formatDate(m.utcDate);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(m);
        });

        let html = '';
        for (const [date, games] of Object.entries(grouped)) {
            html += `<div class="date-header">${date}</div>`;
            html += games.map(renderMatchListItem).join('');
        }
        container.innerHTML = html;
    });

    loadData();
})();
