"""
AEROGUARD 3D - Unified Multi-Agent System Launcher
Starts all 3 modules concurrently:
  1. Python AI Agent Service (LangGraph, LangChain, Gemini) on port 8000
  2. Node.js Simulation Backend (Express, Socket.IO) on port 4000
  3. React 3D Digital Twin Frontend (Vite) on port 5173
Handles unified logging, health checks, and graceful termination.
"""

import os
import sys
import time
import signal
import threading
import subprocess
from pathlib import Path

# Enable ANSI colors in Windows terminal if supported
if os.name == "nt":
    os.system("")

ROOT_DIR = Path(__file__).resolve().parent
AI_DIR = ROOT_DIR / "ai_service"
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

COLOR_AI = "\033[95m"       # Magenta
COLOR_BACKEND = "\033[96m"  # Cyan
COLOR_FRONT = "\033[92m"    # Green
COLOR_SYSTEM = "\033[93m"   # Yellow
COLOR_RED = "\033[91m"      # Red
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"

processes: list[subprocess.Popen] = []
shutdown_event = threading.Event()

def log_stream(proc: subprocess.Popen, prefix: str, color: str):
    """Streams lines from a process stdout/stderr with a colored prefix."""
    try:
        if proc.stdout:
            for line in proc.stdout:
                if shutdown_event.is_set():
                    break
                clean_line = line.rstrip()
                if clean_line:
                    print(f"{color}{prefix}{COLOR_RESET} {clean_line}", flush=True)
    except Exception:
        pass

def kill_proc_tree(pid: int):
    """Terminates process and all child processes cleanly."""
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            pass

def cleanup():
    """Shuts down all child processes."""
    shutdown_event.set()
    print(f"\n{COLOR_SYSTEM}[SYSTEM] Shutting down AEROGUARD 3D services...{COLOR_RESET}")
    for p in processes:
        if p.poll() is None:
            try:
                kill_proc_tree(p.pid)
            except Exception:
                pass
def free_ports(ports=(8000, 4000, 5173)):
    """Kills any previous stray processes listening on the target ports."""
    if os.name == "nt":
        ports_str = ",".join(str(p) for p in ports)
        cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {ports_str} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"'
        try:
            subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            time.sleep(1.5)
        except Exception:
            pass

def main():
    free_ports()

    print(f"""
{COLOR_BOLD}{COLOR_SYSTEM}======================================================================
  AEROGUARD 3D - Autonomous Drone Corridor Surveillance System
  NH-44 Corridor: Krishnagiri -> Shoolagiri -> Kurubarapalli -> Perandapalli -> Hosur
======================================================================{COLOR_RESET}
  * AI Service     : {COLOR_AI}http://127.0.0.1:8000{COLOR_RESET} (FastAPI + LangGraph + Gemini)
  * Backend Engine : {COLOR_BACKEND}http://localhost:4000{COLOR_RESET} (Express + Socket.IO Sim)
  * Frontend Twin  : {COLOR_FRONT}http://localhost:5173{COLOR_RESET} (Vite + Three.js / MapLibre)
======================================================================
    """)

    # 1. Start AI Agent Service (Python FastAPI)
    print(f"{COLOR_SYSTEM}[LAUNCHER] Starting Python AI Service (Port 8000)...{COLOR_RESET}")
    venv_python = ROOT_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
    python_cmd = str(venv_python) if venv_python.exists() else sys.executable
    p_ai = subprocess.Popen(
        [python_cmd, "-m", "uvicorn", "ai_service.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=False
    )
    processes.append(p_ai)
    t_ai = threading.Thread(target=log_stream, args=(p_ai, "[AI-AGENT]", COLOR_AI), daemon=True)
    t_ai.start()

    time.sleep(1.0)

    # 2. Start Backend Simulation Engine
    print(f"{COLOR_SYSTEM}[LAUNCHER] Starting Backend Simulation Server (Port 4000)...{COLOR_RESET}")
    npm_bin = "npm.cmd" if os.name == "nt" else "npm"
    p_backend = subprocess.Popen(
        f"{npm_bin} run dev",
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True
    )
    processes.append(p_backend)
    t_backend = threading.Thread(target=log_stream, args=(p_backend, "[BACKEND ]", COLOR_BACKEND), daemon=True)
    t_backend.start()

    time.sleep(1.0)

    # 3. Start Frontend Dashboard
    print(f"{COLOR_SYSTEM}[LAUNCHER] Starting Frontend Digital Twin (Port 5173)...{COLOR_RESET}")
    p_frontend = subprocess.Popen(
        f"{npm_bin} run dev",
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True
    )
    processes.append(p_frontend)
    t_frontend = threading.Thread(target=log_stream, args=(p_frontend, "[FRONTEND]", COLOR_FRONT), daemon=True)
    t_frontend.start()

    print(f"\n{COLOR_SYSTEM}[SYSTEM] All 3 modules spawned! Press Ctrl+C to stop all services.{COLOR_RESET}\n")

    def sig_handler(sig, frame):
        cleanup()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, sig_handler)

    try:
        while True:
            # Check if any process died unexpectedly
            for p, name, col in [(p_ai, "AI Agent", COLOR_AI), (p_backend, "Backend", COLOR_BACKEND), (p_frontend, "Frontend", COLOR_FRONT)]:
                code = p.poll()
                if code is not None:
                    print(f"{COLOR_RED}[WARNING] {name} exited with status code {code}{COLOR_RESET}")
            time.sleep(1.0)
    except KeyboardInterrupt:
        cleanup()
        sys.exit(0)

if __name__ == "__main__":
    main()
