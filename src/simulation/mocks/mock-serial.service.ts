import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, timer } from 'rxjs';
import { 
  SerialControlService, 
  GameScores, 
  SerialCommand 
} from '../../hardware/interfaces/serial-control.interface';

@Injectable()
export class MockSerialService implements SerialControlService {
  private readonly log = new Logger(MockSerialService.name);
  private roomTimerExpired$ = new Subject<void>();
  private allGamesComplete$ = new Subject<void>();
  private scoresReceived$ = new Subject<GameScores>();
  
  private roomTimerActive = false;
  private gameSessionActive = false;

  // Room control commands
  async turnOnLighting(): Promise<void> {
    this.log.log(`🔆 [MOCK] ${SerialCommand.TURN_ON_LIGHTING} - Room lighting turned on`);
  }

  async turnOffLighting(): Promise<void> {
    this.log.log(`🔅 [MOCK] ${SerialCommand.TURN_OFF_LIGHTING} - Room lighting turned off`);
  }

  async openAccessLatch(): Promise<void> {
    this.log.log(`🚪 [MOCK] ${SerialCommand.OPEN_ACCESS} - Access latch opened`);
  }

  async closeAccessLatch(): Promise<void> {
    this.log.log(`🔒 [MOCK] ${SerialCommand.CLOSE_ACCESS} - Access latch closed`);
  }

  // Game control commands
  async startArcades(maxGames: number): Promise<void> {
    this.log.log(`🎮 [MOCK] ${SerialCommand.START_ARCADES}:${maxGames} - Arcades started with max ${maxGames} games`);
    this.gameSessionActive = true;
    this.startRoomTimer();
    this.simulateGameSession();
  }

  async stopArcades(): Promise<void> {
    this.log.log(`⏹️ [MOCK] ${SerialCommand.STOP_ARCADES} - Arcades stopped`);
    this.gameSessionActive = false;
  }

  async stopTimers(): Promise<void> {
    this.log.log(`⏱️ [MOCK] ${SerialCommand.STOP_TIMERS} - All timers stopped`);
    this.roomTimerActive = false;
  }

  // Display commands
  async displayInstructions(instructions: string): Promise<void> {
    this.log.log(`📋 [MOCK] ${SerialCommand.DISPLAY_INSTRUCTIONS}:${instructions} - Instructions displayed`);
  }

  async showWin(): Promise<void> {
    this.log.log(`🏆 [MOCK] ${SerialCommand.SHOW_WIN} - Win animation displayed`);
  }

  async showLoss(): Promise<void> {
    this.log.log(`😞 [MOCK] ${SerialCommand.SHOW_LOSS} - Loss animation displayed`);
  }

  async showJackpotAnimation(): Promise<void> {
    this.log.log(`💰 [MOCK] ${SerialCommand.JACKPOT_ANIMATION} - Jackpot animation displayed`);
  }

  async celebrate(): Promise<void> {
    this.log.log(`🎉 [MOCK] ${SerialCommand.CELEBRATE} - Celebration effects activated`);
  }

  // Access control
  async sendAccessDenied(): Promise<void> {
    this.log.log(`❌ [MOCK] ${SerialCommand.ACCESS_DENIED} - Access denied message sent`);
  }

  // Event monitoring
  onRoomTimerExpired(): Observable<void> {
    return this.roomTimerExpired$.asObservable();
  }

  onAllGamesComplete(): Observable<void> {
    return this.allGamesComplete$.asObservable();
  }

  onScoresReceived(): Observable<GameScores> {
    return this.scoresReceived$.asObservable();
  }

  // Simulation helpers
  private startRoomTimer() {
    this.roomTimerActive = true;
    // Simulate room timer expiring after 5 minutes (300 seconds)
    timer(300000).subscribe(() => {
      if (this.roomTimerActive) {
        this.log.log('🕐 [MOCK] Room timer expired (5 minutes)');
        this.roomTimerExpired$.next();
      }
    });
  }

  private simulateGameSession() {
    // Simulate a game session that completes after 2-4 minutes
    const sessionDuration = Math.random() * 120000 + 120000; // 2-4 minutes
    
    timer(sessionDuration).subscribe(() => {
      if (this.gameSessionActive) {
        this.log.log('🎮 [MOCK] All games completed');
        this.allGamesComplete$.next();
        
        // Simulate receiving scores after a short delay
        timer(2000).subscribe(() => {
          this.simulateScores();
        });
      }
    });
  }

  private simulateScores() {
    // Generate random scores for simulation
    const scores: GameScores = {
      game1: Math.floor(Math.random() * 1000),
      game2: Math.floor(Math.random() * 1000),
      game3: Math.floor(Math.random() * 1000),
      game4: Math.floor(Math.random() * 1000),
    };

    // Sometimes simulate all zeros (team lost)
    if (Math.random() < 0.2) {
      scores.game1 = scores.game2 = scores.game3 = scores.game4 = 0;
    }

    // Sometimes simulate jackpot scores
    if (Math.random() < 0.1) {
      scores.game1 = 5000; // Jackpot score
    }

    this.log.log(`📊 [MOCK] Simulated scores: ${JSON.stringify(scores)}`);
    this.scoresReceived$.next(scores);
  }
}
