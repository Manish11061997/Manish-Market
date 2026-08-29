"""
Self-Healing Cloudflare Gateway Tunnel Supervisor Daemon
Continuously manages, verifies, and auto-renews Cloudflare public tunnels.
Automatically propagates active tunnel URLs to frontend/public/config.json, frontend/dist/config.json,
and deploys to Firebase Hosting.
"""

import os
import sys
import time
import json
import re
import subprocess
import threading
import requests
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [TUNNEL_SUPERVISOR] %(message)s'
)
logger = logging.getLogger("tunnel_supervisor")

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
CONFIG_JSON_PUB = os.path.join(FRONTEND_DIR, "public", "config.json")
CONFIG_JSON_DIST = os.path.join(FRONTEND_DIR, "dist", "config.json")
API_JS = os.path.join(FRONTEND_DIR, "src", "utils", "api.js")

class TunnelSupervisor:
    def __init__(self):
        self.process = None
        self.current_url = None
        self.is_running = True

    def update_config_files(self, url):
        """Update public/config.json and dist/config.json with the active tunnel URL."""
        payload = {
            "apiUrl": url,
            "tunnelUrl": url,
            "buildTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "ONLINE"
        }
        
        try:
            os.makedirs(os.path.dirname(CONFIG_JSON_PUB), exist_ok=True)
            with open(CONFIG_JSON_PUB, "w") as f:
                json.dump(payload, f, indent=2)
            logger.info(f"Updated {CONFIG_JSON_PUB}")
        except Exception as e:
            logger.error(f"Failed writing {CONFIG_JSON_PUB}: {e}")

        try:
            if os.path.exists(os.path.dirname(CONFIG_JSON_DIST)):
                with open(CONFIG_JSON_DIST, "w") as f:
                    json.dump(payload, f, indent=2)
                logger.info(f"Updated {CONFIG_JSON_DIST}")
        except Exception as e:
            logger.error(f"Failed writing {CONFIG_JSON_DIST}: {e}")

        try:
            if os.path.exists(API_JS):
                with open(API_JS, "r") as f:
                    content = f.read()
                new_content = re.sub(
                    r"export const LIVE_CLOUDFLARE_URL = '[^']+';",
                    f"export const LIVE_CLOUDFLARE_URL = '{url}';",
                    content
                )
                if new_content != content:
                    with open(API_JS, "w") as f:
                        f.write(new_content)
                    logger.info(f"Updated LIVE_CLOUDFLARE_URL in {API_JS}")
        except Exception as e:
            logger.error(f"Failed updating api.js: {e}")

    def deploy_to_firebase(self):
        """Deploy config.json to Firebase Hosting asynchronously."""
        def _deploy():
            try:
                logger.info("Deploying updated config.json to Firebase Hosting...")
                subprocess.run(
                    ["npx", "-y", "firebase-tools@latest", "deploy", "--only", "hosting"],
                    cwd=FRONTEND_DIR,
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                logger.info("Firebase Hosting deployment completed successfully.")
            except Exception as e:
                logger.error(f"Firebase deployment notice: {e}")

        threading.Thread(target=_deploy, daemon=True).start()

    def start_tunnel(self):
        """Start a fresh cloudflared tunnel process and extract the assigned URL."""
        logger.info("Starting fresh cloudflared quick tunnel...")
        subprocess.run(["pkill", "-f", "cloudflared"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1)

        cmd = [
            "cloudflared", "tunnel",
            "--edge-ip-version", "4",
            "--protocol", "http2",
            "--url", "http://127.0.0.1:8000"
        ]

        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        tunnel_url = None
        start_time = time.time()
        
        while time.time() - start_time < 30:
            line = self.process.stdout.readline()
            if not line:
                time.sleep(0.2)
                continue
            
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if match:
                tunnel_url = match.group(0)
                logger.info(f"Captured active Cloudflare tunnel: {tunnel_url}")
                break

        if not tunnel_url:
            logger.error("Failed to capture tunnel URL within 30s timeout")
            return None

        # Verify edge health
        logger.info(f"Verifying edge connectivity for {tunnel_url}/health...")
        verified = False
        for attempt in range(8):
            time.sleep(2)
            try:
                r = requests.get(f"{tunnel_url}/health", headers={"Bypass-Tunnel-Reminder": "1"}, timeout=5)
                if r.status_code == 200:
                    verified = True
                    logger.info(f"Edge health verified OK: {tunnel_url}")
                    break
            except Exception:
                pass

        if verified:
            self.current_url = tunnel_url
            self.update_config_files(tunnel_url)
            self.deploy_to_firebase()
            return tunnel_url
        else:
            logger.warning(f"Edge verification failed for {tunnel_url}, will retry...")
            return None

    def check_health(self):
        """Check if the current tunnel URL is answering /health."""
        if not self.current_url:
            return False
        try:
            r = requests.get(f"{self.current_url}/health", headers={"Bypass-Tunnel-Reminder": "1"}, timeout=6)
            return r.status_code == 200
        except Exception:
            return False

    def run(self):
        """Main supervisory loop with auto-healing and reconnection."""
        consecutive_failures = 0
        
        while self.is_running:
            if not self.current_url or not self.check_health():
                consecutive_failures += 1
                logger.warning(f"Tunnel health check failed (consecutive failures: {consecutive_failures})")
                
                if consecutive_failures >= 2 or not self.current_url:
                    logger.info("Initiating tunnel auto-recovery...")
                    self.start_tunnel()
                    consecutive_failures = 0
            else:
                consecutive_failures = 0
            
            time.sleep(15)

if __name__ == "__main__":
    supervisor = TunnelSupervisor()
    try:
        supervisor.run()
    except KeyboardInterrupt:
        logger.info("Tunnel supervisor stopped.")
        if supervisor.process:
            supervisor.process.terminate()
