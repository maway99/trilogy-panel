import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const PORT = process.env.PORT || config.server?.port || 3000;
const startedAt = Date.now();

// ---------- Server state ("track what we sent") ----------
const state = {
  ma2: 'disconnected',
  resolume: 'disconnected',
  haze: 0,
  fadeTime: config.defaults.fadeTime,
  endOfNightActive: false,
  activeCue: null,
  confetti: Object.fromEntries(config.executors.confetti.map(c => [c.id, false])),
  disables: Object.fromEntries(Object.keys(config.executors.disables).map(k => [k, false])),
  djSource: null,
  brightness: 100,
  ma2DisconnectedAt: Date.now(),
  ma2LastCommand: null,
  ma2LastCommandAt: null,
  ma2LastResponse: null,
  resolumeLastPollAt: null,
  resolumeLastStatus: null
};

function resetLightingNeutral() {
  state.haze = 0;
  state.endOfNightActive = false;
  state.activeCue = null;
  state.confetti = Object.fromEntries(config.executors.confetti.map(c => [c.id, false]));
  for (const k of Object.keys(state.disables)) state.disables[k] = false;
}

// ---------- WebSocket broadcast ----------
let wss;
function broadcast(msg) {
  if (!wss) return;
  const data = JSON.stringify(msg);
  for (const c of wss.clients) {
    if (c.readyState === 1) c.send(data);
  }
}
function broadcastState() {
  broadcast({ type: 'state', state: snapshotState() });
}
function snapshotState() {
  return {
    ...state,
    uptimeMs: Date.now() - startedAt,
    config: {
      ma2: { ip: config.ma2.ip, port: config.ma2.port },
      resolume: { ip: config.resolume.ip, port: config.resolume.port },
      cueBanks: config.cueBanks,
      cueStack: config.cueStack,
      executors: config.executors,
      djSources: config.resolume.djSources,
      defaults: config.defaults
    }
  };
}

// ---------- MA2 Telnet manager ----------
class Ma2Telnet {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.loggedIn = false;
    this.reconnectTimer = null;
    this.buffer = '';
    this.queue = [];
  }

  connect() {
    if (this.socket) return;
    this.buffer = '';
    this.loggedIn = false;
    this._loginSent = false;
    if (this._loginFallback) { clearTimeout(this._loginFallback); this._loginFallback = null; }
    const sock = new net.Socket();
    this.socket = sock;
    sock.setEncoding('utf8');
    sock.setKeepAlive(true, 10000);

    const sendLogin = () => {
      if (this._loginSent) return;
      this._loginSent = true;
      const u = config.ma2.username ?? '';
      const p = config.ma2.password ?? '';
      const cmd = `Login "${u}" "${p}"\r\n`;
      sock.write(cmd);
      console.log(`[MA2 →] Login "${u}" "***"`);
      this.buffer = ''; // discard pre-login banner so we don't match old prompts
    };

    sock.on('connect', () => {
      console.log(`[MA2] TCP connected ${config.ma2.ip}:${config.ma2.port}`);
      // Send Login as soon as the first prompt arrives. If nothing arrives
      // within 800ms, send anyway — some MA2 builds present an empty prompt.
      this._loginFallback = setTimeout(sendLogin, 800);
    });

    sock.on('data', (chunk) => {
      this.buffer += chunk.toString();
      // strip telnet IAC negotiation bytes and other control chars
      this.buffer = this.buffer.replace(/[\x00-\x08\x0E-\x1F]/g, '');
      state.ma2LastResponse = this.buffer.slice(-200);
      const lower = this.buffer.toLowerCase();

      if (this.loggedIn) return;

      if (!this._loginSent) {
        // First prompt seen → send Login immediately, don't wait for fallback.
        if (/\]>\s*$/.test(this.buffer) || /^>\s*$/m.test(this.buffer)) {
          if (this._loginFallback) { clearTimeout(this._loginFallback); this._loginFallback = null; }
          sendLogin();
        }
        return;
      }

      // After Login was sent, look for explicit success or failure.
      if (lower.includes('logged in') || lower.includes('login successful') ||
          new RegExp(`\\[${config.ma2.username}[^\\]]*\\]>`, 'i').test(this.buffer)) {
        this.loggedIn = true;
        this.connected = true;
        this.buffer = '';
        state.ma2 = 'connected';
        state.ma2DisconnectedAt = null;
        console.log('[MA2] Logged in as', config.ma2.username);
        broadcastState();
        while (this.queue.length) sock.write(this.queue.shift());
      } else if (lower.includes('login failed') || lower.includes('wrong password') ||
                 lower.includes('access denied') || lower.includes('invalid user')) {
        console.warn('[MA2] Login rejected:', this.buffer.slice(-200));
        sock.destroy(); // triggers close → reconnect cycle
      }
    });

    sock.on('error', (err) => {
      console.warn('[MA2] Socket error:', err.message);
    });

    sock.on('close', () => {
      console.log('[MA2] Socket closed');
      const wasConnected = state.ma2 === 'connected';
      this.socket = null;
      this.connected = false;
      this.loggedIn = false;
      this._loginSent = false;
      if (this._loginFallback) { clearTimeout(this._loginFallback); this._loginFallback = null; }
      if (wasConnected) {
        state.ma2 = 'disconnected';
        state.ma2DisconnectedAt = Date.now();
        resetLightingNeutral();
        broadcastState();
      }
      this.scheduleReconnect();
    });

    sock.connect(config.ma2.port, config.ma2.ip);
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, config.ma2.reconnectIntervalMs);
  }

  forceReconnect() {
    if (this.socket) {
      try { this.socket.destroy(); } catch {}
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connect();
  }

  send(command) {
    const line = command.endsWith('\r\n') ? command : `${command}\r\n`;
    state.ma2LastCommand = command;
    state.ma2LastCommandAt = Date.now();
    if (this.connected && this.loggedIn && this.socket) {
      this.socket.write(line);
      console.log('[MA2 →]', command);
    } else {
      console.log('[MA2 queued]', command);
      this.queue.push(line);
    }
  }
}
const ma2 = new Ma2Telnet();

// ---------- Resolume HTTP ----------
async function resolumeRequest(method, pathSuffix, body) {
  const url = `http://${config.resolume.ip}:${config.resolume.port}/api/v1${pathSuffix}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(1500)
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  state.resolumeLastStatus = res.status;
  return res;
}

async function pollResolume() {
  try {
    const res = await resolumeRequest('GET', '/product');
    state.resolumeLastPollAt = Date.now();
    if (res.ok) {
      if (state.resolume !== 'connected') {
        state.resolume = 'connected';
        // one-time brightness sync on (re)connect
        try {
          const r = await resolumeRequest('GET', '/composition');
          if (r.ok) {
            const data = await r.json();
            const opacity = data?.master?.value ?? data?.master ?? null;
            if (typeof opacity === 'number') {
              state.brightness = Math.round(opacity * 100);
            }
          }
        } catch {}
        broadcastState();
      }
    } else if (state.resolume === 'connected') {
      state.resolume = 'disconnected';
      broadcastState();
    }
  } catch {
    state.resolumeLastPollAt = Date.now();
    if (state.resolume === 'connected') {
      state.resolume = 'disconnected';
      broadcastState();
    }
  }
}

let resolumeTimer = null;
function startResolumePolling() {
  if (resolumeTimer) return;
  pollResolume();
  resolumeTimer = setInterval(pollResolume, config.resolume.pollIntervalMs);
}

// ---------- Command handlers (panel actions → MA2 / Resolume) ----------
function setHaze(value) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  state.haze = v;
  const { page, exec } = config.executors.haze;
  ma2.send(`Fader ${page}.${exec} At ${v}`);
  broadcastState();
}

function setFadeTime(value) {
  const v = Math.max(0, Math.min(30, Math.round(value * 2) / 2));
  state.fadeTime = v;
  broadcastState();
}

function selectCue(cueNumber) {
  state.activeCue = cueNumber;
  // If End of Night was active, firing a cue should release it.
  if (state.endOfNightActive) {
    const eotn = config.executors.endOfNight;
    ma2.send(`Off Exec ${eotn.page}.${eotn.exec}`);
    state.endOfNightActive = false;
  }
  const { page, exec } = config.cueStack;
  // Single line: 'Fade' as a suffix on Goto. MA2 errors on standalone 'Fade N'.
  ma2.send(`Goto Cue ${cueNumber} Exec ${page}.${exec} Fade ${state.fadeTime}`);
  broadcastState();
}

function setClear() {
  const { page } = config.cueStack;
  ma2.send(`Off Fader ${page}`);
  state.activeCue = null;
  broadcastState();
}

function setEndOfNight(active) {
  state.endOfNightActive = !!active;
  const { page, exec } = config.executors.endOfNight;
  ma2.send(`${active ? 'Go' : 'Off'} Exec ${page}.${exec}`);

  if (active) {
    // EOTN takes over: release the main cue stack and clear panel-side
    // confetti tracking so reload state is fresh for next night.
    const cs = config.cueStack;
    ma2.send(`Off Exec ${cs.page}.${cs.exec}`);
    state.activeCue = null;
    state.confetti = Object.fromEntries(config.executors.confetti.map(c => [c.id, false]));
  }

  broadcastState();
}

function fireConfetti(cannonId) {
  const cannon = config.executors.confetti.find(c => c.id === cannonId);
  if (!cannon) return;
  state.confetti[cannonId] = true;
  ma2.send(`Go Exec ${cannon.page}.${cannon.exec}`);
  broadcastState();
}

function resetConfetti() {
  state.confetti = Object.fromEntries(config.executors.confetti.map(c => [c.id, false]));
  broadcastState();
}

function setDisable(target, active) {
  const exec = config.executors.disables[target];
  if (!exec) return;
  state.disables[target] = !!active;
  // Disabled === executor turned Off (inhibitive submaster off → fixtures inhibited)
  ma2.send(`${active ? 'Off' : 'Go'} Exec ${exec.page}.${exec.exec}`);
  broadcastState();
}

async function setDjSource(sourceId) {
  const src = config.resolume.djSources[sourceId];
  if (!src) return;
  state.djSource = sourceId;
  broadcastState();
  try {
    await resolumeRequest('POST', `/composition/layers/${src.layer}/clips/${src.clip}/connect`);
  } catch (err) {
    console.warn('[Resolume] DJ source failed:', err.message);
  }
}

async function setBrightness(value) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  state.brightness = v;
  broadcastState();
  try {
    await resolumeRequest('PUT', '/composition/master', { value: v / 100 });
  } catch (err) {
    console.warn('[Resolume] Brightness failed:', err.message);
  }
}

// ---------- HTTP / WS server ----------
const app = express();
app.use(express.json());

app.get('/api/state', (_req, res) => res.json(snapshotState()));
app.get('/api/health', (_req, res) => res.json({ ok: true, uptimeMs: Date.now() - startedAt }));

// Serve built client if present
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|ws).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:40px">
        <h1>Trilogy Panel — backend running</h1>
        <p>Client build not found at <code>client/dist</code>.</p>
        <p>For dev: <code>npm run client:dev</code> (Vite proxies /ws → :3000)</p>
        <p>For prod build: <code>npm run client:build</code></p>
      </body></html>
    `);
  });
}

const server = http.createServer(app);

wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', state: snapshotState() }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    switch (msg.type) {
      case 'haze':            return setHaze(msg.value);
      case 'fadeTime':        return setFadeTime(msg.value);
      case 'cue':             return selectCue(msg.cueNumber);
      case 'endOfNight':      return setEndOfNight(msg.active);
      case 'clear':           return setClear();
      case 'confetti':        return fireConfetti(msg.cannon);
      case 'confettiReset':   return resetConfetti();
      case 'disable':         return setDisable(msg.target, msg.active);
      case 'djSource':        return setDjSource(msg.source);
      case 'brightness':      return setBrightness(msg.value);
      case 'forceReconnectMa2':       return ma2.forceReconnect();
      case 'forceReconnectResolume':  return pollResolume();
      case 'rawMa2': {
        if (typeof msg.command === 'string' && msg.command.trim()) {
          ma2.send(msg.command.trim());
        }
        return;
      }
      default: console.warn('[WS] Unknown message type:', msg.type);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket at ws://localhost:${PORT}/ws`);
  ma2.connect();
  startResolumePolling();
});

// Periodic uptime broadcast (cheap, keeps Status tab live)
setInterval(() => {
  if (wss && wss.clients.size > 0) {
    broadcast({ type: 'tick', uptimeMs: Date.now() - startedAt, ma2DisconnectedAt: state.ma2DisconnectedAt, resolumeLastPollAt: state.resolumeLastPollAt });
  }
}, 1000);

// Graceful shutdown
function shutdown() {
  console.log('\n[Server] Shutting down...');
  if (resolumeTimer) clearInterval(resolumeTimer);
  if (ma2.socket) ma2.socket.destroy();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
