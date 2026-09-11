/**
 * Standalone production server for Expo static builds with API Proxy.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https"); // Dış API'lere bağlanmak için eklendi

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  // ── PROXY CORS AYARLARI (APK'NIN BAĞLANABİLMESİ İÇİN ŞART) ──
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── 1. OPENROUTER AI PROXY ENDPOINT'İ ──
  if (pathname === "/api/chat" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const parsedData = JSON.parse(body);

        // Replit Secrets'taki tam ismiyle anahtarı sunucudan güvenle okuyoruz
        const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY; 

        if (!apiKey) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Server API Key bulunamadi!" }));
        }

        const openRouterReq = https.request({
          hostname: "openrouter.ai",
          path: "/api/v1/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://orbit-mesh.replit.app",
            "X-Title": "ORBIT-MESH"
          }
        }, (apiRes) => {
          res.writeHead(apiRes.statusCode, { "Content-Type": "application/json" });
          apiRes.pipe(res);
        });

        openRouterReq.on("error", (e) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "AI proxy sunucu hatası", details: e.message }));
        });

        // Yapay zekaya jüriye özel tasarladığımız sistem promptunu da burada enjekte ediyoruz:
        const systemPrompt = {
          role: "system",
          content: "Sen ORBIT-MESH'in yapay zeka asistanısın. Türkçe yanıt ver. Astronomi, uzay bilimi, Deneyap Kart, BLE ağları, VLF sinyalleri, jeomanyetik fırtınalar ve güvenlik ağları konularında bilgili ve yardımcısın. ORBIT-MESH, öğrenci tabanlı bir astronomi gözlem ve iletişim ağı platformudur. Cevaplarını kısa, açık ve bilimsel tut."
        };

        const finalPayload = JSON.stringify({
          model: "google/gemini-2.0-flash", // Hızlı ve ücretsiz havuz desteği için ideal
          messages: [systemPrompt, ...(parsedData.messages || [])]
        });

        openRouterReq.write(finalPayload);
        openRouterReq.end();
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Gecersiz JSON verisi" }));
      }
    });
    return;
  }

  // ── 2. NASA DONKI API PROXY ENDPOINT'İ ──
  if (pathname === "/api/nasa" && req.method === "GET") {
    const start = url.searchParams.get("startDate") || "";
    const end = url.searchParams.get("endDate") || "";

    // Replit Secrets'a EXPO_PUBLIC_NASA_API_KEY adıyla NASA keyini eklemeyi unutma!
    const apiKey = process.env.EXPO_PUBLIC_NASA_API_KEY || "DEMO_KEY";

    const nasaApiUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${apiKey}`;

    https.get(nasaApiUrl, (apiRes) => {
      res.writeHead(apiRes.statusCode, { "Content-Type": "application/json" });
      apiRes.pipe(res);
    }).on("error", (e) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "NASA proxy sunucu hatası", details: e.message }));
    });
    return;
  }

  // ── STANDART EXPO STATIK DOSYA SERVISI ──
  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }
    if (pathname === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build with secure Proxies on port ${port}`);
});