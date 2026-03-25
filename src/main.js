const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

let mainWindow;
const USER_DATA_PATH = path.join(app.getPath('userData'), 'jcil-isolate');

// Ensure user data directory exists
function ensureUserData() {
  if (!fs.existsSync(USER_DATA_PATH)) {
    fs.mkdirSync(USER_DATA_PATH, { recursive: true });
  }
}

// Get saved user profile
function getUserProfile() {
  const profilePath = path.join(USER_DATA_PATH, 'profile.json');
  if (fs.existsSync(profilePath)) {
    return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  }
  return null;
}

// Save user profile
function saveUserProfile(profile) {
  ensureUserData();
  const profilePath = path.join(USER_DATA_PATH, 'profile.json');
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
}

// Get conversation history
function getConversations() {
  const convPath = path.join(USER_DATA_PATH, 'conversations.json');
  if (fs.existsSync(convPath)) {
    return JSON.parse(fs.readFileSync(convPath, 'utf8'));
  }
  return [];
}

// Save conversations
function saveConversations(conversations) {
  ensureUserData();
  const convPath = path.join(USER_DATA_PATH, 'conversations.json');
  fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));
}

// Check if Ollama is running
function checkOllama() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:11434/api/version', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'JCIL Isolate',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('public/index.html');

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers
ipcMain.handle('check-ollama', async () => {
  return await checkOllama();
});

ipcMain.handle('get-profile', () => {
  return getUserProfile();
});

ipcMain.handle('save-profile', (_, profile) => {
  saveUserProfile(profile);
  return true;
});

ipcMain.handle('get-conversations', () => {
  return getConversations();
});

ipcMain.handle('save-conversations', (_, conversations) => {
  saveConversations(conversations);
  return true;
});

ipcMain.handle('chat', async (event, messages) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'jcil-isolate',
      messages: messages,
      stream: false,
    });

    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.message?.content || 'No response');
        } catch (e) {
          reject('Failed to parse response');
        }
      });
    });

    req.on('error', (e) => reject(`Connection error: ${e.message}`));
    req.setTimeout(120000, () => { req.destroy(); reject('Request timed out'); });
    req.write(postData);
    req.end();
  });
});

ipcMain.handle('chat-stream', async (event, messages) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'jcil-isolate',
      messages: messages,
      stream: true,
    });

    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let fullResponse = '';
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullResponse += parsed.message.content;
              mainWindow.webContents.send('chat-token', parsed.message.content);
            }
            if (parsed.done) {
              mainWindow.webContents.send('chat-done');
            }
          } catch (e) { /* skip malformed chunks */ }
        }
      });
      res.on('end', () => resolve(fullResponse));
    });

    req.on('error', (e) => reject(`Connection error: ${e.message}`));
    req.setTimeout(120000, () => { req.destroy(); reject('Request timed out'); });
    req.write(postData);
    req.end();
  });
});

// ===== AUTO-SETUP: Ollama + Model =====
async function isOllamaInstalled() {
  try {
    execSync('which ollama 2>/dev/null || test -f /usr/local/bin/ollama || test -d /Applications/Ollama.app');
    return true;
  } catch { return false; }
}

async function isModelInstalled() {
  try {
    const result = execSync('ollama list 2>/dev/null || /Applications/Ollama.app/Contents/Resources/ollama list 2>/dev/null').toString();
    return result.includes('jcil-isolate');
  } catch { return false; }
}

function getOllamaCmd() {
  try { execSync('which ollama'); return 'ollama'; } catch {}
  if (fs.existsSync('/Applications/Ollama.app/Contents/Resources/ollama')) return '/Applications/Ollama.app/Contents/Resources/ollama';
  if (fs.existsSync('C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Ollama\\ollama.exe'))
    return 'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Ollama\\ollama.exe';
  return 'ollama';
}

async function createModel() {
  const ollamaCmd = getOllamaCmd();
  const modelfilePath = path.join(__dirname, '..', 'Modelfile');
  try {
    execSync(`${ollamaCmd} create jcil-isolate -f "${modelfilePath}"`, { timeout: 120000 });
    return true;
  } catch (e) {
    console.error('Failed to create model:', e.message);
    return false;
  }
}

// IPC for setup flow
ipcMain.handle('check-setup', async () => {
  const ollamaInstalled = await isOllamaInstalled();
  const ollamaRunning = await checkOllama();
  const modelReady = ollamaRunning ? await isModelInstalled() : false;
  return { ollamaInstalled, ollamaRunning, modelReady };
});

ipcMain.handle('install-model', async () => {
  return await createModel();
});

ipcMain.handle('open-ollama-download', () => {
  shell.openExternal('https://ollama.com/download');
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
