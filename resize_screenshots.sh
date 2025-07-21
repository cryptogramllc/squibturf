#!/bin/bash

# Create output directory
mkdir -p app_store_screenshots

# Dimensions for iPhone 6.7" and 6.9" displays
DIMENSIONS=("1320x2868" "2868x1320" "1290x2796" "2796x1290")

# Process all PNG files in current directory
for file in *.png; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # Create resized versions for each dimension
        for dim in "${DIMENSIONS[@]}"; do
            # Parse dimensions
            width=$(echo $dim | cut -d'x' -f1)
            height=$(echo $dim | cut -d'x' -f2)
            
            # Create output filename
            base_name=$(basename "$file" .png)
            output_file="app_store_screenshots/${base_name}_${dim}.png"
            
            # Resize image
            sips -z $height $width "$file" --out "$output_file"
            echo "  Created: $output_file"
        done
    fi
done

echo "All screenshots resized and saved to app_store_screenshots/ directory" 