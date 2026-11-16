"""
ZeroAxisPad — Windows Input Execution Bridge
High-performance DirectInput ScanCode and Mouse API dispatcher using Python ctypes.
Runs as a child process communicating over stdin/stdout JSON lines, with zero external dependencies.
"""

import sys
import json
import time
import ctypes
from ctypes import wintypes

# Windows API Constants
INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
INPUT_HARDWARE = 2

MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_HWHEEL = 0x1000

KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008

# Hardware Scan Codes for DirectInput Game Compatibility
# These bypass virtual key hooks and are recognized directly by DirectX / games / emulators.
SCAN_CODES = {
    # Letters
    'a': 0x1E, 'b': 0x30, 'c': 0x2E, 'd': 0x20, 'e': 0x12, 'f': 0x21,
    'g': 0x22, 'h': 0x23, 'i': 0x17, 'j': 0x24, 'k': 0x25, 'l': 0x26,
    'm': 0x32, 'n': 0x31, 'o': 0x18, 'p': 0x19, 'q': 0x10, 'r': 0x13,
    's': 0x1F, 't': 0x14, 'u': 0x16, 'v': 0x2F, 'w': 0x11, 'x': 0x2D,
    'y': 0x15, 'z': 0x2C,
    # Numbers
    '0': 0x0B, '1': 0x02, '2': 0x03, '3': 0x04, '4': 0x05,
    '5': 0x06, '6': 0x07, '7': 0x08, '8': 0x09, '9': 0x0A,
    # Function Keys
    'f1': 0x3B, 'f2': 0x3C, 'f3': 0x3D, 'f4': 0x3E, 'f5': 0x3F, 'f6': 0x40,
    'f7': 0x41, 'f8': 0x42, 'f9': 0x43, 'f10': 0x44, 'f11': 0x57, 'f12': 0x58,
    # Modifiers & Navigation
    'escape': 0x01, 'esc': 0x01,
    'space': 0x39,
    'enter': 0x1C, 'return': 0x1C,
    'backspace': 0x0E,
    'tab': 0x0F,
    'shift': 0x2A, 'lshift': 0x2A, 'rshift': 0x36,
    'ctrl': 0x1D, 'lctrl': 0x1D, 'rctrl': 0x1D,
    'alt': 0x38, 'lalt': 0x38, 'ralt': 0x38,
    'win': 0x5B, 'super': 0x5B,
    # Arrows (Extended Keys)
    'up': 0x48,
    'down': 0x50,
    'left': 0x4B,
    'right': 0x4D,
}

# Virtual Key Codes for Media & Special Keys
VK_CODES = {
    'volume_mute': 0xAD,
    'volume_down': 0xAE,
    'volume_up': 0xAF,
    'next_track': 0xB0,
    'prev_track': 0xB1,
    'play_pause': 0xB3,
    'stop': 0xB2,
}

# Virtual Gamepad bindings to DirectInput keys for games without ViGEmBus
# Left Stick -> WASD
# D-pad -> Arrow Keys
# A -> Space, B -> C, X -> R, Y -> F
# LB -> Q, RB -> E, LT -> Right Click, RT -> Left Click
DEFAULT_GAMEPAD_MAPPINGS = {
    'ls_up': 'w',
    'ls_down': 's',
    'ls_left': 'a',
    'ls_right': 'd',
    'dpad_up': 'up',
    'dpad_down': 'down',
    'dpad_left': 'left',
    'dpad_right': 'right',
    'a': 'space',
    'b': 'c',
    'x': 'r',
    'y': 'f',
    'lb': 'q',
    'rb': 'e',
    'select': 'tab',
    'start': 'escape',
    'l3': 'shift',
    'r3': 'ctrl',
}

# Setup ctypes Windows structures
class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG)),
    ]

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG)),
    ]

class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD),
    ]

class INPUT_UNION(ctypes.Union):
    _fields_ = [
        ("mi", MOUSEINPUT),
        ("ki", KEYBDINPUT),
        ("hi", HARDWAREINPUT),
    ]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type", wintypes.DWORD),
        ("union", INPUT_UNION),
    ]

LPINPUT = ctypes.POINTER(INPUT)
SendInput = ctypes.windll.user32.SendInput
SendInput.argtypes = (wintypes.UINT, LPINPUT, ctypes.c_int)
SendInput.restype = wintypes.UINT

# Check optional virtual gamepad (vgamepad)
has_vgamepad = False
vg_gamepad = None
try:
    import vgamepad as vg
    vg_gamepad = vg.VX360Gamepad()
    has_vgamepad = True
except Exception:
    has_vgamepad = False

# Active pressed keys tracker
currently_pressed_keys = set()
# Active stick keys
active_stick_keys = set()
# Sub-pixel mouse accumulator
subpixel_x = 0.0
subpixel_y = 0.0

def send_scancode(scancode, key_up=False, extended=False):
    """Send DirectInput hardware scancode using SendInput"""
    flags = KEYEVENTF_SCANCODE
    if key_up:
        flags |= KEYEVENTF_KEYUP
    if extended or scancode in (0x48, 0x50, 0x4B, 0x4D, 0x5B):
        flags |= KEYEVENTF_EXTENDEDKEY

    inp = INPUT()
    inp.type = INPUT_KEYBOARD
    inp.union.ki = KEYBDINPUT(0, scancode, flags, 0, None)
    SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

def send_vk(vk_code, key_up=False):
    """Send Windows Virtual Key code (for media keys)"""
    flags = 0
    if key_up:
        flags |= KEYEVENTF_KEYUP

    inp = INPUT()
    inp.type = INPUT_KEYBOARD
    inp.union.ki = KEYBDINPUT(vk_code, 0, flags, 0, None)
    SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

def key_down(key_name):
    key_name = key_name.lower()
    if key_name in currently_pressed_keys:
        return
    currently_pressed_keys.add(key_name)

    if key_name in SCAN_CODES:
        send_scancode(SCAN_CODES[key_name], key_up=False)
    elif key_name in VK_CODES:
        send_vk(VK_CODES[key_name], key_up=False)

def key_up(key_name):
    key_name = key_name.lower()
    if key_name in currently_pressed_keys:
        currently_pressed_keys.remove(key_name)

    if key_name in SCAN_CODES:
        send_scancode(SCAN_CODES[key_name], key_up=True)
    elif key_name in VK_CODES:
        send_vk(VK_CODES[key_name], key_up=True)

def tap_key(key_name):
    key_down(key_name)
    time.sleep(0.015)
    key_up(key_name)

def mouse_move(dx, dy):
    global subpixel_x, subpixel_y
    subpixel_x += dx
    subpixel_y += dy

    move_x = int(subpixel_x)
    move_y = int(subpixel_y)

    if move_x != 0 or move_y != 0:
        subpixel_x -= move_x
        subpixel_y -= move_y

        inp = INPUT()
        inp.type = INPUT_MOUSE
        inp.union.mi = MOUSEINPUT(move_x, move_y, 0, MOUSEEVENTF_MOVE, 0, None)
        SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

def mouse_button(button, action):
    button = button.lower()
    down_flag = 0
    up_flag = 0

    if button == 'left':
        down_flag = MOUSEEVENTF_LEFTDOWN
        up_flag = MOUSEEVENTF_LEFTUP
    elif button == 'right':
        down_flag = MOUSEEVENTF_RIGHTDOWN
        up_flag = MOUSEEVENTF_RIGHTUP
    elif button == 'middle':
        down_flag = MOUSEEVENTF_MIDDLEDOWN
        up_flag = MOUSEEVENTF_MIDDLEUP

    if action == 'down':
        inp = INPUT()
        inp.type = INPUT_MOUSE
        inp.union.mi = MOUSEINPUT(0, 0, 0, down_flag, 0, None)
        SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    elif action == 'up':
        inp = INPUT()
        inp.type = INPUT_MOUSE
        inp.union.mi = MOUSEINPUT(0, 0, 0, up_flag, 0, None)
        SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    elif action == 'click':
        inp_down = INPUT()
        inp_down.type = INPUT_MOUSE
        inp_down.union.mi = MOUSEINPUT(0, 0, 0, down_flag, 0, None)

        inp_up = INPUT()
        inp_up.type = INPUT_MOUSE
        inp_up.union.mi = MOUSEINPUT(0, 0, 0, up_flag, 0, None)

        SendInput(1, ctypes.byref(inp_down), ctypes.sizeof(INPUT))
        time.sleep(0.01)
        SendInput(1, ctypes.byref(inp_up), ctypes.sizeof(INPUT))

def mouse_scroll(dx, dy):
    if dy != 0:
        inp = INPUT()
        inp.type = INPUT_MOUSE
        # Wheel scroll delta
        inp.union.mi = MOUSEINPUT(0, 0, int(dy), MOUSEEVENTF_WHEEL, 0, None)
        SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

    if dx != 0:
        inp = INPUT()
        inp.type = INPUT_MOUSE
        inp.union.mi = MOUSEINPUT(0, 0, int(dx), MOUSEEVENTF_HWHEEL, 0, None)
        SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

def execute_macro(keys):
    """Press all keys in combination and release in reverse"""
    for k in keys:
        key_down(k)
        time.sleep(0.01)
    time.sleep(0.03)
    for k in reversed(keys):
        key_up(k)

def update_gamepad(msg):
    global vg_gamepad, has_vgamepad, active_stick_keys

    # Check if native ViGEmBus Xbox 360 controller is available
    if has_vgamepad and vg_gamepad:
        try:
            bm = msg.get('bm', 0)
            lx = max(-1.0, min(1.0, msg.get('lx', 0.0)))
            ly = max(-1.0, min(1.0, msg.get('ly', 0.0)))
            rx = max(-1.0, min(1.0, msg.get('rx', 0.0)))
            ry = max(-1.0, min(1.0, msg.get('ry', 0.0)))
            lt = max(0.0, min(1.0, msg.get('lt', 0.0)))
            rt = max(0.0, min(1.0, msg.get('rt', 0.0)))

            # Analog sticks: vgamepad uses float [-1.0, 1.0]
            vg_gamepad.left_joystick_float(x_value_float=lx, y_value_float=-ly)
            vg_gamepad.right_joystick_float(x_value_float=rx, y_value_float=-ry)

            # Triggers: [0.0, 1.0]
            vg_gamepad.left_trigger_float(value_float=lt)
            vg_gamepad.right_trigger_float(value_float=rt)

            # Buttons bitmask
            # 0: A, 1: B, 2: X, 3: Y, 4: LB, 5: RB, 6: L3, 7: R3
            # 8: Up, 9: Down, 10: Left, 11: Right, 12: Select, 13: Start, 14: Guide
            btn_map = [
                (1 << 0, vg.XUSB_BUTTON.XUSB_GAMEPAD_A),
                (1 << 1, vg.XUSB_BUTTON.XUSB_GAMEPAD_B),
                (1 << 2, vg.XUSB_BUTTON.XUSB_GAMEPAD_X),
                (1 << 3, vg.XUSB_BUTTON.XUSB_GAMEPAD_Y),
                (1 << 4, vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER),
                (1 << 5, vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER),
                (1 << 6, vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB),
                (1 << 7, vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB),
                (1 << 8, vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP),
                (1 << 9, vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN),
                (1 << 10, vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT),
                (1 << 11, vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT),
                (1 << 12, vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK),
                (1 << 13, vg.XUSB_BUTTON.XUSB_GAMEPAD_START),
                (1 << 14, vg.XUSB_BUTTON.XUSB_GAMEPAD_GUIDE),
            ]

            for mask, vg_btn in btn_map:
                if bm & mask:
                    vg_gamepad.press_button(button=vg_btn)
                else:
                    vg_gamepad.release_button(button=vg_btn)

            vg_gamepad.update()
            return
        except Exception as e:
            # Fall back to keyboard emulation on error
            pass

    # DirectInput Keyboard/Mouse fallback
    bm = msg.get('bm', 0)
    lx = msg.get('lx', 0.0)
    ly = msg.get('ly', 0.0)
    lt = msg.get('lt', 0.0)
    rt = msg.get('rt', 0.0)

    # Process Left Stick to WASD
    needed_stick_keys = set()
    stick_deadzone = 0.25
    if ly < -stick_deadzone: needed_stick_keys.add(DEFAULT_GAMEPAD_MAPPINGS['ls_up'])
    if ly > stick_deadzone: needed_stick_keys.add(DEFAULT_GAMEPAD_MAPPINGS['ls_down'])
    if lx < -stick_deadzone: needed_stick_keys.add(DEFAULT_GAMEPAD_MAPPINGS['ls_left'])
    if lx > stick_deadzone: needed_stick_keys.add(DEFAULT_GAMEPAD_MAPPINGS['ls_right'])

    # Release unneeded stick keys
    for k in active_stick_keys - needed_stick_keys:
        key_up(k)
    # Press newly needed stick keys
    for k in needed_stick_keys - active_stick_keys:
        key_down(k)
    active_stick_keys = needed_stick_keys

    # Process Buttons
    button_checks = [
        (1 << 0, DEFAULT_GAMEPAD_MAPPINGS['a']),
        (1 << 1, DEFAULT_GAMEPAD_MAPPINGS['b']),
        (1 << 2, DEFAULT_GAMEPAD_MAPPINGS['x']),
        (1 << 3, DEFAULT_GAMEPAD_MAPPINGS['y']),
        (1 << 4, DEFAULT_GAMEPAD_MAPPINGS['lb']),
        (1 << 5, DEFAULT_GAMEPAD_MAPPINGS['rb']),
        (1 << 6, DEFAULT_GAMEPAD_MAPPINGS['l3']),
        (1 << 7, DEFAULT_GAMEPAD_MAPPINGS['r3']),
        (1 << 8, DEFAULT_GAMEPAD_MAPPINGS['dpad_up']),
        (1 << 9, DEFAULT_GAMEPAD_MAPPINGS['dpad_down']),
        (1 << 10, DEFAULT_GAMEPAD_MAPPINGS['dpad_left']),
        (1 << 11, DEFAULT_GAMEPAD_MAPPINGS['dpad_right']),
        (1 << 12, DEFAULT_GAMEPAD_MAPPINGS['select']),
        (1 << 13, DEFAULT_GAMEPAD_MAPPINGS['start']),
    ]

    for mask, key in button_checks:
        if bm & mask:
            key_down(key)
        else:
            key_up(key)

    # Triggers: LT = right click, RT = left click
    if lt > 0.5:
        mouse_button('right', 'down')
    else:
        mouse_button('right', 'up')

    if rt > 0.5:
        mouse_button('left', 'down')
    else:
        mouse_button('left', 'up')

def process_command(line):
    try:
        cmd = json.loads(line)
        t = cmd.get('t')

        if t == 'mm':
            # Mouse move
            mouse_move(cmd.get('dx', 0), cmd.get('dy', 0))
        elif t == 'mb':
            # Mouse button
            mouse_button(cmd.get('b', 'left'), cmd.get('a', 'click'))
        elif t == 'ms':
            # Mouse scroll
            mouse_scroll(cmd.get('dx', 0), cmd.get('dy', 0))
        elif t == 'gp':
            # Gamepad state
            update_gamepad(cmd)
        elif t == 'macro':
            # Macro combination
            keys = cmd.get('keys', [])
            execute_macro(keys)
        elif t == 'motion':
            # Raw motion steering or flight
            st = cmd.get('st', 0.0) # steering value [-1.0, 1.0]
            if abs(st) > 0.05:
                # Steer left or right
                if st < 0:
                    key_down(DEFAULT_GAMEPAD_MAPPINGS['ls_left'])
                    key_up(DEFAULT_GAMEPAD_MAPPINGS['ls_right'])
                else:
                    key_down(DEFAULT_GAMEPAD_MAPPINGS['ls_right'])
                    key_up(DEFAULT_GAMEPAD_MAPPINGS['ls_left'])
            else:
                key_up(DEFAULT_GAMEPAD_MAPPINGS['ls_left'])
                key_up(DEFAULT_GAMEPAD_MAPPINGS['ls_right'])
        elif t == 'status':
            print(json.dumps({
                "status": "ok",
                "vgamepad": has_vgamepad,
                "os": "windows"
            }), flush=True)
    except Exception as e:
        # Avoid crashing bridge process on malformed line
        pass

def main():
    # Notify host that bridge is active
    init_msg = {
        "status": "ready",
        "has_vgamepad": has_vgamepad,
        "os": "windows"
    }
    print(json.dumps(init_msg), flush=True)

    # Listen on stdin line by line
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        if line == 'exit' or line == 'quit':
            break
        process_command(line)

    # Clean up pressed keys on exit
    for k in list(currently_pressed_keys):
        key_up(k)

if __name__ == '__main__':
    main()
