#!/usr/bin/env python3
"""
Process Party Palace logo: remove background and optimize for web
"""

from PIL import Image
import os

# This will be the path to your logo
input_file = "party-palace-logo.png"
output_file = "logo.png"

print("Processing Party Palace logo...")

# Check if input file exists
if not os.path.exists(input_file):
    print(f"[ERROR] {input_file} not found!")
    print("Please save your logo as 'party-palace-logo.png' in the project directory")
    exit(1)

# Open the image
img = Image.open(input_file)
print(f"[OK] Loaded image: {img.size[0]}x{img.size[1]} pixels")

# Convert to RGBA if not already
img = img.convert("RGBA")

# Get image data
datas = img.getdata()

# Create new image data with transparent background
new_data = []
for item in datas:
    # Check if pixel is close to white/light gray (background)
    # Change all white/light pixels (above threshold) to transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        # Make it transparent
        new_data.append((255, 255, 255, 0))
    else:
        # Keep the original pixel
        new_data.append(item)

# Update image data
img.putdata(new_data)

# Save as PNG with transparency
img.save(output_file, "PNG")
print(f"[OK] Saved transparent logo: {output_file}")

# Also create an optimized web version
web_size = (400, 400)
img_web = img.resize(web_size, Image.Resampling.LANCZOS)
img_web.save("logo-optimized.png", "PNG", optimize=True)
print(f"[OK] Saved optimized version: logo-optimized.png ({web_size[0]}x{web_size[1]})")

print("\n[SUCCESS] Logo processing complete!")
print("Files created:")
print("  - logo.png (full size, transparent)")
print("  - logo-optimized.png (400x400, optimized for web)")
