/* =========================================================
   Live data from football-data.org (via server.js)
   ---------------------------------------------------------
   One request per league: the season's full match list.
   From the finished matches we compute each team's
   home / away goals and last-5 form; scheduled matches in
   the next few days become the fixtures to predict.
========================================================= */

const LiveData = (() => {

    const CACHE_KEY = "predictionHub.live.v3";

    const cfg = () => Object.assign({
        LIVE: true,
        LEAGUES: [
            { code: "PL",  name: "Premier League" },
            { code: "PD",  name: "La Liga" },
            { code: "SA",  name: "Serie A" },
            { code: "BL1", name: "Bundesliga" },
            { code: "FL1", name: "Ligue 1" }
        ],
        DAYS_AHEAD: 7,
        CACHE_MINUTES: 30
    }, window.PH_CONFIG || {});

    // Live data needs server.js (a page opened as a file can't use the API)
    function isEnabled() {
        return cfg().LIVE !== false && location.protocol.startsWith("http");
    }

    async function getMatches(code) {
        let res;
        try {
            res = await fetch(`api/competitions/${code}/matches`);
        } catch {
            throw new Error("server not reachable — is `node server.js` running?");
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
        return json.matches || [];
    }

    const teamName = t => t.shortName || t.name;

    function buildLeague(league, matches, daysAhead) {

        const teams = new Map();
        const ensure = t => {
            const name = teamName(t);
            if (!teams.has(name)) {
                teams.set(name, {
                    name, logo: t.crest, results: [],
                    home: { p: 0, gf: 0, ga: 0 },
                    away: { p: 0, gf: 0, ga: 0 }
                });
            }
            return teams.get(name);
        };

        const finished = matches
            .filter(m => m.status === "FINISHED" && m.score?.fullTime?.home != null)
            .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

        for (const m of finished) {
            const h = ensure(m.homeTeam), a = ensure(m.awayTeam);
            const gh = m.score.fullTime.home, ga = m.score.fullTime.away;
            h.home.p++; h.home.gf += gh; h.home.ga += ga;
            a.away.p++; a.away.gf += ga; a.away.ga += gh;
            h.results.push(gh > ga ? "W" : gh === ga ? "D" : "L");
            a.results.push(ga > gh ? "W" : gh === ga ? "D" : "L");
        }

        const now = Date.now();
        const until = now + daysAhead * 864e5;
        const fixtures = matches
            .filter(m => ["SCHEDULED", "TIMED"].includes(m.status) && m.homeTeam?.name && m.awayTeam?.name)
            .filter(m => { const t = new Date(m.utcDate).getTime(); return t >= now && t <= until; })
            .map(m => {
                ensure(m.homeTeam); ensure(m.awayTeam);
                return { league, home: teamName(m.homeTeam), away: teamName(m.awayTeam), kickoff: m.utcDate };
            });

        const teamList = [...teams.values()].map(({ results, ...t }) => ({
            ...t,
            form: results.slice(-5).join(""),
            record: {
                w: results.filter(r => r === "W").length,
                d: results.filter(r => r === "D").length,
                l: results.filter(r => r === "L").length
            }
        }));
        return { teams: teamList, fixtures };
    }

    function readCache() {
        try {
            const data = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (!data) return null;
            return (Date.now() - data.fetchedAt) / 6e4 < cfg().CACHE_MINUTES ? data : null;
        } catch {
            return null;
        }
    }

    function writeCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
    }

    async function load(forceRefresh = false) {

        if (!forceRefresh) {
            const cached = readCache();
            if (cached) return cached;
        }

        const { LEAGUES, DAYS_AHEAD } = cfg();
        const leagues = {};
        const fixtures = [];
        const failures = [];

        await Promise.all(LEAGUES.map(async ({ code, name }) => {
            try {
                const built = buildLeague(name, await getMatches(code), DAYS_AHEAD);
                if (!built.teams.length) return;
                leagues[name] = built.teams;
                fixtures.push(...built.fixtures);
            } catch (err) {
                failures.push(`${name}: ${err.message}`);
            }
        }));

        if (!Object.keys(leagues).length) {
            throw new Error(failures[0]?.replace(/^[^:]+: /, "") || "no league data returned");
        }

        // Keep the league order from the config
        const ordered = {};
        for (const { name } of LEAGUES) if (leagues[name]) ordered[name] = leagues[name];

        const data = { source: "live", leagues: ordered, fixtures, failures, fetchedAt: Date.now() };
        writeCache(data);
        return data;
    }

    return { isEnabled, load };

})();

window.LiveData = LiveData;
