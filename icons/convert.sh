#!/bin/bash

# Convert icon.svg to PNG format in required sizes for Chrome extension
# Usage: ./convert.sh

echo "Converting icon.svg to PNG format..."

# Check if icon.svg exists
if [ ! -f "icon.svg" ]; then
    echo "Error: icon.svg not found in current directory"
    exit 1
fi

# Convert to different sizes
echo "Creating icon-16.png..."
rsvg-convert -h 16 -w 16 icon.svg -o icon-16.png

echo "Creating icon-32.png..."
rsvg-convert -h 32 -w 32 icon.svg -o icon-32.png

echo "Creating icon-48.png..."
rsvg-convert -h 48 -w 48 icon.svg -o icon-48.png

echo "Creating icon-128.png..."
rsvg-convert -h 128 -w 128 icon.svg -o icon-128.png

echo "Done! Created PNG icons in sizes: 16, 32, 48, 128"
echo "Files created:"
ls -la icon-*.png