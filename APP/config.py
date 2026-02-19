"""
LifeOS Configuration
Contains all color schemes, fonts, and layout constants from the web version
"""

# ========== COLOR SCHEME ==========
# Exact colors from the web version CSS

# Backgrounds
BG_MAIN = "#0b0f1a"
BG_SECONDARY = "#10162a"
BG_TERTIARY = "#151c3b"

# Text Colors
TEXT_PRIMARY = "#f2f4ff"
TEXT_SECONDARY = "#a1a6c8"
TEXT_MUTED = "#6f7499"

# Neon Gradient Colors (Cyan → Blue → Purple)
ACCENT_CYAN = "#27f5ff"
ACCENT_BLUE = "#4d7cff"
ACCENT_PURPLE = "#9b4dff"
ACCENT_GLOW = "rgba(79, 124, 255, 0.35)"

# Status Colors
SUCCESS = "#30d158"
WARNING = "#ffd60a"
DANGER = "#ff453a"

# UI Elements
BORDER_COLOR = "#1a1f35"  # Approximation of rgba(255, 255, 255, 0.08)
HOVER_BG = "#151a30"  # Approximation of rgba(255, 255, 255, 0.04)

# ========== LAYOUT CONSTANTS ==========
SIDEBAR_WIDTH = 260
HEADER_HEIGHT = 70
WINDOW_WIDTH = 1400
WINDOW_HEIGHT = 900

# ========== TYPOGRAPHY ==========
FONT_HEADING = "Segoe UI"  # Windows alternative to Outfit
FONT_BODY = "Segoe UI"  # Windows alternative to Inter
FONT_SIZE_NORMAL = 15
FONT_SIZE_HEADING = 24
FONT_SIZE_SUBHEADING = 18
FONT_SIZE_SMALL = 13

# ========== SPACING ==========
RADIUS_SM = 10
RADIUS_MD = 16
RADIUS_LG = 22

PADDING_SM = 8
PADDING_MD = 16
PADDING_LG = 24

# ========== DATABASE PATHS ==========
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_DIR = os.path.join(BASE_DIR, "database")
TASKS_DB_PATH = os.path.join(DATABASE_DIR, "tasks.json")
NOTES_DIR = os.path.join(DATABASE_DIR, "notes")

# Ensure directories exist
os.makedirs(DATABASE_DIR, exist_ok=True)
os.makedirs(NOTES_DIR, exist_ok=True)
