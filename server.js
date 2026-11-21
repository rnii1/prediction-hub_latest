/* =========================================================
   Prediction Hub local server (no dependencies)
   ---------------------------------------------------------
   - Serves the website on http://localhost:8080
   - Proxies /api/... to football-data.org, adding your key
     server-side so it never reaches the browser.
   - Caches API responses for 10 minutes (free plan: 10 req/min).

   Run:  node server.js
   Key:  put FOOTBALL_DATA_KEY=yourkey in a .env file next to this one
========================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const UPSTREAM = "https://api.football-data.org/v4";
const CACHE_MS = 10 * 60 * 1000;

try { process.loadEnvFile(path.join(ROOT, ".env")); } catch { /* no .env file */ }
const KEY = process.env.FOOTBALL_DATA_KEY;

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

// Only these API paths are forwarded
const ALLOWED_API = /^\/competitions\/(PL|PD|SA|BL1|FL1|DED|PPL|ELC|BSA)\/matches$/;
const cache = new Map();

function send(res, status, body, type = "application/json; charset=utf-8") {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
}

async function handleApi(url, res) {
    if (!KEY) {
        return send(res, 503, JSON.stringify({ error: "No FOOTBALL_DATA_KEY in .env" }));
    }

    const apiPath = url.pathname.slice("/api".length);
    if (!ALLOWED_API.test(apiPath)) {
        return send(res, 404, JSON.stringify({ error: "Unknown API path" }));
    }

    const target = UPSTREAM + apiPath + url.search;
    const hit = cache.get(target);
    if (hit && Date.now() - hit.at < CACHE_MS) {
        return send(res, 200, hit.body);
    }

    try {
        const upstream = await fetch(target, { headers: { "X-Auth-Token": KEY } });
        const body = await upstream.text();
        if (upstream.ok) cache.set(target, { at: Date.now(), body });
        console.log(`[api] ${upstream.status} ${apiPath}`);
        send(res, upstream.status, body);
    } catch (err) {
        send(res, 502, JSON.stringify({ error: `Could not reach football-data.org: ${err.message}` }));
    }
}

function handleStatic(url, res) {
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";

    const file = path.normalize(path.join(ROOT, rel));
    const inside = file.startsWith(ROOT + path.sep);
    const hidden = path.relative(ROOT, file).split(path.sep).some(part => part.startsWith("."));
    const type = TYPES[path.extname(file).toLowerCase()];

    const privateFiles = ["server.js", "package.json", "package-lock.json"];
    if (!inside || hidden || !type || privateFiles.includes(path.basename(file))) {
        return send(res, 404, "Not found", "text/plain");
    }

    fs.readFile(file, (err, data) => {
        if (err) return send(res, 404, "Not found", "text/plain");
        send(res, 200, data, type);
    });
}

http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method !== "GET") return send(res, 405, "Method not allowed", "text/plain");
    if (url.pathname === "/healthz") return send(res, 200, "ok", "text/plain");
    if (url.pathname.startsWith("/api/")) return handleApi(url, res);
    handleStatic(url, res);
}).listen(PORT, () => {
    console.log(`Prediction Hub running at http://localhost:${PORT}`);
    console.log(KEY ? "Live data: on (football-data.org)" : "Live data: off (add FOOTBALL_DATA_KEY to .env)");
});
