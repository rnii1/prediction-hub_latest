/* =========================================================
   Prediction model
   ---------------------------------------------------------
   Poisson goal model with a Dixon-Coles low-score correction.

   1. Each team gets an attack and a defence rating relative to
      the league average, split by home / away.
   2. Expected goals for each side:
        homeXG = leagueHomeAvg * homeAttack * awayDefence
        awayXG = leagueAwayAvg * awayAttack * homeDefence
      nudged by recent form (last 5 results).
   3. Every scoreline 0-0 ... 8-8 gets a probability; summing the
      grid gives win/draw/loss, over/under 2.5, BTTS, and the most
      likely scorelines.
========================================================= */

const Model = (() => {

    const MAX_GOALS = 8;      // scoreline grid size
    const PRIOR_GAMES = 2;    // shrink small samples towards league average
    const VENUE_WEIGHT = 0.4; // 40% home-or-away record, 60% whole-season record
    const FORM_WEIGHT = 0.12; // max +/-12% xG swing from form
    const RHO = -0.05;        // Dixon-Coles correction (slightly more 0-0 / 1-1)

    function poisson(k, lambda) {
        let p = Math.exp(-lambda);
        for (let i = 1; i <= k; i++) p *= lambda / i;
        return p;
    }

    // Rating relative to league average, shrunk towards 1.0 when few games played
    function rating(goals, played, leagueAvg) {
        if (!played || !leagueAvg) return 1;
        const raw = (goals / played) / leagueAvg;
        return (raw * played + PRIOR_GAMES) / (played + PRIOR_GAMES);
    }

    function formPoints(form) {
        return [...(form || "")].slice(-5)
            .reduce((sum, r) => sum + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
    }

    function leagueAverages(teams) {
        let hg = 0, hp = 0, ag = 0, ap = 0;
        for (const t of teams) {
            hg += t.home.gf; hp += t.home.p;
            ag += t.away.gf; ap += t.away.p;
        }
        return {
            home: hp ? hg / hp : 1.5,
            away: ap ? ag / ap : 1.2
        };
    }

    function tau(h, a, lh, la) {
        if (h === 0 && a === 0) return 1 - lh * la * RHO;
        if (h === 0 && a === 1) return 1 + lh * RHO;
        if (h === 1 && a === 0) return 1 + la * RHO;
        if (h === 1 && a === 1) return 1 - RHO;
        return 1;
    }

    // Whole-season attack / defence vs league average (both venues combined)
    function strength(t, avg) {
        const all = (avg.home + avg.away) / 2;
        const p = t.home.p + t.away.p;
        return {
            att: rating(t.home.gf + t.away.gf, p, all),
            def: rating(t.home.ga + t.away.ga, p, all)
        };
    }

    // Blend the season-wide rating with the home-only or away-only one.
    // Venue-only records are small samples (half the games), so they get less weight.
    function blended(t, venue, avg) {
        const overall = strength(t, avg);
        const v = t[venue];
        const [forAvg, againstAvg] = venue === "home" ? [avg.home, avg.away] : [avg.away, avg.home];
        return {
            att: (1 - VENUE_WEIGHT) * overall.att + VENUE_WEIGHT * rating(v.gf, v.p, forAvg),
            def: (1 - VENUE_WEIGHT) * overall.def + VENUE_WEIGHT * rating(v.ga, v.p, againstAvg)
        };
    }

    function predict(home, away, avg) {

        const h = blended(home, "home", avg);
        const a = blended(away, "away", avg);
        const hAtt = h.att, hDef = h.def, aAtt = a.att, aDef = a.def;

        const formH = formPoints(home.form);
        const formA = formPoints(away.form);
        const formAdj = ((formH - formA) / 15) * FORM_WEIGHT;

        const xgH = avg.home * hAtt * aDef * (1 + formAdj);
        const xgA = avg.away * aAtt * hDef * (1 - formAdj);

        // Scoreline probability grid
        const grid = [];
        let total = 0;
        for (let h = 0; h <= MAX_GOALS; h++) {
            for (let a = 0; a <= MAX_GOALS; a++) {
                const p = poisson(h, xgH) * poisson(a, xgA) * tau(h, a, xgH, xgA);
                grid.push({ h, a, p });
                total += p;
            }
        }

        let pHome = 0, pDraw = 0, pAway = 0, over25 = 0, btts = 0;
        for (const cell of grid) {
            cell.p /= total;
            if (cell.h > cell.a) pHome += cell.p;
            else if (cell.h === cell.a) pDraw += cell.p;
            else pAway += cell.p;
            if (cell.h + cell.a >= 3) over25 += cell.p;
            if (cell.h > 0 && cell.a > 0) btts += cell.p;
        }

        const topScores = [...grid].sort((x, y) => y.p - x.p).slice(0, 3);

        const outcomes = [
            { key: "home", label: `${home.name} Win`, p: pHome },
            { key: "draw", label: "Draw", p: pDraw },
            { key: "away", label: `${away.name} Win`, p: pAway }
        ].sort((x, y) => y.p - x.p);

        const best = outcomes[0];
        const gap = best.p - outcomes[1].p;

        // Headline score: the most likely scoreline *within* the predicted result,
        // so a predicted home win never shows 1-1.
        const fits = {
            home: c => c.h > c.a,
            draw: c => c.h === c.a,
            away: c => c.h < c.a
        }[best.key];
        const score = grid.filter(fits).reduce((x, y) => (y.p > x.p ? y : x));

        // Safer double-chance pick when the main outcome is shaky
        let safer = null;
        if (best.p < 0.5) {
            if (best.key === "away" || (best.key === "draw" && pAway > pHome)) {
                safer = { label: `${away.name} or Draw (X2)`, p: pAway + pDraw };
            } else {
                safer = { label: `${home.name} or Draw (1X)`, p: pHome + pDraw };
            }
        }

        const confidence = Math.round(best.p * 100);
        const cls = best.p >= 0.55 ? "green" : best.p >= 0.42 ? "yellow" : "red";
        // 0.70 favourite with a big gap ~9/10, coin-flip games ~4/10
        const modelRating = Math.min(10, Math.max(1, (best.p * 0.6 + gap * 0.4) * 15));

        return {
            xgH, xgA,
            pHome, pDraw, pAway,
            over25, btts,
            topScores,
            score,
            prediction: best.label,
            outcome: best.key,
            safer,
            confidence,
            class: cls,
            rating: Math.round(modelRating * 10) / 10,
            reasons: buildReasons(home, away, { hAtt, hDef, aAtt, aDef, formH, formA, xgH, xgA, over25, btts })
        };
    }

    function perGame(goals, played) {
        return played ? (goals / played).toFixed(1) : "0.0";
    }

    function buildReasons(home, away, s) {
        const reasons = [];

        if (Math.abs(s.formH - s.formA) >= 4) {
            const [better, bp, wp] = s.formH > s.formA
                ? [home.name, s.formH, s.formA]
                : [away.name, s.formA, s.formH];
            reasons.push(`${better} in better form (${bp} pts vs ${wp} from last 5)`);
        } else {
            reasons.push(`Similar recent form (${s.formH} vs ${s.formA} pts from last 5)`);
        }

        if (s.hAtt >= 1.15) reasons.push(`${home.name} score ${perGame(home.home.gf, home.home.p)} goals per home game`);
        if (s.hDef <= 0.8) reasons.push(`${home.name} concede only ${perGame(home.home.ga, home.home.p)} per home game`);
        if (s.aAtt >= 1.2) reasons.push(`${away.name} dangerous on the road (${perGame(away.away.gf, away.away.p)} goals per away game)`);
        if (s.aDef >= 1.15) reasons.push(`${away.name} leak ${perGame(away.away.ga, away.away.p)} goals per away game`);
        if (s.aDef <= 0.8) reasons.push(`${away.name} solid away from home (${perGame(away.away.ga, away.away.p)} conceded per game)`);

        if (s.over25 >= 0.6) reasons.push(`High-scoring profile: ${Math.round(s.over25 * 100)}% chance of 3+ goals`);
        else if (s.over25 <= 0.4) reasons.push(`Tight game expected: ${Math.round((1 - s.over25) * 100)}% chance of under 2.5 goals`);

        if (reasons.length < 3) reasons.push(`Home advantage built into expected goals (${s.xgH.toFixed(2)} vs ${s.xgA.toFixed(2)})`);

        return reasons.slice(0, 4);
    }

    return { predict, leagueAverages, formPoints, rating, strength };

})();

window.Model = Model;
