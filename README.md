# 🔥 Prediction Hub

A football prediction dashboard that turns team data into likely scorelines, win/draw/loss probabilities, and goals markets.

## 📌 About The Project

Prediction Hub is a sports analytics website that presents football match predictions in a simple, engaging way.
Every prediction is **calculated**, not typed in by hand: the model uses each team's home and away scoring record,
defensive record, and recent form.

## 🚀 Features

- ⚽ Match cards with the **most likely scoreline** and the top 3 exact scores
- 📈 Home / Draw / Away probability bar
- 🎯 Over 2.5 goals, Both Teams To Score, and expected goals (xG)
- 🟢🟡🔴 Confidence colours, model rating, and a "safer pick" (double chance) for close games
- 📊 Auto-generated key factors (form, home attack, away defence, goal profile)
- ⭐ Top pick of the day (follows the league filter)
- 🔎 Search, league filters, and sort by kick-off / confidence / goals
- 📋 Statistics table with attack & defence ratings and form for every team
- 🌐 **Live data** for the current season from football-data.org, with a tiny local server that keeps your key private
- 📱 Works on mobile

## 🧠 How the model works

1. **Strength ratings** — goals scored/conceded per game (home and away) divided by the league average.
   Small samples are shrunk towards average.
2. **Expected goals** — `home xG = league home avg × home attack × away defence`, and the reverse for the away side.
   Last-5 form shifts xG by up to ±12%.
3. **Poisson scoreline grid** — the probability of every score from 0–0 to 8–8, with a Dixon-Coles correction
   for low-scoring draws.
4. **Markets** — summing the grid gives 1X2, over/under 2.5, BTTS, and the most likely scores.

All of this lives in [`js/model.js`](js/model.js); the constants at the top (`FORM_WEIGHT`, `RHO`, `PRIOR_GAMES`) are easy to tune.

## ▶️ Running it

### With live data (recommended)

1. Get a free key at https://www.football-data.org/client/register
2. Create a `.env` file in the project folder containing:
   ```
   FOOTBALL_DATA_KEY=yourkey
   ```
3. Start the server (Node.js 20.12 or newer, no installs needed):
   ```bash
   node server.js
   ```
4. Open http://localhost:8080. The header shows **Live data · football-data.org** when it's working.

`server.js` serves the site and forwards API calls with your key added, so the key never reaches the browser.
Live mode covers the current season for the Premier League, La Liga, Serie A, Bundesliga and Ligue 1
(change leagues in `js/config.js`). It uses one request per league, cached for 10 minutes on the server
and 30 minutes in the browser, well inside the free limit of 10 requests a minute.
Home/away records and form are calculated from each league's finished matches.

`.env` is git-ignored, so the key isn't committed.

### Deploying to Render (shareable link)

The repo includes `render.yaml` and `package.json`, so Render can run it as-is:

1. Push the project to GitHub (never upload `.env`).
2. On https://dashboard.render.com choose **New → Blueprint**, pick the repo, and click **Apply**.
3. When asked, paste your football-data.org key as `FOOTBALL_DATA_KEY`.
4. Share the `https://<name>.onrender.com` link Render gives you.

On the free plan the site sleeps after ~15 minutes without visitors; the next visit takes ~30-60 seconds to wake it.

### Without a server

Opening `index.html` directly runs on the bundled **sample data** in `data/`
(illustrative stats, not real figures).

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (no frameworks, no build step)

## 📂 Project Structure

```
prediction-hub/
├── index.html
├── server.js             # local server + API proxy (node server.js)
├── .env                  # your FOOTBALL_DATA_KEY (git-ignored)
├── css/
│   └── style.css         # dark dashboard theme
├── data/
│   ├── teams.js          # sample team stats per league
│   └── matches.js        # sample fixtures (dated relative to today)
└── js/
    ├── config.example.js # optional settings (leagues, days ahead)
    ├── model.js          # Poisson / Dixon-Coles prediction model
    ├── api.js            # football-data.org loader + stats builder
    ├── render.js         # cards, top pick, stats table
    └── script.js         # state, filters, search, startup
```

## 🔮 Future Improvements

- Prediction accuracy tracking against final results
- Head-to-head history
- Player availability (injuries / suspensions)
- Fitting ratings with time-weighted results instead of season totals
- User accounts and saved picks

## ⚠️ Disclaimer

Predictions are statistical estimates, not guarantees, and not betting advice.

## 👨‍💻 Author

Built as a personal sports technology project.
