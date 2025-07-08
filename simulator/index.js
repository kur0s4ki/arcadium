#!/usr/bin/env node

const net = require('net');
const readline = require('readline');
const chalk = require('chalk');

class ArcadeHardwareSimulator {
  constructor() {
    this.server = null;
    this.client = null;
    this.state = {
      lightsOn: false,
      latchOpen: false,
      arcadesRunning: false,
      timersRunning: false,
      instructions: '',
      roomTimerActive: false,
      gameTimerActive: false,
      sessionActive: false, // Track if middleware has an active session
      roomDurationMinutes: 0,
      timeRemainingSeconds: 0,
    };
    this.roomTimer = null;
    this.teamData = null; // Will store actual team data from middleware

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.setupServer();
    this.showWelcome();
  }

  setupServer() {
    this.server = net.createServer((socket) => {
      this.client = socket;
      console.log(chalk.green('🔌 Middleware connected!'));
      this.showCurrentState();
      this.showMenu();

      socket.on('data', (data) => {
        const commands = data.toString().trim().split('\n');
        commands.forEach((command) => {
          if (command.trim()) {
            this.handleCommand(command.trim());
          }
        });
      });

      socket.on('close', () => {
        console.log(chalk.yellow('📡 Middleware disconnected'));
        this.client = null;
      });

      socket.on('error', (err) => {
        console.log(chalk.red(`❌ Socket error: ${err.message}`));
      });
    });

    this.server.listen(9999, () => {
      console.log(
        chalk.blue('🚀 Arcade Hardware Simulator listening on port 9999'),
      );
      console.log(
        chalk.gray('   Configure middleware to connect to: localhost:9999'),
      );
    });
  }

  showWelcome() {
    console.clear();
    console.log(
      chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║                🎮 ARCADE HARDWARE SIMULATOR 🎮               ║
║                                                              ║
║  This simulates the arcade machine and room hardware         ║
║  for development testing without real hardware.              ║
║                                                              ║
║  Waiting for middleware connection on port 9999...          ║
╚══════════════════════════════════════════════════════════════╝
    `),
    );
  }

  handleCommand(command) {
    console.log(chalk.magenta(`📨 [RECEIVED] ${command}`));

    // Split only on the first colon to handle JSON data properly
    const colonIndex = command.indexOf(':');
    const cmd = colonIndex !== -1 ? command.substring(0, colonIndex) : command;
    const param =
      colonIndex !== -1 ? command.substring(colonIndex + 1) : undefined;

    switch (cmd) {
      case 'LIGHT_ON':
        this.state.lightsOn = true;
        console.log(chalk.yellow('💡 Room lights turned ON'));
        break;

      case 'LIGHT_OFF':
        this.state.lightsOn = false;
        console.log(chalk.gray('💡 Room lights turned OFF'));
        break;

      case 'OPEN_LATCH':
        this.state.latchOpen = true;
        console.log(chalk.green('🚪 Access latch OPENED'));
        break;

      case 'CLOSE_LATCH':
        this.state.latchOpen = false;
        console.log(chalk.red('🚪 Access latch CLOSED'));
        break;

      case 'START_ARCADES':
        this.handleStartArcades(param);
        break;

      case 'STOP_ARCADES':
        this.state.arcadesRunning = false;
        console.log(chalk.red('🎮 Arcades STOPPED'));
        break;

      case 'STOP_TIMERS':
        // Stop the automatic timer
        if (this.roomTimer) {
          clearInterval(this.roomTimer);
          this.roomTimer = null;
        }
        this.state.roomTimerActive = false;
        this.state.gameTimerActive = false;
        this.state.sessionActive = false;
        this.state.timeRemainingSeconds = 0;
        console.log(chalk.red('⏱️  All timers STOPPED'));

        // Terminate session when middleware sends stop command
        this.terminateSessionFromMiddleware();
        break;

      case 'DISPLAY_INSTRUCTIONS':
        this.state.instructions = param || '';
        console.log(
          chalk.cyan(`📋 Instructions displayed: "${this.state.instructions}"`),
        );
        break;

      case 'ACCESS_DENIED':
        console.log(chalk.red.bold('🚫 ACCESS DENIED displayed'));
        break;

      case 'SHOW_WIN':
        console.log(chalk.green.bold('🏆 WIN animation displayed'));
        break;

      case 'SHOW_LOSS':
        console.log(chalk.red.bold('😞 LOSS animation displayed'));
        break;

      case 'JACKPOT_ANIMATION':
        console.log(chalk.yellow.bold('💰 JACKPOT animation displayed'));
        break;

      case 'CELEBRATE':
        console.log(chalk.magenta('🎉 CELEBRATION effects displayed'));
        break;

      case 'TEAM_DATA':
        this.handleTeamData(param);
        break;

      default:
        console.log(chalk.red(`❓ Unknown command: ${command}`));
    }

    this.showCurrentState();
    this.showMenu();
  }

  handleTeamData(param) {
    try {
      this.teamData = JSON.parse(param);
      console.log(chalk.green(`🏷️ Badge IDs received for simulation`));
      console.log(
        chalk.gray(
          `   Players: ${this.teamData.players
            .map((p) => `${p.badgeId} (Player ${p.position})`)
            .join(', ')}`,
        ),
      );
    } catch (error) {
      console.error(chalk.red('❌ Error parsing team data:', error.message));
      this.teamData = null;
    }
  }

  getPlayerCount() {
    if (this.teamData && this.teamData.players) {
      return this.teamData.players.length;
    }
    return 4; // Default fallback
  }

  handleStartArcades(param) {
    // Parse parameter: just duration in minutes
    const durationMinutes = parseInt(param) || 5; // Default 5 minutes

    this.state.arcadesRunning = true;
    this.state.sessionActive = true;
    this.state.roomDurationMinutes = durationMinutes;
    this.state.timeRemainingSeconds = durationMinutes * 60;
    this.state.roomTimerActive = true;
    this.state.gameTimerActive = true;

    console.log(chalk.green(`🎮 Arcades STARTED (${durationMinutes} minutes)`));
    console.log(chalk.blue('⏱️  Room and game timers STARTED'));

    // Start the countdown timer
    this.startRoomTimer();
  }

  startRoomTimer() {
    if (this.roomTimer) {
      clearInterval(this.roomTimer);
    }

    this.roomTimer = setInterval(() => {
      this.state.timeRemainingSeconds--;

      // Update display every 30 seconds or in last 10 seconds
      const remaining = this.state.timeRemainingSeconds;
      if (remaining % 30 === 0 || remaining <= 10) {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        console.log(
          chalk.yellow(
            `⏰ Time remaining: ${minutes}:${seconds
              .toString()
              .padStart(2, '0')}`,
          ),
        );
      }

      // Timer expired
      if (remaining <= 0) {
        this.handleTimerExpired();
      }
    }, 1000);
  }

  handleTimerExpired() {
    if (this.roomTimer) {
      clearInterval(this.roomTimer);
      this.roomTimer = null;
    }

    this.state.roomTimerActive = false;
    this.state.gameTimerActive = false;
    this.state.timeRemainingSeconds = 0;

    console.log(
      chalk.red('⏰ ROOM TIMER EXPIRED - Sending automatic timer expiration'),
    );
    this.sendToMiddleware('ROOM_TIMER_EXPIRED');
  }

  showCurrentState() {
    console.log(chalk.white('\n📊 CURRENT STATE:'));
    console.log(
      `   💡 Lights: ${
        this.state.lightsOn ? chalk.green('ON') : chalk.gray('OFF')
      }`,
    );
    console.log(
      `   🚪 Latch: ${
        this.state.latchOpen ? chalk.green('OPEN') : chalk.red('CLOSED')
      }`,
    );
    console.log(
      `   🎮 Arcades: ${
        this.state.arcadesRunning
          ? chalk.green('RUNNING')
          : chalk.gray('STOPPED')
      }`,
    );
    console.log(
      `   ⏱️  Timers: ${
        this.state.roomTimerActive
          ? chalk.blue('ACTIVE')
          : chalk.gray('STOPPED')
      }`,
    );

    if (this.state.roomDurationMinutes > 0) {
      console.log(
        `   ⏱️  Duration: ${chalk.cyan(
          this.state.roomDurationMinutes,
        )} minutes`,
      );
    }
    if (this.state.timeRemainingSeconds > 0) {
      const minutes = Math.floor(this.state.timeRemainingSeconds / 60);
      const seconds = this.state.timeRemainingSeconds % 60;
      console.log(
        `   ⏰ Time Left: ${chalk.yellow(
          `${minutes}:${seconds.toString().padStart(2, '0')}`,
        )}`,
      );
    }
    if (this.state.instructions) {
      console.log(`   📋 Instructions: ${chalk.cyan(this.state.instructions)}`);
    }
  }

  showMenu() {
    if (!this.client) return;

    console.log(chalk.white('\n🎛️  SIMULATOR CONTROLS:'));

    if (this.state.sessionActive) {
      const playerCount = this.getPlayerCount();
      console.log(`   1️⃣  Send custom scores (${playerCount} players)`);
      console.log(`   2️⃣  Send random scores (no jackpots)`);
      console.log('   3️⃣  Trigger timer expired');
    } else {
      console.log(chalk.gray('   1️⃣  Send custom scores (session required)'));
      console.log(chalk.gray('   2️⃣  Send random scores (session required)'));
      console.log(
        chalk.gray('   3️⃣  Trigger timer expired (session required)'),
      );
    }

    console.log('   4️⃣  Show current state');
    console.log('   5️⃣  Clear screen');
    console.log('   0️⃣  Exit simulator');
    console.log(chalk.gray('   Type number and press Enter...'));

    this.rl.question(chalk.white('\n> '), (answer) => {
      this.handleUserInput(answer.trim());
    });
  }

  handleUserInput(input) {
    switch (input) {
      case '1':
        if (this.state.sessionActive) {
          this.promptForCustomScores();
        } else {
          console.log(chalk.red('❌ Cannot send scores - no active session'));
          this.showMenu();
        }
        break;
      case '2':
        if (this.state.sessionActive) {
          this.sendRandomScores();
        } else {
          console.log(chalk.red('❌ Cannot send scores - no active session'));
          this.showMenu();
        }
        break;
      case '3':
        if (this.state.sessionActive) {
          this.sendRoomTimerExpired();
        } else {
          console.log(
            chalk.red('❌ Cannot trigger timer expired - no active session'),
          );
          this.showMenu();
        }
        break;
      case '4':
        this.showCurrentState();
        this.showMenu();
        break;
      case '5':
        console.clear();
        this.showCurrentState();
        this.showMenu();
        break;
      case '0':
        this.exit();
        break;
      default:
        console.log(chalk.red('❌ Invalid option'));
        this.showMenu();
    }
  }

  promptForCustomScores() {
    const playerCount = this.getPlayerCount();
    const jackpotThreshold = 1000; // From config

    console.log(chalk.cyan(`\n🎯 CUSTOM SCORES (${playerCount} players)`));
    console.log(
      chalk.yellow(`   💰 Jackpot threshold: ${jackpotThreshold}+ points`),
    );
    console.log(chalk.gray('   Enter scores separated by commas'));

    // Get player names if available
    let playerNames = [];
    if (this.teamData && this.teamData.players) {
      playerNames = this.teamData.players.map((p) => p.badgeId);
    } else {
      for (let i = 1; i <= playerCount; i++) {
        playerNames.push(`Player ${i}`);
      }
    }

    console.log(chalk.gray(`   Format: ${playerNames.join(', ')}`));
    console.log(
      chalk.gray(`   Example: 150,300,75${playerCount > 3 ? ',200' : ''}`),
    );

    this.rl.question(chalk.white('Scores> '), (input) => {
      const parts = input.split(',').map((s) => parseInt(s.trim()) || 0);
      const scores = {};

      for (let i = 0; i < 4; i++) {
        scores[`player${i + 1}`] = i < playerCount ? parts[i] || 0 : 0;
      }

      // Show what was entered
      console.log(chalk.green('\n✅ Scores entered:'));
      for (let i = 0; i < playerCount; i++) {
        const score = scores[`player${i + 1}`];
        const isJackpot = score >= jackpotThreshold;
        console.log(
          `   ${playerNames[i]}: ${score} ${
            isJackpot ? chalk.yellow('🎰 JACKPOT') : ''
          }`,
        );
      }

      this.sendScores(scores);
    });
  }

  sendRandomScores() {
    const playerCount = this.getPlayerCount();
    const jackpotThreshold = 1000;

    console.log(
      chalk.cyan(`\n🎲 RANDOM SCORES (${playerCount} players, no jackpots)`),
    );

    const scores = {};
    const playerNames = [];

    // Get player names if available
    if (this.teamData && this.teamData.players) {
      for (let i = 0; i < this.teamData.players.length; i++) {
        playerNames.push(this.teamData.players[i].badgeId);
      }
    } else {
      for (let i = 1; i <= playerCount; i++) {
        playerNames.push(`Player ${i}`);
      }
    }

    // Generate random scores below jackpot threshold
    for (let i = 0; i < 4; i++) {
      if (i < playerCount) {
        // Random score between 0 and jackpotThreshold-1 (no jackpots)
        scores[`player${i + 1}`] = Math.floor(
          Math.random() * (jackpotThreshold - 1),
        );
      } else {
        scores[`player${i + 1}`] = 0;
      }
    }

    // Show generated scores
    console.log(chalk.green('\n✅ Random scores generated:'));
    for (let i = 0; i < playerCount; i++) {
      const score = scores[`player${i + 1}`];
      console.log(`   ${playerNames[i]}: ${score}`);
    }
    console.log(chalk.gray('   ℹ️ No jackpots (all scores below threshold)'));

    this.sendScores(scores);
  }

  sendScores(scores) {
    const message = `SCORES_RECEIVED:${JSON.stringify(scores)}`;
    this.sendToMiddleware(message);
    console.log(chalk.green(`📊 Sent scores: ${JSON.stringify(scores)}`));
    console.log(chalk.gray('⏳ Waiting for middleware to stop session...'));

    // Don't immediately terminate - wait for middleware to send STOP commands
    this.showMenu();
  }

  terminateSession() {
    console.log(chalk.red('🛑 Session terminated - scores sent to middleware'));

    // Stop all timers
    if (this.roomTimer) {
      clearInterval(this.roomTimer);
      this.roomTimer = null;
    }

    // Reset session state
    this.state.sessionActive = false;
    this.state.arcadesRunning = false;
    this.state.roomTimerActive = false;
    this.state.gameTimerActive = false;
    this.state.timeRemainingSeconds = 0;
    this.state.instructions = '';

    console.log(chalk.gray('📊 Arcade session ended - ready for next team'));
    this.showCurrentState();
    this.showMenu();
  }

  terminateSessionFromMiddleware() {
    console.log(
      chalk.green('✅ Session terminated by middleware - ready for next team'),
    );

    // Reset session state (timers already stopped by STOP_TIMERS command)
    this.state.instructions = '';

    console.log(chalk.gray('📊 Arcade session ended - ready for next team'));
    this.showCurrentState();
    this.showMenu();
  }

  sendRoomTimerExpired() {
    // Stop the automatic timer if running
    if (this.roomTimer) {
      clearInterval(this.roomTimer);
      this.roomTimer = null;
    }

    this.state.roomTimerActive = false;
    this.state.gameTimerActive = false;
    this.state.timeRemainingSeconds = 0;

    this.sendToMiddleware('ROOM_TIMER_EXPIRED');
    console.log(chalk.red('⏰ Sent: Manual room timer expiration'));
    this.showMenu();
  }

  sendToMiddleware(message) {
    if (this.client && !this.client.destroyed) {
      this.client.write(message + '\n');
      console.log(chalk.green(`📤 [SENT] ${message}`));
    } else {
      console.log(chalk.red('❌ No middleware connection'));
    }
  }

  exit() {
    console.log(chalk.yellow('\n👋 Shutting down simulator...'));
    if (this.server) {
      this.server.close();
    }
    this.rl.close();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Received SIGINT, shutting down...'));
  process.exit(0);
});

// Start the simulator
new ArcadeHardwareSimulator();
