# ZeroAxisPad 🎮📱

> **High-Performance, 100% Open-Source, Paywall-Free Virtual Controller & Gyro Steering System**  
> Turn your smartphone or tablet into a wireless gamepad, air mouse, media remote, and macro deck with real-time motion steering. Zero ads, zero paywalls, zero telemetry.

---

## ⚡ Core Features

- **Multi-Mode Controller Profiles:**
  - 🕹️ **Gamepad Mode:** Dual virtual analog sticks with floating/radial clamping, 8-way tactile D-pad, diamond ABXY action buttons, bumpers (L1/R1), analog triggers (L2/R2 with fill gauges), L3/R3 stick clicks, and an integrated **Motion Steering toggle**.
  - 🖱️ **Air Mouse & Trackpad Mode:** Multi-touch trackpad with single-finger pointer, tap-to-click, two-finger right click, two-finger smooth scrolling, pinch-to-zoom, drag-lock, and an **Air Mouse gyro pointer** with a deadman clutch button (hold to aim in the air, release to reposition).
  - 🏎️ **Gyro Motion Controller Mode:**
    - **Racing Steering Wheel:** Realistic rotating steering wheel HUD synchronized to phone tilt/roll (`gamma`), digital degrees readout (-90° to +90°), neutral center calibration button, deadzone filtering, and tactile throttle/brake pedals.
    - **Flight Sim 6-DOF Mode:** Artificial horizon with dynamic pitch ladder (beta), roll indicator (gamma), and compass rose (yaw/alpha).
  - 🎛️ **Macro & Media Deck:** 16+ preconfigured tiles for media playback, volume controls, OBS streaming/recording, Discord mute/deafen, screenshot capture, Alt+Tab, and a custom shortcut creator.
- **Ultra-Low Latency Wi-Fi Pairing (<15ms input lag):**
  - Instant pairing via automatically generated **QR Code** or manual LAN IP.
  - Zero-install web mode: Scan the QR code and play directly in Safari/Chrome on iOS and Android.
  - Real-time round-trip latency HUD monitor (Ping/Pong RTT in milliseconds).
- **AMOLED Decoupled CSS Variable Theme Engine:**
  - Pure AMOLED pitch-black (`#000000`) for maximum OLED battery savings during gaming.
  - Neon Cyan (`#00f0ff`), Cyber Purple (`#b026ff`), Deep Emerald (`#00ff88`), and Solar Amber palettes driven by `data-theme` and `data-accent`.
- **DirectInput Hardware Scancode Support:**
  - Emulates hardware keyboard scancodes and mouse inputs via Windows `SendInput` API, bypassing virtual key hooks for native DirectX/DirectInput game and emulator compatibility.
  - Optional ViGEmBus / `vgamepad` support for native virtual Xbox 360 controller emulation.
- **Cross-Platform & Native Ready:**
  - React 19 + TypeScript + Vite.
  - Capacitor wrapped for native Android (SDK 24+) and iOS deployment.
  - Screen WakeLock integration keeps the display awake during intense gameplay sessions.

---

## 🏗️ Architecture

```
+-------------------------------------------------------------+
|                     SMARTPHONE CLIENT                       |
|   React + Vite + TypeScript + Capacitor Mobile App          |
|                                                             |
|  [Gamepad]    [Air Mouse/Trackpad]    [Gyro Wheel]  [Macro] |
|       |                 |                  |           |    |
|  +----+-----------------+------------------+-----------+--+ |
|  | Motion Service (DeviceOrientation / DeviceMotion APIs) | |
|  | - Low-Pass EMA Smoothing Filter                        | |
|  | - Center Neutral Calibration & Offset Alignment       | |
|  | - requestAnimationFrame Throttling (60-120 FPS)        | |
|  +--------------------------------------------------------+ |
|  | Network Service: Full-Duplex WebSocket Client          | |
+--+--------------------------------------------------------+-+
                            |
           Local Wi-Fi (<15ms RTT WebSockets)
                            |
+---------------------------v---------------------------------+
|                      HOST PC RECEIVER                       |
|                                                             |
|  1. Node.js WebSocket Daemon + Express Host (Port 8765)     |
|     - LAN IPv4 Auto-Discovery                               |
|     - Terminal & Dashboard QR Code Generator                |
|     - Real-Time PC Dashboard & Controller Input Visualizer  |
|                                                             |
|  2. Windows Input Execution Bridge (server/input_bridge.py) |
|     - DirectInput Hardware Scancodes (ctypes user32.dll)   |
|     - Sub-pixel Mouse Movement & Click Dispatcher           |
|     - Optional vgamepad (ViGEmBus Virtual Xbox 360)         |
+-------------------------------------------------------------+
```

---

## 🚀 Quick Start (Instant 1-Command Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (Node v24 recommended)
- Python 3.8+ (for Windows input simulation)

### 1. Start the Host Server
In the root directory, simply run:
```bash
npm start
```
Or run the standalone Windows executable:
```bash
.\server\dist\ZeroAxisPad-Host.exe
```

This will:
1. Detect your PC's local Wi-Fi IPv4 address (e.g. `http://192.168.1.100:8765`).
2. Print a terminal QR code.
3. Launch the Windows DirectInput bridge.
4. Host the **PC Receiver Dashboard** at `http://localhost:8765/dashboard`.

### 2. Connect Your Smartphone
- **Zero-Install Web Mode:** Open your phone camera, scan the QR code on your PC screen, and tap to open the web app.
- **Manual Pairing:** Open any mobile browser to `http://<your-pc-ip>:8765/app`.
- **Capacitor Native App:** Open the app and enter your PC's local IP address in the Settings tab.

---

## 🎮 Controller Profiles & Usage

### 1. Gamepad Mode
- **Dual Analog Sticks:** Smooth 360-degree floating joysticks with spring-back physics and double-tap L3/R3 support.
- **8-Way D-Pad:** Cross pad supporting cardinal directions and diagonals.
- **ABXY Face Buttons:** Classic diamond layout with responsive haptic feedback.
- **Triggers & Bumpers:** L1/LB, R1/RB buttons and L2/LT, R2/RT triggers with live percentage fill gauges.
- **Motion Steering Toggle:** Tap the **GYRO** button in the center to enable phone tilt steering while in Gamepad mode.

### 2. Air Mouse & Trackpad Mode
- **1-Finger Drag:** Moves PC mouse cursor with sub-pixel precision.
- **1-Finger Tap:** Left mouse click.
- **2-Finger Tap:** Right mouse click.
- **2-Finger Drag:** Smooth vertical and horizontal scrolling.
- **Pinch Gesture:** Zoom in and out.
- **Air Mouse (Gyro Pointer):** Toggle on and hold the **CLUTCH BUTTON** to steer the cursor by pointing the phone in the air. Release to reposition your hand.

### 3. Gyro Motion Controller Mode
- **Racing Steering Wheel:** Rotate your phone like a real steering wheel. Phone roll (`gamma`) maps directly to analog steering axis `[-1.0, 1.0]`. Includes tactile Gas and Brake pedals.
- **Center Button (0°):** Tap to instantly recalibrate your current hand orientation as neutral center.
- **Flight Sim 6-DOF Mode:** Displays a dual-axis artificial horizon with pitch ladder and compass telemetry.

### 4. Macro & Media Deck
- **Audio & Media:** Play/Pause, Next Track, Previous Track, Volume +, Volume -, Mute.
- **Streaming & Gaming:** OBS Record/Stream, Discord Mic Mute (`Ctrl+Shift+M`), Discord Deafen (`Ctrl+Shift+D`), Screenshot (`Win+Shift+S`), Xbox Game Bar (`Win+G`).
- **Custom Shortcut Creator:** Add any key combination (e.g., `Ctrl+Alt+T`, `Win+R`, `F5`) saved persistently in local storage.

---

## 📱 Compiling Native Android & iOS Apps (Capacitor)

The mobile client is fully configured with Capacitor:

```bash
cd client

# Build the web bundle
npm run build

# Add native platforms (requires Android Studio / Xcode)
npx cap add android
npx cap add ios

# Sync web assets to native projects
npx cap sync

# Open in Android Studio or Xcode
npx cap open android
npx cap open ios
```

---

## 🛠️ Project Structure

```
controller/
├── client/                     # Frontend Mobile Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Gamepad/        # Joysticks, DPad, ActionButtons, Triggers
│   │   │   ├── Trackpad/       # Multi-touch surface & Air Mouse clutch
│   │   │   ├── Gyro/           # Steering wheel & Flight horizon HUD
│   │   │   ├── MacroDeck/      # Shortcut tiles & Custom macro modal
│   │   │   ├── Settings/       # Host IP, Theme & Haptic controls
│   │   │   └── NavigationHeader.tsx
│   │   ├── services/
│   │   │   ├── motionService.ts   # DeviceOrientation/Motion hook & filter
│   │   │   ├── networkService.ts  # Low-latency WebSocket client
│   │   │   └── hapticsService.ts  # Capacitor Haptics & Vibration fallback
│   │   ├── types/
│   │   ├── App.tsx             # Root layout & mode router
│   │   └── index.css           # AMOLED CSS-variable theme engine
│   ├── capacitor.config.ts     # Capacitor native configuration
│   └── package.json
│
├── server/                     # Host Receiver (PC side)
│   ├── server.js               # Node.js WebSocket daemon & Pairing dashboard
│   ├── input_bridge.py         # DirectInput hardware scancode dispatcher
│   ├── standalone_server.py    # Pure Python alternative receiver
│   ├── dist/
│   │   └── ZeroAxisPad-Host.exe # Standalone Windows Executable
│   └── package.json
│
├── package.json                # Root workflow scripts
├── LICENSE                     # MIT License
└── README.md                   # Documentation & User Guide
```

---

## 🔒 Privacy & Open Source Guarantee

- **100% Free & Open-Source:** Licensed under the MIT License.
- **Zero Telemetry:** No tracking, no external network requests, no accounts.
- **Local-First:** All communication remains strictly between your phone and your PC over your private Wi-Fi network.

