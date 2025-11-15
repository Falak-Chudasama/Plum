import subprocess
import os
import sys

service_dir = os.path.dirname(os.path.abspath(__file__))

cmd = [
    sys.executable,
    "-m",
    "uvicorn",
    "app:app",
    "--host", "127.0.0.2",
    "--port", "4070",
    "--reload"
]

subprocess.run(cmd, cwd=service_dir)