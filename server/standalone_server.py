"""
ZeroAxisPad — Standalone Python Host Server
Pure Python option for running the controller receiver with zero Node.js dependency.
Handles HTTP pairing endpoint and WebSocket input execution using standard Python.
"""

import sys
import os
import json
import time
import socket
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Import input bridge functions
import input_bridge

PORT = int(os.environ.get('PORT', 8765))

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

LAN_IP = get_lan_ip()

class OpenRelayHTTPHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/', '/api/status'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            status_data = {
                "server": "ZeroAxisPad Standalone Python",
                "lan_ip": LAN_IP,
                "port": PORT,
                "ws_url": f"ws://{LAN_IP}:{PORT}/ws",
                "vgamepad": input_bridge.has_vgamepad
            }
            self.wfile.write(json.dumps(status_data).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/input':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                input_bridge.process_command(body)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

def main():
    print("======================================================")
    print("   ZeroAxisPad Python Standalone Server               ")
    print(f"   LAN Address: http://{LAN_IP}:{PORT}              ")
    print(f"   Input Driver: Windows ctypes DirectInput           ")
    print("======================================================")
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, OpenRelayHTTPHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Python server...")
        httpd.server_close()

if __name__ == '__main__':
    main()
