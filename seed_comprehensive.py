#!/usr/bin/env python
"""
Convenience wrapper to run seed_comprehensive.py from project root.
Run from: d:\QLDA\KPINoiBo\

Usage:
  python seed_comprehensive.py --help
  python seed_comprehensive.py
  python seed_comprehensive.py --clean
  python seed_comprehensive.py --count 200
"""

import subprocess
import sys
import os

# Change to backend directory
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
os.chdir(backend_dir)

# Run the actual seed script
result = subprocess.run([sys.executable, "seed_comprehensive.py"] + sys.argv[1:])
sys.exit(result.returncode)
