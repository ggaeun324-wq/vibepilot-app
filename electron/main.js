// Electron main process for VibePilot desktop app.
//
// In production it boots the bundled Next.js standalone server as a child
// process against a local SQLite database (stored in the user's appData), then
// loads it in a desktop window. In development it simply loads the dev server.
//
// This makes VibePilot a true download-and-run app: no cloud, no Postgres.

const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const { spawn } = require("node:child_process");

const isDev = !app.isPackaged;
const DEV_URL = "http://localhost:3000";

let mainWindow = null;
let serverProcess = null;

/** Find a free TCP port to avoid clashing with other local servers. */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Wait until the server answers on the given port (or time out). */
function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error("VibePilot server did not start in time"));
        } else {
          setTimeout(tryConnect, 300);
        }
      });
    };
    tryConnect();
  });
}

/**
 * Ensure a writable SQLite database exists in userData. On first launch we copy
 * the seed database that ships with the app so the schema is ready to use.
 */
function ensureDatabase() {
  const userDbPath = path.join(app.getPath("userData"), "vibepilot.db");
  if (!fs.existsSync(userDbPath)) {
    const seedDb = path.join(process.resourcesPath, "seed", "vibepilot.db");
    if (fs.existsSync(seedDb)) {
      fs.copyFileSync(seedDb, userDbPath);
    }
  }
  return userDbPath;
}

/** Start the bundled Next.js standalone server (production only). */
async function startProdServer() {
  const port = await getFreePort();
  const dbPath = ensureDatabase();

  // The standalone build is shipped under resources/app/.next/standalone.
  const serverEntry = path.join(
    process.resourcesPath,
    "app",
    ".next",
    "standalone",
    "server.js"
  );

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${dbPath}`,
      // Run Node inside Electron rather than as a browser process.
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "inherit",
  });

  serverProcess.on("error", (err) => {
    console.error("[vibepilot] server process error:", err);
  });

  await waitForServer(port);
  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b1020",
    title: "VibePilot",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links in the system browser, not inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const url = isDev ? DEV_URL : await startProdServer();
  await mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
