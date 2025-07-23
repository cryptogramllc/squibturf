#!/bin/bash

# App Store Screenshot Organizer
# This script renames screenshots with descriptive names and orders them by importance

echo "📱 App Store Screenshot Organizer"
echo "=================================="

# Create organized directory
mkdir -p appstore_screenshots_organized

echo "📸 Renaming and organizing screenshots..."

# Based on typical app flow, here's the suggested order and naming:
# 1. Main Feed (most important - shows the core social experience)
# 2. Camera Interface (shows creation feature)
# 3. My Squibs (shows personal content)
# 4. Login/Signup (shows onboarding)
# 5. Additional feature (if needed)

# Rename and copy files in order of importance
# You can adjust these names based on what each screenshot actually shows

echo "1️⃣ Main Feed (Primary social experience)"
cp "appstore_screenshots/Simulator Screenshot - iPhone 16 - 2025-07-21 at 22.00.06_portrait.png" "appstore_screenshots_organized/01_Main_Feed.png"

echo "2️⃣ Camera Interface (Content creation)"
cp "appstore_screenshots/Simulator Screenshot - iPhone 16 - 2025-07-21 at 22.00.42_portrait.png" "appstore_screenshots_organized/02_Camera_Interface.png"

echo "3️⃣ My Squibs (Personal content)"
cp "appstore_screenshots/Simulator Screenshot - iPhone 16 - 2025-07-21 at 21.59.57_portrait.png" "appstore_screenshots_organized/03_My_Squibs.png"

echo "4️⃣ Login/Signup (Onboarding)"
cp "appstore_screenshots/Screenshot_2025-07-21_10.42.49_portrait.png" "appstore_screenshots_organized/04_Login_Signup.png"

echo "5️⃣ Additional Feature"
cp "appstore_screenshots/Simulator Screenshot - iPhone 16 - 2025-07-21 at 22.00.50_portrait.png" "appstore_screenshots_organized/05_Additional_Feature.png"

echo ""
echo "✅ Screenshots organized and renamed!"
echo "📁 Check 'appstore_screenshots_organized' folder"
echo ""

# Show the organized files
echo "📋 Organized Screenshots (in upload order):"
ls -la appstore_screenshots_organized/

echo ""
echo "💡 Upload Order for App Store:"
echo "   1. 01_Main_Feed.png - Shows your core social experience"
echo "   2. 02_Camera_Interface.png - Shows content creation"
echo "   3. 03_My_Squibs.png - Shows personal content"
echo "   4. 04_Login_Signup.png - Shows onboarding"
echo "   5. 05_Additional_Feature.png - Shows additional features"
echo ""
echo "🎯 Tips:"
echo "   • Upload in this exact order (01, 02, 03, 04, 05)"
echo "   • First screenshot is most important - it appears first in App Store"
echo "   • You can skip 05 if you only want 4 screenshots"
echo "   • Rename files if they don't match the content shown" 