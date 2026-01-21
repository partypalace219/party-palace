#!/usr/bin/env python3
"""
Organize and sort product images by quality
Analyzes image dimensions, file size, and aspect ratio to determine best order
"""

import os
from PIL import Image
from pathlib import Path

SUPABASE_URL = 'https://nsedpvrqhxcikhlieize.supabase.co'
BUCKET_NAME = 'product-images'

# Mapping of folder names to product IDs/names
folder_mapping = {
    'balloon-walls': {'name': 'Balloon Walls', 'prefix': 'wall'},
    'spiral-arch': {'name': 'Spiral Arch', 'prefix': 'spiral'},
    'circle': {'name': 'Circle Arch', 'prefix': 'circle'},
    'L-shaped': {'name': 'L-Shaped Arch', 'prefix': 'shaped'},
    'Vases': {'name': 'Vases', 'prefix': 'vase'},
    'diaper-cake': {'name': 'Diaper Cakes', 'prefix': 'diaper'},
    'medal-centerpieces': {'name': 'Medal Frames', 'prefix': 'metal'},
    'shimmer-wall': {'name': 'Shimmer Walls', 'prefix': 'shimmer'},
    'flower-wall': {'name': 'Flower Walls', 'prefix': 'flower'},
    'organic-arch': {'name': 'Organic Arch', 'prefix': 'organic'},
    'specialty-arch': {'name': 'Specialty Arch', 'prefix': 'specialty'},
    'Columns': {'name': 'Spiral Columns', 'prefix': 'columns'}
}

def analyze_image(file_path):
    """Analyze image and return quality metrics"""
    try:
        img = Image.open(file_path)
        width, height = img.size
        file_size = os.path.getsize(file_path)

        # Calculate quality score (higher is better)
        # Factor in resolution, file size, and aspect ratio
        resolution = width * height
        aspect_ratio = width / height if height > 0 else 1

        # Prefer landscape images (aspect ratio closer to 4:3)
        aspect_score = 1.0 - abs(aspect_ratio - 4/3)

        # Quality score: weighted combination
        quality_score = (resolution * 0.6) + (file_size * 0.3) + (aspect_score * 10000)

        return {
            'width': width,
            'height': height,
            'file_size': file_size,
            'resolution': resolution,
            'aspect_ratio': aspect_ratio,
            'quality_score': quality_score
        }
    except Exception as e:
        print(f"[ERROR] Could not analyze {file_path}: {e}")
        return None

def sort_images_in_folder(folder):
    """Sort images in a folder by quality"""
    if not os.path.exists(folder):
        return []

    files = [f for f in os.listdir(folder) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]

    # Analyze each image
    image_data = []
    for file in files:
        file_path = os.path.join(folder, file)
        metrics = analyze_image(file_path)
        if metrics:
            image_data.append({
                'filename': file,
                'path': file_path,
                **metrics
            })

    # Sort by quality score (descending - best first)
    sorted_images = sorted(image_data, key=lambda x: x['quality_score'], reverse=True)

    return sorted_images

print('// Product Gallery Images from Supabase Storage')
print('// Images sorted by quality: best to worst')
print('const productGalleryImages = {')

for folder, info in folder_mapping.items():
    sorted_images = sort_images_in_folder(folder)

    if not sorted_images:
        continue

    product_name = info['name']
    print(f"    '{product_name}': [")

    for img_info in sorted_images:
        url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{folder}/{img_info['filename']}"
        print(f"        '{url}',  // {img_info['width']}x{img_info['height']}, {img_info['file_size']//1024}KB")

    print('    ],')

print('};')
print()
print('// Helper function to get gallery images for a product')
print('function getProductGalleryImages(productName) {')
print('    return productGalleryImages[productName] || [];')
print('}')
