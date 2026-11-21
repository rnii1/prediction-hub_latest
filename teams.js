/* =========================================================
   SAMPLE team stats (illustrative, not real current figures).
   Used when live data is off or unavailable.

   home / away: p = played, gf = goals for, ga = goals against
   form: last 5 results, oldest -> newest (W / D / L)
========================================================= */

const SAMPLE_TEAMS = {

    "Premier League": [
        { name: "Arsenal",           color: "#EF0107", form: "WWDWW", home: { p: 6, gf: 14, ga: 3 },  away: { p: 6, gf: 10, ga: 5 } },
        { name: "Chelsea",           color: "#034694", form: "LDWLD", home: { p: 6, gf: 11, ga: 6 },  away: { p: 6, gf: 7,  ga: 10 } },
        { name: "Liverpool",         color: "#C8102E", form: "WWLWW", home: { p: 6, gf: 15, ga: 5 },  away: { p: 6, gf: 11, ga: 8 } },
        { name: "Manchester City",   color: "#6CABDD", form: "WDWWL", home: { p: 6, gf: 16, ga: 4 },  away: { p: 6, gf: 9,  ga: 7 } },
        { name: "Tottenham",         color: "#132257", form: "DLWDL", home: { p: 6, gf: 10, ga: 8 },  away: { p: 6, gf: 8,  ga: 11 } },
        { name: "Newcastle",         color: "#241F20", form: "WDDWL", home: { p: 6, gf: 12, ga: 5 },  away: { p: 6, gf: 6,  ga: 8 } },
        { name: "Aston Villa",       color: "#95BFE5", form: "WLWDW", home: { p: 6, gf: 11, ga: 6 },  away: { p: 6, gf: 8,  ga: 9 } },
        { name: "Manchester United", color: "#DA291C", form: "LLDWL", home: { p: 6, gf: 8,  ga: 8 },  away: { p: 6, gf: 5,  ga: 11 } }
    ],

    "La Liga": [
        { name: "Real Madrid",     color: "#FEBE10", form: "WWWDW", home: { p: 6, gf: 15, ga: 4 }, away: { p: 6, gf: 11, ga: 6 } },
        { name: "Barcelona",       color: "#A50044", form: "WWLWW", home: { p: 6, gf: 17, ga: 6 }, away: { p: 6, gf: 12, ga: 8 } },
        { name: "Atletico Madrid", color: "#CB3524", form: "WDWWD", home: { p: 6, gf: 11, ga: 3 }, away: { p: 6, gf: 7,  ga: 5 } },
        { name: "Athletic Club",   color: "#EE2523", form: "DWLWD", home: { p: 6, gf: 9,  ga: 4 }, away: { p: 6, gf: 6,  ga: 7 } },
        { name: "Real Sociedad",   color: "#0067B1", form: "LDDWL", home: { p: 6, gf: 7,  ga: 6 }, away: { p: 6, gf: 5,  ga: 8 } },
        { name: "Villarreal",      color: "#FFE667", form: "WLWWD", home: { p: 6, gf: 12, ga: 7 }, away: { p: 6, gf: 8,  ga: 9 } },
        { name: "Sevilla",         color: "#D71920", form: "LLDLW", home: { p: 6, gf: 7,  ga: 8 }, away: { p: 6, gf: 4,  ga: 10 } },
        { name: "Real Betis",      color: "#0BB363", form: "DWDLW", home: { p: 6, gf: 9,  ga: 7 }, away: { p: 6, gf: 6,  ga: 8 } }
    ],

    "Serie A": [
        { name: "Inter",      color: "#0068A8", form: "WWDWW", home: { p: 6, gf: 14, ga: 4 }, away: { p: 6, gf: 9, ga: 5 } },
        { name: "Napoli",     color: "#12A0D7", form: "WDWWL", home: { p: 6, gf: 11, ga: 4 }, away: { p: 6, gf: 7, ga: 6 } },
        { name: "Juventus",   color: "#F5F5F5", form: "DDWDW", home: { p: 6, gf: 9,  ga: 3 }, away: { p: 6, gf: 6, ga: 5 } },
        { name: "AC Milan",   color: "#FB090B", form: "WLWDW", home: { p: 6, gf: 11, ga: 6 }, away: { p: 6, gf: 8, ga: 8 } },
        { name: "Atalanta",   color: "#1E71B8", form: "WWLWD", home: { p: 6, gf: 13, ga: 6 }, away: { p: 6, gf: 9, ga: 8 } },
        { name: "Roma",       color: "#8E1F2F", form: "LDWLD", home: { p: 6, gf: 9,  ga: 6 }, away: { p: 6, gf: 5, ga: 8 } }
    ],

    "Bundesliga": [
        { name: "Bayern Munich",       color: "#DC052D", form: "WWWWD", home: { p: 6, gf: 21, ga: 5 }, away: { p: 6, gf: 14, ga: 7 } },
        { name: "Bayer Leverkusen",    color: "#E32221", form: "WDWLW", home: { p: 6, gf: 14, ga: 6 }, away: { p: 6, gf: 10, ga: 8 } },
        { name: "Borussia Dortmund",   color: "#FDE100", form: "WLWWD", home: { p: 6, gf: 15, ga: 7 }, away: { p: 6, gf: 8,  ga: 10 } },
        { name: "RB Leipzig",          color: "#DD0741", form: "DWLDW", home: { p: 6, gf: 12, ga: 7 }, away: { p: 6, gf: 8,  ga: 9 } },
        { name: "VfB Stuttgart",       color: "#E32219", form: "LWDWL", home: { p: 6, gf: 12, ga: 8 }, away: { p: 6, gf: 7,  ga: 10 } },
        { name: "Eintracht Frankfurt", color: "#E1000F", form: "DLDWL", home: { p: 6, gf: 10, ga: 8 }, away: { p: 6, gf: 7,  ga: 12 } }
    ]
};
