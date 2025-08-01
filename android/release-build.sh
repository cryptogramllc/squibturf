#!/bin/bash

# SquibTurf Android Release Build Script
echo "🚀 Building SquibTurf for Play Store release..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean

# Build release APK
echo "🔨 Building release APK..."
./gradlew assembleGeneralRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Release build successful!"
    echo "📱 APK location: android/app/build/outputs/apk/general/release/app-general-release.apk"
    echo "📦 Bundle location: android/app/build/outputs/bundle/generalRelease/app-general-release.aab"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Upload the .aab file to Google Play Console"
    echo "2. Fill in app details, screenshots, and description"
    echo "3. Set up content rating"
    echo "4. Configure pricing and distribution"
    echo "5. Submit for review"
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi 