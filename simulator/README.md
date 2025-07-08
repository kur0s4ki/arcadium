# 🎮 Arcade Hardware Simulator

Interactive console application that simulates arcade hardware for development testing.

## Purpose

This simulator replaces real arcade hardware during development, allowing you to:
- Test the complete middleware workflow without physical hardware
- Manually trigger events (timer expiration, game completion)
- Enter custom scores interactively
- See visual feedback of all hardware commands

## Quick Start

1. **Install dependencies:**
   ```bash
   cd simulator
   npm install
   ```

2. **Start the simulator:**
   ```bash
   npm start
   ```

3. **Configure middleware for simulation mode:**
   - Set `mode: "SIM"` in `src/config/global.json`
   - Start your middleware - it will automatically connect to the simulator

## How It Works

### Connection
- Simulator listens on **TCP port 9999**
- Middleware connects as a TCP client
- All serial commands are sent over TCP instead of real serial port

### Interactive Controls

Once connected, you can:

**1️⃣ Send Custom Scores**
- Enter scores manually: `150,0,300,75`
- Or press Enter for random scores
- Simulates arcade machine sending final scores

**2️⃣ Trigger Room Timer Expired**
- Simulates room timer reaching zero
- Middleware should stop games and collect scores

**3️⃣ Trigger All Games Complete**
- Simulates all 4 games being finished
- Middleware should stop timers and collect scores

**4️⃣ Show Current State**
- Displays current room state (lights, latch, games, timers)

**5️⃣ Clear Screen**
- Clears console for better visibility

**0️⃣ Exit**
- Shuts down simulator

### Visual Feedback

The simulator shows:
- 📨 **Incoming commands** from middleware (LIGHT_ON, START_ARCADES, etc.)
- 📤 **Outgoing events** to middleware (scores, timer events)
- 📊 **Current state** (lights, latch, games, timers)
- 🎨 **Color-coded output** for easy reading

## Example Session

```
🎮 ARCADE HARDWARE SIMULATOR
============================
🔌 Middleware connected!

📨 [RECEIVED] LIGHT_ON
💡 Room lights turned ON

📨 [RECEIVED] OPEN_LATCH  
🚪 Access latch OPENED

📨 [RECEIVED] START_ARCADES:4
🎮 Arcades STARTED (max 4 games)
⏱️  Room and game timers STARTED

📊 CURRENT STATE:
   💡 Lights: ON
   🚪 Latch: OPEN
   🎮 Arcades: RUNNING
   ⏱️  Timers: ACTIVE
   🎯 Max Games: 4

🎛️  SIMULATOR CONTROLS:
   1️⃣  Send custom scores
   2️⃣  Trigger room timer expired
   3️⃣  Trigger all games complete
   4️⃣  Show current state
   5️⃣  Clear screen
   0️⃣  Exit simulator

> 1
🎯 Enter scores for 4 games (or press Enter for random):
   Format: game1,game2,game3,game4 (e.g., 150,0,300,75)
Scores> 200,0,150,300
📤 [SENT] SCORES_RECEIVED:{"game1":200,"game2":0,"game3":150,"game4":300}
📊 Sent scores: {"game1":200,"game2":0,"game3":150,"game4":300}
```

## Switching Back to Real Hardware

When ready for real hardware testing:

1. **Change mode in config:**
   ```json
   {
     "mode": "PROD",
     "hardware": {
       "serialType": "REAL"
     }
   }
   ```

2. **Restart middleware** - it will use real serial ports instead of TCP

3. **Remove simulator** (optional):
   ```bash
   rm -rf simulator/
   ```

## Technical Details

- **Language:** Node.js with ES6+
- **Dependencies:** chalk (colors), readline (input)
- **Protocol:** TCP socket on port 9999
- **Format:** Same as real serial (newline-terminated commands)
- **Reconnection:** Automatic reconnection if middleware restarts

## Troubleshooting

**Simulator won't start:**
- Check if port 9999 is available
- Run `npm install` in simulator directory

**Middleware won't connect:**
- Ensure `mode: "SIM"` in config
- Check simulator is running first
- Verify port 9999 is not blocked by firewall

**Commands not working:**
- Check console for error messages
- Verify TCP connection is established
- Restart both simulator and middleware
