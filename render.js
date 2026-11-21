/* =========================================================
   Rendering helpers
========================================================= */

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function pct(p) {
    return Math.round(p * 100) + "%";
}

function formatKickoff(iso) {
    const d = new Date(iso);
    return d.toLocaleString([], {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit"
    });
}

function teamBadge(team) {
    if (team.logo) {
        return `<img class="team-logo" src="${esc(team.logo)}" alt="" loading="lazy">`;
    }
    return `<span class="team-dot" style="background:${esc(team.color || "#888")}"></span>`;
}

function formBadges(form) {
    return [...(form || "")].slice(-5)
        .map(r => `<span class="form-badge form-${esc(r)}">${esc(r)}</span>`)
        .join("");
}

function renderMatches(predictions) {

    const container = document.getElementById("matches");

    if (!predictions.length) {
        container.innerHTML = `<p class="empty">No matches found. Try another league or search.</p>`;
        return;
    }

    container.innerHTML = predictions.map(m => {
        const top = m.score;
        return `
        <article class="card border-${m.class}">

            <div class="card-head">
                <span class="league">${esc(m.league)}</span>
                <span class="kickoff">${esc(formatKickoff(m.kickoff))}</span>
            </div>

            <div class="match">
                <div class="team home">${teamBadge(m.homeTeam)}<span>${esc(m.homeTeam.name)}</span></div>
                <div class="score-pred">
                    <span class="score">${top.h} – ${top.a}</span>
                    <small title="Most likely exact score for the predicted result">likely score · ${pct(top.p)}</small>
                </div>
                <div class="team away"><span>${esc(m.awayTeam.name)}</span>${teamBadge(m.awayTeam)}</div>
            </div>

            <div class="prob-bar" role="img"
                 aria-label="Home ${pct(m.pHome)}, draw ${pct(m.pDraw)}, away ${pct(m.pAway)}">
                <div class="seg home" style="width:${m.pHome * 100}%"></div>
                <div class="seg draw" style="width:${m.pDraw * 100}%"></div>
                <div class="seg away" style="width:${m.pAway * 100}%"></div>
            </div>
            <div class="prob-labels">
                <span>Home ${pct(m.pHome)}</span>
                <span>Draw ${pct(m.pDraw)}</span>
                <span>Away ${pct(m.pAway)}</span>
            </div>

            <div class="prediction ${m.class}">
                ${esc(m.prediction)}
                <span class="conf">${m.confidence}% confidence</span>
            </div>
            ${m.safer ? `<div class="safer">Safer pick: <strong>${esc(m.safer.label)}</strong> · ${pct(m.safer.p)}</div>` : ""}

            <div class="markets">
                <div><span>xG</span><strong>${m.xgH.toFixed(2)} – ${m.xgA.toFixed(2)}</strong></div>
                <div><span>Over 2.5</span><strong>${pct(m.over25)}</strong></div>
                <div><span>BTTS</span><strong>${pct(m.btts)}</strong></div>
                <div><span>Rating</span><strong>${m.rating}/10</strong></div>
            </div>

            <details>
                <summary>Key factors &amp; scorelines</summary>
                <ul>${m.reasons.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
                <p class="note">Most likely exact scores overall:</p>
                <div class="scorelines">
                    ${m.topScores.map(s => `<span class="chip">${s.h}–${s.a} <em>${pct(s.p)}</em></span>`).join("")}
                </div>
                <div class="form-row">
                    <span>${esc(m.homeTeam.name)}</span>${formBadges(m.homeTeam.form)}
                </div>
                <div class="form-row">
                    <span>${esc(m.awayTeam.name)}</span>${formBadges(m.awayTeam.form)}
                </div>
            </details>

        </article>`;
    }).join("");
}

function renderTopPick(pick) {

    const el = document.getElementById("topPick");

    if (!pick) {
        el.innerHTML = "";
        el.hidden = true;
        return;
    }

    el.hidden = false;
    const top = pick.score;
    el.innerHTML = `
        <div class="top-pick-label">⭐ Top Pick</div>
        <h3>${esc(pick.homeTeam.name)} vs ${esc(pick.awayTeam.name)}</h3>
        <p class="top-pick-meta">${esc(pick.league)} · ${esc(formatKickoff(pick.kickoff))}</p>
        <div class="top-pick-stats">
            <div><span>Prediction</span><strong class="${pick.class}">${esc(pick.prediction)}</strong></div>
            <div><span>Confidence</span><strong>${pick.confidence}%</strong></div>
            <div><span>Likely score</span><strong>${top.h} – ${top.a}</strong></div>
            <div><span>Rating</span><strong>${pick.rating}/10</strong></div>
        </div>
    `;
}

function renderFilters(leagues, selected) {
    const el = document.getElementById("filters");
    el.innerHTML = ["All", ...leagues].map(l => `
        <button class="filter-btn ${l === selected ? "active" : ""}" data-league="${esc(l)}">${esc(l)}</button>
    `).join("");
}

function renderStats(leagueName, teams) {

    const el = document.getElementById("statsTable");

    if (!teams || !teams.length) {
        el.innerHTML = `<p class="empty">No team data for this league.</p>`;
        return;
    }

    const avg = Model.leagueAverages(teams);
    const rows = teams.map(t => {
        const { att, def } = Model.strength(t, avg);
        const played = t.home.p + t.away.p;
        const gf = t.home.gf + t.away.gf;
        const gd = gf - (t.home.ga + t.away.ga);
        // W/D/L come from the full record when available (live data), else estimated from form
        const rec = t.record || { w: 0, d: 0, l: 0 };
        return { t, att, def, played, gd, gf, ...rec, pts: rec.w * 3 + rec.d };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.t.name.localeCompare(b.t.name));

    const hasRecord = teams.every(t => t.record);

    el.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th><th>Team</th><th>P</th>
                    ${hasRecord ? "<th>W</th><th>D</th><th>L</th>" : ""}
                    <th>GD</th>
                    ${hasRecord ? "<th>Pts</th>" : ""}
                    <th title="Goals per game at home (for–against)">Home</th>
                    <th title="Goals per game away (for–against)">Away</th>
                    <th title="Attack strength vs league average (1.00 = average, higher is better)">Att</th>
                    <th title="Defence: goals conceded vs league average (1.00 = average, lower is better)">Def</th>
                    <th title="Last 5 results, most recent on the right">Form</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(({ t, att, def, played, gd, w, d, l, pts }, i) => `
                    <tr>
                        <td class="pos">${i + 1}</td>
                        <td class="team-cell">${teamBadge(t)}${esc(t.name)}</td>
                        <td>${played}</td>
                        ${hasRecord ? `<td>${w}</td><td>${d}</td><td>${l}</td>` : ""}
                        <td>${gd > 0 ? "+" : ""}${gd}</td>
                        ${hasRecord ? `<td class="pts">${pts}</td>` : ""}
                        <td>${(t.home.gf / (t.home.p || 1)).toFixed(1)}–${(t.home.ga / (t.home.p || 1)).toFixed(1)}</td>
                        <td>${(t.away.gf / (t.away.p || 1)).toFixed(1)}–${(t.away.ga / (t.away.p || 1)).toFixed(1)}</td>
                        <td class="${att >= 1.1 ? "green" : att <= 0.9 ? "red" : ""}">${att.toFixed(2)}</td>
                        <td class="${def <= 0.9 ? "green" : def >= 1.1 ? "red" : ""}">${def.toFixed(2)}</td>
                        <td class="form-cell">${formBadges(t.form)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderSource(source, message) {
    const el = document.getElementById("dataSource");
    el.className = `pill data-source ${source}`;
    el.textContent = message;
}
