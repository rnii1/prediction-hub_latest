/* =========================================================
   App state & wiring
========================================================= */

const state = {
    dataset: null,       // { source, leagues: { name: [teams] }, fixtures: [...] }
    predictions: [],
    selectedLeague: "All",
    searchText: "",
    sort: "kickoff",
    statsLeague: null
};

function buildPredictions(dataset) {

    const out = [];

    for (const [league, teams] of Object.entries(dataset.leagues)) {

        const avg = Model.leagueAverages(teams);
        const byName = new Map(teams.map(t => [t.name, t]));

        for (const f of dataset.fixtures.filter(f => f.league === league)) {
            const home = byName.get(f.home);
            const away = byName.get(f.away);
            if (!home || !away) continue; // no stats for one side

            out.push({
                league,
                kickoff: f.kickoff,
                homeTeam: home,
                awayTeam: away,
                ...Model.predict(home, away, avg)
            });
        }
    }

    return out;
}

function visiblePredictions() {

    let list = state.predictions;

    if (state.selectedLeague !== "All") {
        list = list.filter(m => m.league === state.selectedLeague);
    }

    if (state.searchText) {
        const q = state.searchText;
        list = list.filter(m =>
            m.homeTeam.name.toLowerCase().includes(q) ||
            m.awayTeam.name.toLowerCase().includes(q) ||
            m.league.toLowerCase().includes(q)
        );
    }

    const sorters = {
        kickoff: (a, b) => new Date(a.kickoff) - new Date(b.kickoff),
        confidence: (a, b) => b.confidence - a.confidence,
        goals: (a, b) => (b.xgH + b.xgA) - (a.xgH + a.xgA)
    };

    return [...list].sort(sorters[state.sort]);
}

function updateMatches() {
    const list = visiblePredictions();
    renderMatches(list);

    // Top pick follows the current league filter
    const pool = state.selectedLeague === "All"
        ? state.predictions
        : state.predictions.filter(m => m.league === state.selectedLeague);
    const top = pool.reduce((best, m) => (!best || m.confidence > best.confidence ? m : best), null);
    renderTopPick(top);
}

function updateStats() {
    renderStats(state.statsLeague, state.dataset.leagues[state.statsLeague]);
}

function loadDataset(dataset) {

    state.dataset = dataset;
    state.predictions = buildPredictions(dataset);

    const leagues = Object.keys(dataset.leagues);
    if (state.selectedLeague !== "All" && !leagues.includes(state.selectedLeague)) {
        state.selectedLeague = "All";
    }
    if (!leagues.includes(state.statsLeague)) state.statsLeague = leagues[0];

    renderFilters(leagues, state.selectedLeague);

    const statsSelect = document.getElementById("statsLeague");
    statsSelect.innerHTML = leagues.map(l => `<option ${l === state.statsLeague ? "selected" : ""}>${esc(l)}</option>`).join("");

    document.getElementById("matchCount").textContent =
        `${state.predictions.length} match${state.predictions.length === 1 ? "" : "es"}`;

    updateMatches();
    updateStats();
}

/* ---------- Event listeners ---------- */

document.getElementById("filters").addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    state.selectedLeague = btn.dataset.league;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b === btn));
    updateMatches();

    // Keep the statistics table on the same league as the filter
    if (state.dataset.leagues[state.selectedLeague]) {
        state.statsLeague = state.selectedLeague;
        document.getElementById("statsLeague").value = state.statsLeague;
        updateStats();
    }
});

document.getElementById("searchInput").addEventListener("input", e => {
    state.searchText = e.target.value.trim().toLowerCase();
    updateMatches();
});

document.getElementById("sortSelect").addEventListener("change", e => {
    state.sort = e.target.value;
    updateMatches();
});

document.getElementById("statsLeague").addEventListener("change", e => {
    state.statsLeague = e.target.value;
    updateStats();
});

document.getElementById("heroBtn").addEventListener("click", () => {
    document.getElementById("predictions").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("refreshBtn").addEventListener("click", () => init(true));

/* ---------- Start ---------- */

async function init(forceRefresh = false) {

    // Show sample data instantly, then try live data on top
    if (!state.dataset) {
        loadDataset({ source: "sample", leagues: SAMPLE_TEAMS, fixtures: SAMPLE_FIXTURES });
    }

    if (!LiveData.isEnabled()) {
        renderSource("sample", "Sample data · run `node server.js` and open http://localhost:8080 for live fixtures");
        return;
    }

    renderSource("loading", "Loading live data…");

    try {
        const live = await LiveData.load(forceRefresh);
        if (!live.fixtures.length) {
            renderSource("sample", "No upcoming live fixtures found · showing sample data");
            return;
        }
        loadDataset(live);
        const when = new Date(live.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const partial = live.failures?.length ? ` · ${live.failures.length} league(s) failed` : "";
        renderSource("live", `Live data · football-data.org · updated ${when}${partial}`);
    } catch (err) {
        console.error(err);
        renderSource("error", `Live data unavailable (${err.message}) · showing sample data`);
    }
}

init();
