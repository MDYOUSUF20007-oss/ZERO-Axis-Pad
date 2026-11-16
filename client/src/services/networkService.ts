import type { ConnectionStatus, GamepadAxes, GamepadButtons } from '../types/controller';

type StatusListener = (status: ConnectionStatus) => void;

class NetworkService {
  private ws: WebSocket | null = null;
  private host: string = '';
  private port: number = 8765;
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private lastPingSentTime: number = 0;
  private manualDisconnect: boolean = false;

  private status: ConnectionStatus = {
    state: 'disconnected',
    rtt: 0,
    serverAddress: '',
    packetsSent: 0,
    packetsReceived: 0,
  };

  constructor() {
    // Infer default host if in browser
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const hostname = window.location.hostname;
      if (hostname !== '' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        this.host = hostname;
      }
    }

    // Load saved host/port from localStorage
    const savedHost = localStorage.getItem('zeroaxispad_host');
    const savedPort = localStorage.getItem('zeroaxispad_port');
    if (savedHost) this.host = savedHost;
    if (savedPort) this.port = parseInt(savedPort, 10) || 8765;

    // If host is still empty, default to window.location.hostname or localhost
    if (!this.host) {
      this.host = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : '127.0.0.1';
    }
  }

  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus() {
    const current = this.getStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error notifying status listener:', err);
      }
    });
  }

  public connect(host?: string, port?: number) {
    if (host) {
      this.host = host;
      localStorage.setItem('zeroaxispad_host', host);
    }
    if (port) {
      this.port = port;
      localStorage.setItem('zeroaxispad_port', port.toString());
    }

    this.manualDisconnect = false;
    this.disconnect(false);

    const wsUrl = `ws://${this.host}:${this.port}/ws`;
    this.status.serverAddress = `${this.host}:${this.port}`;
    this.status.state = 'connecting';
    this.status.lastError = undefined;
    this.notifyStatus();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status.state = 'connected';
        this.status.lastError = undefined;
        this.notifyStatus();
        this.startPingPong();
      };

      this.ws.onmessage = (event) => {
        this.status.packetsReceived++;
        try {
          const data = JSON.parse(event.data);
          if (data.t === 'pong' && data.ts) {
            const now = performance.now();
            const rtt = Math.round(now - this.lastPingSentTime);
            this.status.rtt = Math.max(1, rtt);
            this.notifyStatus();
          }
        } catch {
          // ignore non-json messages
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        this.status.lastError = 'Connection error';
        this.status.state = 'error';
        this.notifyStatus();
      };

      this.ws.onclose = () => {
        this.stopPingPong();
        if (!this.manualDisconnect) {
          this.status.state = 'disconnected';
          this.notifyStatus();
          this.scheduleReconnect();
        } else {
          this.status.state = 'disconnected';
          this.notifyStatus();
        }
      };
    } catch (err: unknown) {
      this.status.state = 'error';
      this.status.lastError = err instanceof Error ? err.message : 'Failed to create WebSocket';
      this.notifyStatus();
      this.scheduleReconnect();
    }
  }

  public disconnect(manual: boolean = true) {
    this.manualDisconnect = manual;
    this.stopPingPong();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    if (manual) {
      this.status.state = 'disconnected';
      this.notifyStatus();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.manualDisconnect) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.status.state !== 'connected' && !this.manualDisconnect) {
        this.connect();
      }
    }, 2500);
  }

  private startPingPong() {
    this.stopPingPong();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentTime = performance.now();
        this.sendRaw({ t: 'ping', ts: Date.now() });
      }
    }, 1500);
  }

  private stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private sendRaw(data: object): boolean {
    if (this.isConnected() && this.ws) {
      try {
        this.ws.send(JSON.stringify(data));
        this.status.packetsSent++;
        return true;
      } catch (err) {
        console.warn('Send error:', err);
        return false;
      }
    }
    return false;
  }

  // --- Specialized Low-Latency Transmitters ---

  /**
   * Gamepad state transmission with packed button bitmask and analog floats
   */
  public sendGamepadState(axes: GamepadAxes, buttons: GamepadButtons) {
    let buttonMask = 0;
    if (buttons.a) buttonMask |= 1 << 0;
    if (buttons.b) buttonMask |= 1 << 1;
    if (buttons.x) buttonMask |= 1 << 2;
    if (buttons.y) buttonMask |= 1 << 3;
    if (buttons.lb) buttonMask |= 1 << 4;
    if (buttons.rb) buttonMask |= 1 << 5;
    if (buttons.l3) buttonMask |= 1 << 6;
    if (buttons.r3) buttonMask |= 1 << 7;
    if (buttons.dpad_up) buttonMask |= 1 << 8;
    if (buttons.dpad_down) buttonMask |= 1 << 9;
    if (buttons.dpad_left) buttonMask |= 1 << 10;
    if (buttons.dpad_right) buttonMask |= 1 << 11;
    if (buttons.select) buttonMask |= 1 << 12;
    if (buttons.start) buttonMask |= 1 << 13;
    if (buttons.guide) buttonMask |= 1 << 14;

    this.sendRaw({
      t: 'gp',
      bm: buttonMask,
      lx: Number(axes.lx.toFixed(3)),
      ly: Number(axes.ly.toFixed(3)),
      rx: Number(axes.rx.toFixed(3)),
      ry: Number(axes.ry.toFixed(3)),
      lt: Number(axes.lt.toFixed(3)),
      rt: Number(axes.rt.toFixed(3)),
    });
  }

  /**
   * Mouse pointer movement (relative delta)
   */
  public sendMouseMove(dx: number, dy: number) {
    this.sendRaw({
      t: 'mm',
      dx: Number(dx.toFixed(2)),
      dy: Number(dy.toFixed(2)),
    });
  }

  /**
   * Mouse click (action: 'down' | 'up' | 'click')
   */
  public sendMouseButton(button: 'left' | 'right' | 'middle', action: 'down' | 'up' | 'click') {
    this.sendRaw({
      t: 'mb',
      b: button,
      a: action,
    });
  }

  /**
   * Mouse wheel scroll (vertical & horizontal)
   */
  public sendMouseScroll(dx: number, dy: number) {
    this.sendRaw({
      t: 'ms',
      dx: Math.round(dx),
      dy: Math.round(dy),
    });
  }

  /**
   * Macro trigger
   */
  public sendMacro(id: string, keys: string[]) {
    this.sendRaw({
      t: 'macro',
      id,
      keys,
    });
  }

  /**
   * Motion sensor stream (steering wheel angle, orientation, accelerometer)
   */
  public sendMotion(pitch: number, roll: number, yaw: number, steering: number) {
    this.sendRaw({
      t: 'motion',
      p: Number(pitch.toFixed(2)),
      r: Number(roll.toFixed(2)),
      y: Number(yaw.toFixed(2)),
      st: Number(steering.toFixed(3)),
    });
  }
}

export const networkService = new NetworkService();
