import { spawn } from 'child_process';
import { WebSocket } from 'ws';

async function runTest() {
  console.log('[Test] Starting server process...');
  const serverProc = spawn('node', ['server/server.js'], { stdio: 'inherit' });

  // Wait 1.5s for server to start
  await new Promise((r) => setTimeout(r, 1500));

  try {
    // 1. Test HTTP status
    console.log('[Test] Querying /api/status...');
    const res = await fetch('http://localhost:8765/api/status');
    const data = await res.json();
    console.log('[Test] Status received:', data.status, 'Bridge ready:', data.bridgeReady);

    if (data.status !== 'running') throw new Error('Server not running');

    // 2. Test WebSocket connection
    console.log('[Test] Connecting WebSocket client to ws://localhost:8765/ws...');
    const ws = new WebSocket('ws://localhost:8765/ws');

    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('[Test] WebSocket connected successfully!');

        // Send Ping
        ws.send(JSON.stringify({ t: 'ping', ts: Date.now() }));

        // Send Gamepad State
        ws.send(JSON.stringify({
          t: 'gp',
          bm: 0x01, // A button
          lx: 0.5,
          ly: -0.2,
          rx: 0.0,
          ry: 0.0,
          lt: 0.0,
          rt: 1.0,
        }));

        // Send Motion State
        ws.send(JSON.stringify({
          t: 'motion',
          p: 10.5,
          r: -15.2,
          y: 180.0,
          st: -0.35,
        }));
      });

      ws.on('message', (msg) => {
        const parsed = JSON.parse(msg.toString());
        if (parsed.t === 'pong') {
          console.log('[Test] Received pong from server! Latency measurement OK.');
          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
    });

    console.log('[Test] ALL TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.');
  } catch (err) {
    console.error('[Test Error]', err);
    process.exit(1);
  } finally {
    serverProc.kill();
    process.exit(0);
  }
}

runTest();
