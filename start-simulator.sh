#!/bin/bash

echo "🎮 Starting Arcade Hardware Simulator"
echo "====================================="

# Check if simulator directory exists
if [ ! -d "simulator" ]; then
    echo "❌ Simulator directory not found!"
    exit 1
fi

# Install simulator dependencies if needed
if [ ! -d "simulator/node_modules" ]; then
    echo "📦 Installing simulator dependencies..."
    cd simulator
    npm install
    cd ..
fi

echo ""
echo "🚀 Starting interactive simulator..."
echo "   This terminal will be used for simulator interaction"
echo ""

cd simulator
node index.js
