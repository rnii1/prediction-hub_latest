/* =========================================================
   SAMPLE fixtures. Kick-offs are generated relative to today
   so the demo always shows upcoming games.
   [league, home, away, days from today, "HH:MM"]
========================================================= */

const SAMPLE_FIXTURES = [
    ["Premier League", "Arsenal",           "Chelsea",           0, "17:30"],
    ["Premier League", "Manchester City",   "Liverpool",         0, "20:00"],
    ["Premier League", "Newcastle",         "Tottenham",         1, "14:00"],
    ["Premier League", "Aston Villa",       "Manchester United", 1, "16:30"],
    ["La Liga",        "Real Madrid",       "Barcelona",         0, "21:00"],
    ["La Liga",        "Atletico Madrid",   "Sevilla",           1, "18:30"],
    ["La Liga",        "Athletic Club",     "Real Sociedad",     2, "20:00"],
    ["Serie A",        "Inter",             "Juventus",          1, "19:45"],
    ["Serie A",        "Napoli",            "AC Milan",          2, "20:45"],
    ["Bundesliga",     "Borussia Dortmund", "Bayern Munich",     0, "18:30"],
    ["Bundesliga",     "Bayer Leverkusen",  "RB Leipzig",        2, "15:30"]
].map(([league, home, away, days, time]) => {
    const [hh, mm] = time.split(":").map(Number);
    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + days);
    kickoff.setHours(hh, mm, 0, 0);
    return { league, home, away, kickoff: kickoff.toISOString() };
});
