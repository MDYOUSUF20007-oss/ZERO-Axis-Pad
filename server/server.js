import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '8765', 10);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Determine LAN IPv4 addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // IPv4 and non-internal
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address,
        });
      }
    }
  }

  // Fallback if no external interface found
  if (addresses.length === 0) {
    addresses.push({ interface: 'loopback', address: '127.0.0.1' });
  }

  return addresses;
}

const localIps = getLocalIpAddresses();
const primaryIp = localIps[0].address;
const mobileAppUrl = `http://${primaryIp}:${PORT}`;

// Launch Python DirectInput Bridge
let pythonBridge = null;
let bridgeReady = false;

function startPythonBridge() {
  const scriptPath = path.join(__dirname, 'input_bridge.py');
  pythonBridge = spawn('python', [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  pythonBridge.stdout.on('data', (data) => {
    const text = data.toString().trim();
    try {
      const msg = JSON.parse(text);
      if (msg.status === 'ready') {
        bridgeReady = true;
        console.log(`[Bridge] Windows Input Bridge initialized (vgamepad: ${msg.has_vgamepad})`);
      }
    } catch {
      // ignore
    }
  });

  pythonBridge.stderr.on('data', (data) => {
    console.warn(`[Bridge Error] ${data.toString()}`);
  });

  pythonBridge.on('close', (code) => {
    console.log(`[Bridge] Process exited with code ${code}. Restarting...`);
    bridgeReady = false;
    setTimeout(startPythonBridge, 1000);
  });
}

startPythonBridge();

// Send command to python bridge
function dispatchInput(commandObj) {
  if (pythonBridge && pythonBridge.stdin && pythonBridge.stdin.writable) {
    try {
      pythonBridge.stdin.write(JSON.stringify(commandObj) + '\n');
    } catch (err) {
      console.warn('Bridge write error:', err);
    }
  }
}

// Connected clients tracking
const clients = new Map(); // ws -> { id, ip, connectedAt, lastPing, rtt, packets }
let nextClientId = 1;

// Broadcast helper for PC Dashboard
function broadcastToDashboard(event, payload) {
  const msg = JSON.stringify({ type: event, ...payload });
  clients.forEach((info, ws) => {
    if (info.isDashboard && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// Setup WebSocket server
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress || 'unknown';
  const clientId = nextClientId++;
  const clientInfo = {
    id: clientId,
    ip: clientIp,
    connectedAt: Date.now(),
    lastPing: Date.now(),
    rtt: 0,
    packets: 0,
    isDashboard: false,
  };
  clients.set(ws, clientInfo);

  console.log(`[WS] Client #${clientId} connected from ${clientIp}`);

  ws.on('message', (message) => {
    clientInfo.packets++;
    try {
      const data = JSON.parse(message.toString());

      // Latency measurement Ping/Pong
      if (data.t === 'ping') {
        ws.send(JSON.stringify({ t: 'pong', ts: data.ts }));
        return;
      }

      // Mark dashboard clients
      if (data.t === 'register_dashboard') {
        clientInfo.isDashboard = true;
        return;
      }

      // Dispatch physical input to Windows
      dispatchInput(data);

      // Forward to dashboard for real-time visualization on PC screen
      broadcastToDashboard('input_event', { clientId, event: data });
    } catch (err) {
      console.warn('Failed to parse WS packet:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client #${clientId} disconnected`);
    clients.delete(ws);
    broadcastToDashboard('client_disconnected', { clientId });
  });

  ws.on('error', (err) => {
    console.warn(`[WS] Error on client #${clientId}:`, err.message);
  });
});

// Middleware
app.use(express.json());

// API: Server Status & Pairing Info
app.get('/api/status', async (req, res) => {
  const qrDataUrl = await QRCode.toDataURL(mobileAppUrl, {
    margin: 1,
    width: 260,
    color: { dark: '#00f0ff', light: '#000000' },
  });

  const activeClientsList = Array.from(clients.values()).map((c) => ({
    id: c.id,
    ip: c.ip,
    connectedAt: c.connectedAt,
    rtt: c.rtt,
    packets: c.packets,
    isDashboard: c.isDashboard,
  }));

  res.json({
    status: 'running',
    port: PORT,
    localIps,
    primaryIp,
    mobileAppUrl,
    qrDataUrl,
    bridgeReady,
    clientsCount: activeClientsList.filter((c) => !c.isDashboard).length,
    clients: activeClientsList,
  });
});

// API: Manual Test Input (from dashboard)
app.post('/api/test-input', (req, res) => {
  const { type, param } = req.body;
  if (type === 'mouse') {
    dispatchInput({ t: 'mm', dx: 20, dy: 20 });
    setTimeout(() => dispatchInput({ t: 'mm', dx: -20, dy: -20 }), 150);
  } else if (type === 'volume') {
    dispatchInput({ t: 'macro', keys: ['volume_up'] });
  } else if (type === 'click') {
    dispatchInput({ t: 'mb', b: 'left', a: 'click' });
  }
  res.json({ success: true, tested: type });
});

// Serve Client Web Application (built Vite bundle)
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use('/app', express.static(clientDistPath));

// PC Host Dashboard HTML
app.get('/dashboard', async (req, res) => {
  const qrDataUrl = await QRCode.toDataURL(mobileAppUrl, {
    margin: 1,
    width: 260,
    color: { dark: '#00f0ff', light: '#000000' },
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroAxisPad — Host Receiver Dashboard</title>
  <style>
    :root {
      --bg-primary: #000000;
      --bg-surface: #0a0d14;
      --bg-card: #10141f;
      --accent: #00f0ff;
      --accent-glow: rgba(0, 240, 255, 0.4);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --border: rgba(255, 255, 255, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: var(--bg-primary); color: var(--text); padding: 24px; min-height: 100vh; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { background: rgba(0,240,255,0.15); color: var(--accent); border: 1px solid var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 340px 1fr; gap: 24px; }
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card h2 { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--text); }
    .qr-box { background: #000; border: 2px solid var(--accent); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 0 20px var(--accent-glow); }
    .qr-img { width: 220px; height: 220px; border-radius: 8px; }
    .url-tag { font-family: monospace; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; font-size: 13px; color: var(--accent); border: 1px solid var(--border); text-align: center; word-break: break-all; }
    .instructions { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-top: 12px; }
    .visualizer-container { display: flex; flex-direction: column; gap: 20px; }
    .controller-hud { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; display: flex; justify-content: space-around; align-items: center; position: relative; min-height: 240px; }
    .stick-vis { width: 100px; height: 100px; border-radius: 50%; border: 2px dashed rgba(255,255,255,0.2); position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
    .stick-knob { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); position: absolute; box-shadow: 0 0 12px var(--accent-glow); transition: transform 0.05s linear; }
    .btn-group { display: grid; grid-template-columns: repeat(3, 36px); gap: 6px; }
    .btn-node { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--bg-surface); }
    .btn-node.active { background: var(--accent); color: #000; box-shadow: 0 0 12px var(--accent-glow); }
    .telemetry-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
    .stat-box { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .stat-val { font-size: 20px; font-weight: 800; font-family: monospace; color: var(--accent); margin-top: 4px; }
    .actions-bar { display: flex; gap: 10px; margin-top: 16px; }
    .btn { background: var(--bg-card); color: var(--text); border: 1px solid var(--border); padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .btn:hover { background: var(--accent); color: #000; border-color: var(--accent); }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>ZeroAxisPad Host Receiver</h1>
      <span class="badge">DAEMON ACTIVE</span>
    </div>
    <div>
      <a href="/app" target="_blank" class="btn" style="text-decoration:none;">Open Web Controller &rarr;</a>
    </div>
  </div>

  <div class="grid">
    <!-- QR Code Pairing Card -->
    <div class="card">
      <h2>Mobile Wi-Fi Pairing</h2>
      <div class="qr-box">
        <img src="${qrDataUrl}" alt="Pairing QR Code" class="qr-img" />
        <div class="url-tag">${mobileAppUrl}</div>
      </div>
      <div class="instructions">
        &bull; <strong>Camera Scan:</strong> Point phone camera at QR code to open the controller instantly.<br>
        &bull; <strong>Zero Install:</strong> Runs directly in mobile Safari / Chrome at 120 FPS.<br>
        &bull; <strong>Low Latency:</strong> Direct local WebSocket connection on port ${PORT}.
      </div>
    </div>

    <!-- Live Controller & Input Monitor -->
    <div class="visualizer-container">
      <div class="card">
        <h2>Live Input Visualizer</h2>
        <div class="controller-hud">
          <!-- Left Stick -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div class="stick-vis">
              <div id="ls-knob" class="stick-knob"></div>
            </div>
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">LEFT STICK</span>
          </div>

          <!-- D-pad -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div class="btn-group">
              <div></div><div id="btn-dpad-up" class="btn-node">&uarr;</div><div></div>
              <div id="btn-dpad-left" class="btn-node">&larr;</div><div class="btn-node" style="opacity:0.3;">+</div><div id="btn-dpad-right" class="btn-node">&rarr;</div>
              <div></div><div id="btn-dpad-down" class="btn-node">&darr;</div><div></div>
            </div>
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">D-PAD</span>
          </div>

          <!-- Gyro Steering HUD -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div id="steering-gauge" style="width:70px; height:70px; border-radius:50%; border:3px solid var(--accent); display:flex; align-items:center; justify-content:center; font-family:monospace; font-weight:800; font-size:14px; transition:transform 0.05s linear;">
              0°
            </div>
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">GYRO STEERING</span>
          </div>

          <!-- ABXY Buttons -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div class="btn-group">
              <div></div><div id="btn-y" class="btn-node">Y</div><div></div>
              <div id="btn-x" class="btn-node">X</div><div></div><div id="btn-b" class="btn-node">B</div>
              <div></div><div id="btn-a" class="btn-node">A</div><div></div>
            </div>
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">ABXY</span>
          </div>

          <!-- Right Stick -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div class="stick-vis">
              <div id="rs-knob" class="stick-knob"></div>
            </div>
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">RIGHT STICK</span>
          </div>
        </div>

        <div class="telemetry-row">
          <div class="stat-box">
            <div class="stat-label">Active Connections</div>
            <div id="stat-clients" class="stat-val">0</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Packets Processed</div>
            <div id="stat-packets" class="stat-val">0</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Windows Driver Bridge</div>
            <div class="stat-val" style="color:#22c55e;">ONLINE</div>
          </div>
        </div>

        <div class="actions-bar">
          <button class="btn" onclick="testInput('mouse')">Test Mouse Jiggle</button>
          <button class="btn" onclick="testInput('volume')">Test Volume Up</button>
          <button class="btn" onclick="testInput('click')">Test Left Click</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://' + window.location.host + '/ws');
    let totalPackets = 0;

    ws.onopen = () => {
      ws.send(JSON.stringify({ t: 'register_dashboard' }));
    };

    ws.onmessage = (event) => {
      totalPackets++;
      document.getElementById('stat-packets').innerText = totalPackets;

      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'input_event') {
          const ev = msg.event;
          if (ev.t === 'gp') {
            // Update sticks
            const maxR = 32;
            document.getElementById('ls-knob').style.transform =
              'translate(' + (ev.lx * maxR) + 'px, ' + (ev.ly * maxR) + 'px)';
            document.getElementById('rs-knob').style.transform =
              'translate(' + (ev.rx * maxR) + 'px, ' + (ev.ry * maxR) + 'px)';

            // Update buttons
            const bm = ev.bm || 0;
            const toggle = (id, active) => {
              const el = document.getElementById(id);
              if (el) el.classList.toggle('active', active);
            };
            toggle('btn-a', !!(bm & (1 << 0)));
            toggle('btn-b', !!(bm & (1 << 1)));
            toggle('btn-x', !!(bm & (1 << 2)));
            toggle('btn-y', !!(bm & (1 << 3)));
            toggle('btn-dpad-up', !!(bm & (1 << 8)));
            toggle('btn-dpad-down', !!(bm & (1 << 9)));
            toggle('btn-dpad-left', !!(bm & (1 << 10)));
            toggle('btn-dpad-right', !!(bm & (1 << 11)));
          } else if (ev.t === 'motion') {
            const gauge = document.getElementById('steering-gauge');
            const deg = Math.round(ev.r || 0);
            gauge.style.transform = 'rotate(' + deg + 'deg)';
            gauge.innerText = deg + '°';
          }
        }
      } catch (e) {}
    };

    function refreshStats() {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => {
          document.getElementById('stat-clients').innerText = d.clientsCount;
        })
        .catch(() => {});
    }
    setInterval(refreshStats, 2000);
    refreshStats();

    function testInput(type) {
      fetch('/api/test-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
    }
  </script>
</body>
</html>`;

  res.send(html);
});

// Default root:
// If request comes from mobile user-agent, redirect to /app (the controller).
// If request comes from desktop, redirect to /dashboard.
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if (isMobile) {
    res.redirect('/app');
  } else {
    res.redirect('/dashboard');
  }
});

// Start Server
server.listen(PORT, '0.0.0.0', async () => {
  console.log('\n======================================================');
  console.log('   ZeroAxisPad — Host Server Ready                   ');
  console.log('======================================================');
  console.log(`[Host] Local Dashboard:     http://localhost:${PORT}/dashboard`);
  console.log(`[Host] Mobile Web Client:   ${mobileAppUrl}/app`);
  console.log(`[Host] WebSocket Endpoint:  ws://${primaryIp}:${PORT}/ws`);
  console.log('------------------------------------------------------');
  console.log('Scan the QR code below on your phone to connect:');

  try {
    const terminalQr = await QRCode.toString(mobileAppUrl + '/app', { type: 'terminal', small: true });
    console.log(terminalQr);
  } catch (err) {
    // ignore
  }

  console.log('======================================================\n');
});

// Graceful cleanup
process.on('SIGINT', () => {
  console.log('\nStopping ZeroAxisPad host server...');
  if (pythonBridge) pythonBridge.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (pythonBridge) pythonBridge.kill();
  process.exit(0);
});
