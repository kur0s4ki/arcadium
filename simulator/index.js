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
      maxGames: 0,
      instructions: '',
      roomTimerActive: false,
      gameTimerActive: false
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
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
        this.handleCommand(data.toString().trim());
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
      console.log(chalk.blue('🚀 Arcade Hardware Simulator listening on port 9999'));
      console.log(chalk.gray('   Configure middleware to connect to: localhost:9999'));
    });
  }

  showWelcome() {
    console.clear();
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║                🎮 ARCADE HARDWARE SIMULATOR 🎮               ║
║                                                              ║
║  This simulates the arcade machine and room hardware         ║
║  for development testing without real hardware.              ║
║                                                              ║
║  Waiting for middleware connection on port 9999...          ║
╚══════════════════════════════════════════════════════════════╝
    `));
  }

  handleCommand(command) {
    console.log(chalk.magenta(`📨 [RECEIVED] ${command}`));
    
    const [cmd, param] = command.split(':');
    
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
        this.state.arcadesRunning = true;
        this.state.maxGames = parseInt(param) || 4;
        this.state.roomTimerActive = true;
        this.state.gameTimerActive = true;
        console.log(chalk.green(`🎮 Arcades STARTED (max ${this.state.maxGames} games)`));
        console.log(chalk.blue('⏱️  Room and game timers STARTED'));
        break;
        
      case 'STOP_ARCADES':
        this.state.arcadesRunning = false;
        console.log(chalk.red('🎮 Arcades STOPPED'));
        break;
        
      case 'STOP_TIMERS':
        this.state.roomTimerActive = false;
        this.state.gameTimerActive = false;
        console.log(chalk.red('⏱️  All timers STOPPED'));
        break;
        
      case 'DISPLAY_INSTRUCTIONS':
        this.state.instructions = param || '';
        console.log(chalk.cyan(`📋 Instructions displayed: "${this.state.instructions}"`));
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
        console.log(chalk.rainbow('🎉 CELEBRATION effects displayed'));
        break;
        
      default:
        console.log(chalk.red(`❓ Unknown command: ${command}`));
    }
    
    this.showCurrentState();
    this.showMenu();
  }

  showCurrentState() {
    console.log(chalk.white('\n📊 CURRENT STATE:'));
    console.log(`   💡 Lights: ${this.state.lightsOn ? chalk.green('ON') : chalk.gray('OFF')}`);
    console.log(`   🚪 Latch: ${this.state.latchOpen ? chalk.green('OPEN') : chalk.red('CLOSED')}`);
    console.log(`   🎮 Arcades: ${this.state.arcadesRunning ? chalk.green('RUNNING') : chalk.gray('STOPPED')}`);
    console.log(`   ⏱️  Timers: ${this.state.roomTimerActive ? chalk.blue('ACTIVE') : chalk.gray('STOPPED')}`);
    if (this.state.maxGames > 0) {
      console.log(`   🎯 Max Games: ${chalk.cyan(this.state.maxGames)}`);
    }
    if (this.state.instructions) {
      console.log(`   📋 Instructions: ${chalk.cyan(this.state.instructions)}`);
    }
  }

  showMenu() {
    if (!this.client) return;
    
    console.log(chalk.white('\n🎛️  SIMULATOR CONTROLS:'));
    console.log('   1️⃣  Send custom scores');
    console.log('   2️⃣  Trigger room timer expired');
    console.log('   3️⃣  Trigger all games complete');
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
        this.promptForScores();
        break;
      case '2':
        this.sendRoomTimerExpired();
        break;
      case '3':
        this.sendAllGamesComplete();
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

  promptForScores() {
    console.log(chalk.cyan('\n🎯 Enter scores for 4 games (or press Enter for random):'));
    console.log(chalk.gray('   Format: game1,game2,game3,game4 (e.g., 150,0,300,75)'));
    
    this.rl.question(chalk.white('Scores> '), (input) => {
      let scores;
      
      if (!input.trim()) {
        // Generate random scores
        scores = {
          game1: Math.floor(Math.random() * 500),
          game2: Math.floor(Math.random() * 500),
          game3: Math.floor(Math.random() * 500),
          game4: Math.floor(Math.random() * 500)
        };
        console.log(chalk.yellow('🎲 Generated random scores'));
      } else {
        const parts = input.split(',').map(s => parseInt(s.trim()) || 0);
        scores = {
          game1: parts[0] || 0,
          game2: parts[1] || 0,
          game3: parts[2] || 0,
          game4: parts[3] || 0
        };
      }
      
      this.sendScores(scores);
    });
  }

  sendScores(scores) {
    const message = `SCORES_RECEIVED:${JSON.stringify(scores)}`;
    this.sendToMiddleware(message);
    console.log(chalk.green(`📊 Sent scores: ${JSON.stringify(scores)}`));
    this.showMenu();
  }

  sendRoomTimerExpired() {
    this.sendToMiddleware('ROOM_TIMER_EXPIRED');
    console.log(chalk.red('⏰ Sent: Room timer expired'));
    this.state.roomTimerActive = false;
    this.showMenu();
  }

  sendAllGamesComplete() {
    this.sendToMiddleware('ALL_GAMES_COMPLETE');
    console.log(chalk.blue('🎮 Sent: All games complete'));
    this.state.arcadesRunning = false;
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
