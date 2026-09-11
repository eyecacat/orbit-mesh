const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

let metroProcess = null;

const projectRoot = path.resolve(__dirname, "..");

function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error("Could not find workspace root (no pnpm-workspace.yaml found)");
}

const workspaceRoot = findWorkspaceRoot(projectRoot);
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

function exitWithError(message) {
  console.error(`[BUILD ERROR] ${message}`);
  if (metroProcess) {
    console.log("Terminating Metro bundler process...");
    metroProcess.kill();
  }
  process.exit(1);
}

function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log("Cleaning up Metro process...");
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

function stripProtocol(domain) {
  let urlString = domain.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  return new URL(urlString).host;
}

function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);
  }
  exitWithError(
    "No deployment domain found. Set REPLIT_INTERNAL_APP_DOMAIN, REPLIT_DEV_DOMAIN, or EXPO_PUBLIC_DOMAIN",
  );
}

function prepareDirectories(timestamp) {
  console.log("Preparing build directories...");

  const staticBuild = path.join(projectRoot, "static-build");
  if (fs.existsSync(staticBuild)) {
    fs.rmSync(staticBuild, { recursive: true, force: true });
  }

  const dirs = [
    path.join(staticBuild, timestamp, "_expo", "static", "js", "ios"),
    path.join(staticBuild, timestamp, "_expo", "static", "js", "android"),
    path.join(staticBuild, "ios"),
    path.join(staticBuild, "android"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Build Timestamp Created:", timestamp);
}

function clearMetroCache() {
  console.log("Clearing Metro cache...");
  const cacheDirs = [
    path.join(projectRoot, ".metro-cache"),
    path.join(projectRoot, "node_modules", ".cache", "metro"),
  ];

  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  console.log("Cache cleared successfully");
}

async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status", {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function getExpoPublicReplId() {
  return process.env.REPL_ID || process.env.EXPO_PUBLIC_REPL_ID;
}

async function startMetro(expoPublicDomain, expoPublicReplId) {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro bundler is already running on port 8081");
    return;
  }

  console.log("Starting Metro Bundler...");
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${expoPublicDomain}`);

  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
    EXPO_PUBLIC_REPL_ID: expoPublicReplId,
  };

  if (expoPublicReplId) {
    console.log(`Setting EXPO_PUBLIC_REPL_ID=${expoPublicReplId}`);
  }

  metroProcess = spawn(
    "pnpm",
    ["exec", "expo", "start", "--no-dev", "--minify", "--localhost"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      cwd: projectRoot,
      env,
    },
  );

  if (metroProcess.stdout) {
    metroProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[Metro] ${output}`);
    });
  }
  if (metroProcess.stderr) {
    metroProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.error(`[Metro Error] ${output}`);
    });
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log("Metro Bundler is ready and responding");
      return;
    }
  }

  exitWithError("Metro bundling server startup timed out after 60s.");
}

async function downloadFile(url, outputPath) {
  const controller = new AbortController();
  const fiveMinMS = 5 * 60 * 1000;
  const timeoutId = setTimeout(() => controller.abort(), fiveMinMS);

  try {
    console.log(`Downloading asset from: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const file = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(response.body), file);

    const fileSize = fs.statSync(outputPath).size;
    if (fileSize === 0) {
      fs.unlinkSync(outputPath);
      throw new Error("Downloaded target file artifact is empty");
    }
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    if (error.name === "AbortError") {
      throw new Error(`Download timed out after 5 minutes: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadManifest(platform) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    console.log(`Fetching updates manifest for ${platform}...`);
    const response = await fetch("http://localhost:8081/manifest", {
      headers: { "expo-platform": platform },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const manifest = await response.json();
    console.log(`${platform} manifest parsed`);
    return manifest;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Manifest collection timed out for platform: ${platform}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundlesAndManifests(timestamp) {
  console.log("Starting parallel download of production artifacts...");
  try {
    // 🚀 ADIM 1: Önce manifestoları çekiyoruz
    const [iosManifest, androidManifest] = await Promise.all([
      downloadManifest("ios"),
      downloadManifest("android"),
    ]);

    if (!iosManifest.launchAsset?.url || !androidManifest.launchAsset?.url) {
      throw new Error("Manifests do not contain valid launchAsset URLs. Metro might be misconfigured.");
    }

    // Metro bazen localhost yerine 127.0.0.1 dönebilir, normalize edelim
    const normalizeUrl = (rawUrl) => {
      const url = new URL(rawUrl);
      url.hostname = "localhost";
      url.port = "8081";
      return url.toString();
    };

    const iosBundleUrl = normalizeUrl(iosManifest.launchAsset.url);
    const androidBundleUrl = normalizeUrl(androidManifest.launchAsset.url);

    const iosOutput = path.join(projectRoot, "static-build", timestamp, "_expo", "static", "js", "ios", "bundle.js");
    const androidOutput = path.join(projectRoot, "static-build", timestamp, "_expo", "static", "js", "android", "bundle.js");

    // 🚀 ADIM 2: Doğrudan Metro'nun söylediği güvenli URL üzerinden bundle'ları indiriyoruz
    console.log("Fetching compiled ios standalone bundle via manifest URL...");
    await downloadFile(iosBundleUrl, iosOutput);

    console.log("Fetching compiled android standalone bundle via manifest URL...");
    await downloadFile(androidBundleUrl, androidOutput);

    console.log("All application bundles and manifests saved locally");
    return { ios: iosManifest, android: androidManifest };
  } catch (error) {
    exitWithError(`Artifact synchronization step failed: ${error.message}`);
  }
}

function extractAssets(timestamp) {
  const staticBuild = path.join(projectRoot, "static-build");
  const bundles = {
    ios: fs.readFileSync(path.join(staticBuild, timestamp, "_expo", "static", "js", "ios", "bundle.js"), "utf-8"),
    android: fs.readFileSync(path.join(staticBuild, timestamp, "_expo", "static", "js", "android", "bundle.js"), "utf-8"),
  };

  const assetsMap = new Map();
  const assetPattern = /httpServerLocation:"([^"]+)"[^}]*hash:"([^"]+)"[^}]*name:"([^"]+)"[^}]*type:"([^"]+)"/g;

  const extractFromBundle = (bundle, platform) => {
    for (const match of bundle.matchAll(assetPattern)) {
      const originalPath = match[1];
      const filename = match[3] + "." + match[4];

      const tempUrl = new URL(`http://localhost:8081${originalPath}`);
      const unstablePath = tempUrl.searchParams.get("unstable_path");

      if (!unstablePath) {
        throw new Error(`Asset extraction failure, missing unstable_path identifier: ${originalPath}`);
      }

      const decodedPath = decodeURIComponent(unstablePath);
      const key = path.posix.join(decodedPath, filename);

      if (!assetsMap.has(key)) {
        assetsMap.set(key, {
          url: path.posix.join("/", decodedPath, filename),
          originalPath: originalPath,
          filename: filename,
          relativePath: decodedPath,
          hash: match[2],
          platforms: new Set(),
        });
      }
      assetsMap.get(key).platforms.add(platform);
    }
  };

  extractFromBundle(bundles.ios, "ios");
  extractFromBundle(bundles.android, "android");

  return Array.from(assetsMap.values());
}

async function downloadAssets(assets, timestamp) {
  if (assets.length === 0) return 0;

  console.log(`Processing and mapping ${assets.length} bundle asset(s)...`);
  let successCount = 0;
  const failures = [];

  const downloadPromises = assets.map(async (asset) => {
    const tempUrl = new URL(`http://localhost:8081${asset.originalPath}`);
    const unstablePath = tempUrl.searchParams.get("unstable_path");

    if (!unstablePath) {
      throw new Error(`Asset mapping criteria unresolved: ${asset.originalPath}`);
    }

    const decodedPath = decodeURIComponent(unstablePath);
    const outputDir = path.join(projectRoot, "static-build", timestamp, "_expo", "static", "js", decodedPath);

    fs.mkdirSync(outputDir, { recursive: true });
    const output = path.join(outputDir, asset.filename);

    try {
      const candidates = [
        path.join(projectRoot, decodedPath, asset.filename),
        path.join(workspaceRoot, decodedPath, asset.filename),
      ];
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) {
        throw new Error(`Target asset missing on local drive storage: ${asset.filename}`);
      }
      fs.copyFileSync(found, output);
      successCount++;
    } catch (error) {
      failures.push({
        filename: asset.filename,
        error: error.message,
        url: asset.originalPath,
      });
    }
  });

  await Promise.all(downloadPromises);

  if (failures.length > 0) {
    const errorMsg =
      `Failed to compile ${failures.length} static resources:\n` +
      failures.map((f) => `  - ${f.filename}: ${f.error} (${f.url})`).join("\n");
    exitWithError(errorMsg);
  }

  console.log(`Successfully hardlinked ${successCount} production asset modules`);
  return successCount;
}

function updateBundleUrls(timestamp, baseUrl) {
  const updateForPlatform = (platform) => {
    const bundlePath = path.join(projectRoot, "static-build", timestamp, "_expo", "static", "js", platform, "bundle.js");
    let bundle = fs.readFileSync(bundlePath, "utf-8");

    bundle = bundle.replace(
      /httpServerLocation:"(\/[^"]+)"/g,
      (_match, capturedPath) => {
        const tempUrl = new URL(`http://localhost:8081${capturedPath}`);
        const unstablePath = tempUrl.searchParams.get("unstable_path");

        if (!unstablePath) {
          throw new Error(`Asset structure tracking failure inside compiled bundle: ${capturedPath}`);
        }

        const decodedPath = decodeURIComponent(unstablePath);
        return `httpServerLocation:"${baseUrl}${basePath}/${timestamp}/_expo/static/js/${decodedPath}"`;
      },
    );

    fs.writeFileSync(bundlePath, bundle);
  };

  updateForPlatform("ios");
  updateForPlatform("android");
  console.log("Static asset routing hooks injected into production code modules");
}

function updateManifests(manifests, timestamp, baseUrl, assetsByHash) {
  const updateForPlatform = (platform, manifest) => {
    if (!manifest.launchAsset || !manifest.extra) {
      exitWithError(`Malformed updates payload response structured for target platform: ${platform}`);
    }

    manifest.launchAsset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${platform}/bundle.js`;
    manifest.launchAsset.key = `bundle-${timestamp}`;

    manifest.createdAt = new Date(Number(timestamp.split("-")[0])).toISOString();

    manifest.extra.expoClient.hostUri = baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.debuggerHost = baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.packagerOpts.dev = false;

    if (manifest.assets && manifest.assets.length > 0) {
      manifest.assets.forEach((asset) => {
        if (!asset.url || !asset.hash) return;

        const assetInfo = assetsByHash.get(asset.hash);
        if (!assetInfo) return;

        asset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${assetInfo.relativePath}/${assetInfo.filename}`;
      });
    }

    const outputFolder = path.join(projectRoot, "static-build", platform);
    fs.mkdirSync(outputFolder, { recursive: true });
    fs.writeFileSync(
      path.join(outputFolder, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  };

  updateForPlatform("ios", manifests.ios);
  updateForPlatform("android", manifests.android);
  console.log("Deployment routing updates manifests successfully patched and finalized");
}

async function main() {
  console.log("Executing strict production build sequence for Expo Go static pipeline...");
  setupSignalHandlers();

  const domain = getDeploymentDomain();
  const expoPublicReplId = getExpoPublicReplId();
  const baseUrl = `https://${domain}`;
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  await startMetro(domain, expoPublicReplId);

  const downloadTimeout = 600000;
  const downloadPromise = downloadBundlesAndManifests(timestamp);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Overall download timeout after ${downloadTimeout / 1000} seconds. ` +
          "Metro execution pipeline processing has hung up or stalled.",
        ),
      );
    }, downloadTimeout);
  });

  const manifests = await Promise.race([downloadPromise, timeoutPromise]);

  console.log("Analyzing extracted build metadata dependencies...");
  const assets = extractAssets(timestamp);
  console.log(`Detected ${assets.length} active binary resource reference dependencies.`);

  const assetsByHash = new Map();
  for (const asset of assets) {
    assetsByHash.set(asset.hash, {
      relativePath: asset.relativePath,
      filename: asset.filename,
    });
  }

  const assetCount = await downloadAssets(assets, timestamp);
  if (assetCount > 0) {
    updateBundleUrls(timestamp, baseUrl);
  }

  console.log("Injecting compiled manifest profiles...");
  updateManifests(manifests, timestamp, baseUrl, assetsByHash);

  console.log(`\n🎉 Build complete! Static assets serve gateway successfully established at: ${baseUrl}\n`);

  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Critical deployment pipeline crash:", error.message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
});