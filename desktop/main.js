const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

let mainWindow;
let backendServer;

// Detect if running in development mode
const isDev = !app.isPackaged;
const PORT = process.env.PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 4444;

console.log(`Starting Aniways in ${isDev ? "development" : "production"} mode`);

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          }
        },
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Maximize',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              if (focusedWindow.isMaximized()) {
                focusedWindow.unmaximize();
              } else {
                focusedWindow.maximize();
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              const currentZoom = focusedWindow.webContents.getZoomLevel();
              focusedWindow.webContents.setZoomLevel(currentZoom + 0.5);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              const currentZoom = focusedWindow.webContents.getZoomLevel();
              focusedWindow.webContents.setZoomLevel(currentZoom - 0.5);
            }
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.setZoomLevel(0);
            }
          }
        }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: (item, focusedWindow) => {
            if (focusedWindow && focusedWindow.webContents.canGoBack()) {
              focusedWindow.webContents.goBack();
            }
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: (item, focusedWindow) => {
            if (focusedWindow && focusedWindow.webContents.canGoForward()) {
              focusedWindow.webContents.goForward();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+H',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.loadURL(`http://localhost:${PORT}`);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: () => {
            shell.openExternal('https://github.com/hazavi/aniways');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/hazavi/aniways/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const { screen, session } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Allow images to load from external CDN domains by removing restrictive CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    // Keep the player sandbox policy while retaining the existing image behavior.
    if (!details.url.startsWith(`http://localhost:${PORT}/animex-player/`)) {
      delete headers["content-security-policy"];
      delete headers["Content-Security-Policy"];
    }
    callback({ responseHeaders: headers });
  });

  // Icon path differs between dev and production
  const iconPath = isDev 
    ? path.join(__dirname, "../frontend/public/Icon.ico")
    : path.join(process.resourcesPath, "public", "Icon.ico");

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
      enableWebSQL: false,
    },
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#09090b",
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // Track maximize state
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('maximize-change', true);
  });
  
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('maximize-change', false);
  });

  mainWindow.maximize();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Embedded player ads use window.open; never create a new app window or
    // forward an arbitrary iframe URL to the system browser.
    if (/^https:\/\/github\.com\/hazavi\/aniways(?:\/|$)/.test(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Keep player scripts from replacing the Aniways window with an ad page.
    let destination;
    try {
      destination = new URL(url);
    } catch {
      event.preventDefault();
      return;
    }
    if (destination.origin !== new URL(`http://localhost:${PORT}`).origin) {
      event.preventDefault();
    }
  });

  const startUrl = `http://localhost:${PORT}`;

  const waitForServer = (retries = 0) => {
    const maxRetries = 60;
    
    const req = http.get(`http://localhost:${PORT}`, (res) => {
      console.log("Next.js server is ready!");
      mainWindow.loadURL(startUrl);
    });
    
    req.on("error", () => {
      if (retries < maxRetries) {
        setTimeout(() => waitForServer(retries + 1), 500);
      } else {
        console.error("Timeout waiting for Next.js server");
        mainWindow.loadURL(startUrl);
      }
    });
    
    req.end();
  };

  waitForServer();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) {
    console.log("Development mode: Next.js dev server should be running separately");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const resourcesPath = process.resourcesPath;
    const serverPath = path.join(resourcesPath, "standalone", "server.js");
    const standaloneCwd = path.join(resourcesPath, "standalone");
    
    console.log(`Starting Next.js server from: ${serverPath}`);
    console.log(`Working directory: ${standaloneCwd}`);
    
    if (!fs.existsSync(serverPath)) {
      console.error(`Server file not found: ${serverPath}`);
      reject(new Error("Server file not found"));
      return;
    }

    process.env.PORT = PORT.toString();
    process.env.HOSTNAME = "localhost";
    process.env.NODE_ENV = "production";
    
    const originalCwd = process.cwd();
    process.chdir(standaloneCwd);
    
    try {
      require(serverPath);
      console.log("Next.js server started via require");
      
      const checkServer = (attempts = 0) => {
        const req = http.get(`http://localhost:${PORT}`, (res) => {
          console.log("Next.js server is responding!");
          resolve();
        });
        req.on("error", () => {
          if (attempts < 30) {
            setTimeout(() => checkServer(attempts + 1), 500);
          } else {
            console.log("Server check timed out, proceeding anyway");
            resolve();
          }
        });
        req.end();
      };
      
      setTimeout(() => checkServer(), 1000);
    } catch (error) {
      console.error("Error starting Next.js server:", error);
      process.chdir(originalCwd);
      reject(error);
    }
  });
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on("error", (err) => {
      if (err.code === "ECONNREFUSED") {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startBackendServer() {
  return new Promise(async (resolve) => {
    const backendRunning = await checkPortInUse(BACKEND_PORT);
    if (backendRunning) {
      console.log(`Backend already running on port ${BACKEND_PORT}`);
      resolve();
      return;
    }

    const isWindows = process.platform === "win32";

    // In production, use the bundled backend executable
    if (!isDev) {
      const backendExePath = path.join(process.resourcesPath, "backend", "aniways-backend.exe");
      
      console.log(`Starting bundled backend from: ${backendExePath}`);
      
      if (!fs.existsSync(backendExePath)) {
        console.error(`Backend executable not found: ${backendExePath}`);
        resolve();
        return;
      }

      backendServer = spawn(backendExePath, [], {
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: BACKEND_PORT.toString(),
        },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      backendServer.stdout.on("data", (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        if (output.includes("Uvicorn running") || output.includes("Application startup complete")) {
          resolve();
        }
      });

      backendServer.stderr.on("data", (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        if (output.includes("Uvicorn running") || output.includes("Application startup complete")) {
          resolve();
        }
      });

      backendServer.on("error", (error) => {
        console.error("Failed to start backend server:", error);
        resolve();
      });

      setTimeout(() => {
        const req = http.get(`http://localhost:${BACKEND_PORT}/docs`, (res) => {
          console.log("Backend server is ready!");
          resolve();
        });
        req.on("error", () => {
          console.log("Backend not responding yet, continuing anyway...");
          resolve();
        });
        req.end();
      }, 3000);
      
      return;
    }

    // Development mode - use Python
    const backendPath = path.join(__dirname, "../backend");

    console.log(`Starting backend server from: ${backendPath}`);

    const venvPath = path.join(__dirname, "../.venv");
    const venvPython = isWindows 
      ? path.join(venvPath, "Scripts", "python.exe")
      : path.join(venvPath, "bin", "python");

    let pythonCmd;
    
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython;
      console.log(`Using virtual environment Python: ${pythonCmd}`);
    } else {
      pythonCmd = isWindows ? "python" : "python3";
      console.log(`Using system Python: ${pythonCmd}`);
    }

    const args = ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", BACKEND_PORT.toString()];
    
    console.log(`Running: ${pythonCmd} ${args.join(" ")}`);

    backendServer = spawn(pythonCmd, args, {
      cwd: backendPath,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      shell: isWindows,
      stdio: ["pipe", "pipe", "pipe"],
    });

    backendServer.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`Backend: ${output}`);
      if (output.includes("Uvicorn running") || output.includes("Application startup complete")) {
        resolve();
      }
    });

    backendServer.stderr.on("data", (data) => {
      const output = data.toString();
      console.log(`Backend: ${output}`);
      if (output.includes("Uvicorn running") || output.includes("Application startup complete")) {
        resolve();
      }
    });

    backendServer.on("error", (error) => {
      console.error("Failed to start backend server:", error);
      resolve();
    });

    setTimeout(() => {
      const req = http.get(`http://localhost:${BACKEND_PORT}/docs`, (res) => {
        console.log("Backend server is ready!");
        resolve();
      });
      req.on("error", () => {
        console.log("Backend not responding yet, continuing anyway...");
        resolve();
      });
      req.end();
    }, 3000);
  });
}

function cleanup() {
  console.log("Cleaning up...");
  
  if (backendServer && !backendServer.killed) {
    console.log("Stopping backend server...");
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", backendServer.pid, "/f", "/t"], { shell: true });
    } else {
      backendServer.kill("SIGTERM");
    }
    backendServer = null;
  }
}

app.whenReady().then(async () => {
  console.log("App is ready, starting servers...");
  
  createMenu();
  
  // Navigation IPC handlers
  ipcMain.on("nav-back", () => {
    if (mainWindow && mainWindow.webContents.canGoBack()) {
      mainWindow.webContents.goBack();
    }
  });
  
  ipcMain.on("nav-forward", () => {
    if (mainWindow && mainWindow.webContents.canGoForward()) {
      mainWindow.webContents.goForward();
    }
  });
  
  ipcMain.on("nav-home", () => {
    if (mainWindow) {
      mainWindow.loadURL(`http://localhost:${PORT}`);
    }
  });
  
  ipcMain.on("nav-reload", () => {
    if (mainWindow) {
      mainWindow.webContents.reload();
    }
  });
  
  ipcMain.on("nav-force-reload", () => {
    if (mainWindow) {
      mainWindow.webContents.reloadIgnoringCache();
    }
  });
  
  // Window control handlers
  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.on("window-close", () => {
    if (mainWindow) mainWindow.close();
  });
  
  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });
  
  try {
    await startBackendServer();
    await startNextServer();
    createWindow();
    
    // Send navigation state updates when navigation changes
    if (mainWindow) {
      mainWindow.webContents.on("did-navigate", () => {
        sendNavigationState();
      });
      mainWindow.webContents.on("did-navigate-in-page", () => {
        sendNavigationState();
      });
    }
  } catch (error) {
    console.error("Error starting application:", error);
    createWindow();
  }
});

function sendNavigationState() {
  if (mainWindow) {
    mainWindow.webContents.send("navigation-state", {
      canGoBack: mainWindow.webContents.canGoBack(),
      canGoForward: mainWindow.webContents.canGoForward(),
    });
  }
}

app.on("window-all-closed", () => {
  cleanup();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  cleanup();
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  cleanup();
});
