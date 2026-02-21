# Vercel Serverless Handler
# Exposes Flask app for Vercel Python runtime
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import app
