#!/bin/bash

# App Store Screenshot Resizer
# This script resizes screenshots to the correct App Store dimensions

echo "📱 App Store Screenshot Resizer"
echo "================================"

# Create output directory
mkdir -p appstore_screenshots

# iPhone 16 dimensions (6.7 inch display)
# Portrait: 1290 x 2796
# Landscape: 2796 x 1290

# Get all screenshots from desktop
SCREENSHOTS=(
    "Screenshot 2025-07-21 at 10.42.49 PM.png"
    "Simulator Screenshot - iPhone 16 - 2025-07-21 at 21.59.57.png"
    "Simulator Screenshot - iPhone 16 - 2025-07-21 at 22.00.06.png"
    "Simulator Screenshot - iPhone 16 - 2025-07-21 at 22.00.42.png"
    "Simulator Screenshot - iPhone 16 - 2025-07-21 at 22.00.50.png"
)

# App Store screenshot dimensions
PORTRAIT_WIDTH=1290
PORTRAIT_HEIGHT=2796

echo "📸 Processing screenshots..."

for screenshot in "${SCREENSHOTS[@]}"; do
    if [ -f "$HOME/Desktop/$screenshot" ]; then
        echo "Processing: $screenshot"
        
        # Get original dimensions
        ORIGINAL_DIMS=$(sips -g pixelWidth -g pixelHeight "$HOME/Desktop/$screenshot" | tail -2 | awk '{print $2}')
        ORIGINAL_WIDTH=$(echo "$ORIGINAL_DIMS" | head -1)
        ORIGINAL_HEIGHT=$(echo "$ORIGINAL_DIMS" | tail -1)
        
        echo "  Original size: ${ORIGINAL_WIDTH}x${ORIGINAL_HEIGHT}"
        
        # Determine if it's portrait or landscape
        if [ "$ORIGINAL_HEIGHT" -gt "$ORIGINAL_WIDTH" ]; then
            # Portrait - resize to 1290x2796
            echo "  Resizing to portrait: ${PORTRAIT_WIDTH}x${PORTRAIT_HEIGHT}"
            sips -z $PORTRAIT_HEIGHT $PORTRAIT_WIDTH "$HOME/Desktop/$screenshot" --out "appstore_screenshots/${screenshot%.*}_portrait.png"
        else
            # Landscape - resize to 2796x1290
            echo "  Resizing to landscape: ${PORTRAIT_HEIGHT}x${PORTRAIT_WIDTH}"
            sips -z $PORTRAIT_WIDTH $PORTRAIT_HEIGHT "$HOME/Desktop/$screenshot" --out "appstore_screenshots/${screenshot%.*}_landscape.png"
        fi
        
        echo "  ✅ Saved to: appstore_screenshots/"
    else
        echo "❌ File not found: $screenshot"
    fi
done

echo ""
echo "🎉 Screenshot processing complete!"
echo "📁 Check the 'appstore_screenshots' folder for your resized images"
echo ""
echo "📋 App Store Requirements:"
echo "   • iPhone 16: 1290 x 2796 pixels (portrait)"
echo "   • iPhone 16 Plus: 1290 x 2796 pixels (portrait)"
echo "   • iPhone 16 Pro: 1290 x 2796 pixels (portrait)"
echo "   • iPhone 16 Pro Max: 1290 x 2796 pixels (portrait)"
echo ""
echo "💡 Tips for App Store submission:"
echo "   • Use 3-5 screenshots that showcase key features"
echo "   • First screenshot should be your app icon or main feature"
echo "   • Include screenshots of:"
echo "     - Main feed/Turf page"
echo "     - Camera interface"
echo "     - My Squibs page"
echo "     - Login/signup flow"
echo "     - Any unique features" 