#!/bin/bash

# Development startup guide for Arcade Middleware + Simulator

echo "🎮 Arcade Development Environment Setup"
echo "======================================"

echo ""
echo "For the best interactive experience, you need TWO terminals:"
echo ""
echo "� STEP 1: Start the Simulator (Terminal 1)"
echo "   ./start-simulator.sh"
echo ""
echo "� STEP 2: Start the Middleware (Terminal 2)"
echo "   ./start-middleware.sh"
echo ""
echo "🎯 Why two terminals?"
echo "   • Simulator needs interactive keyboard input"
echo "   • Middleware shows logs and status"
echo "   • You can see both running simultaneously"
echo ""
echo "🚀 Quick Start:"
echo "   1. Open a new terminal and run: ./start-simulator.sh"
echo "   2. Come back here and run: ./start-middleware.sh"
echo ""
echo "� Alternative: Use your IDE's terminal split feature"
echo ""

read -p "Press Enter to start middleware in this terminal (make sure simulator is running first)..."

echo ""
echo "� Starting Arcade Middleware..."
npm run start:dev
