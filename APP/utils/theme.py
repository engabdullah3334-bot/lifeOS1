"""
Theme Utilities
Provides theme application and color manipulation functions
"""

import customtkinter as ctk
from config import *


def apply_theme():
    """Apply the neon dark theme to customtkinter"""
    ctk.set_appearance_mode("dark")
    
    # Custom theme colors
    ctk.set_default_color_theme("blue")  # Base theme
    
    # We'll override colors in individual widgets


def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    """Convert RGB tuple to hex color"""
    return '#{:02x}{:02x}{:02x}'.format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def lighten_color(hex_color, factor=0.2):
    """Lighten a hex color by a factor (0-1)"""
    rgb = hex_to_rgb(hex_color)
    new_rgb = tuple(min(255, int(c + (255 - c) * factor)) for c in rgb)
    return rgb_to_hex(new_rgb)


def darken_color(hex_color, factor=0.2):
    """Darken a hex color by a factor (0-1)"""
    rgb = hex_to_rgb(hex_color)
    new_rgb = tuple(max(0, int(c * (1 - factor))) for c in rgb)
    return rgb_to_hex(new_rgb)


def create_gradient_steps(color1, color2, steps=10):
    """Create a list of colors transitioning from color1 to color2"""
    rgb1 = hex_to_rgb(color1)
    rgb2 = hex_to_rgb(color2)
    
    gradient = []
    for i in range(steps):
        ratio = i / (steps - 1)
        r = int(rgb1[0] + (rgb2[0] - rgb1[0]) * ratio)
        g = int(rgb1[1] + (rgb2[1] - rgb1[1]) * ratio)
        b = int(rgb1[2] + (rgb2[2] - rgb1[2]) * ratio)
        gradient.append(rgb_to_hex((r, g, b)))
    
    return gradient
