import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  NFC_READER,
  SENSOR_BUS,
  LED_CONTROL,
  SERIAL_CONTROL,
} from '../hardware/tokens';
import { NfcReaderService } from '../hardware/interfaces/nfc-reader.interface';
import { SensorBusService } from '../hardware/interfaces/sensor-bus.interface';
import {
  LedControlService,
  LedColor,
} from '../hardware/interfaces/led-control.interface';
import {
  SerialControlService,
  GameScores,
} from '../hardware/interfaces/serial-control.interface';
import { ConfigService } from '@nestjs/config';
import { Subscription, Subject, Observable, merge } from 'rxjs';
import { ApiService } from '../api/api.service';
import {
  TeamGameManagerResponse,
  PlayerData,
  TeamScoreRequest,
  PlayerScoreData,
} from '../common/dto/game‑manager.dto';
import * as readline from 'readline';

interface GameResult {
  teamWon: boolean;
  hasJackpot: boolean;
  totalScore: number;
  individualScores: GameScores;
  jackpotThreshold: number;
}

enum GameSessionState {
  WAITING_FOR_BADGE = 'WAITING_FOR_BADGE',
  AUTHORIZING = 'AUTHORIZING',
  SETTING_UP_ROOM = 'SETTING_UP_ROOM',
  ARCADE_SESSION_ACTIVE = 'ARCADE_SESSION_ACTIVE',
  WAITING_FOR_SCORES = 'WAITING_FOR_SCORES',
  PROCESSING_RESULTS = 'PROCESSING_RESULTS',
  SHOWING_EFFECTS = 'SHOWING_EFFECTS',
  CLEANING_UP = 'CLEANING_UP',
  ERROR_STATE = 'ERROR_STATE',
}

@Injectable()
export class TeamArcadeService implements OnModuleInit {
  private currentTeam: TeamGameManagerResponse | null = null;
  private gameScores: Map<number, number> = new Map(); // playerId -> score
  private sessionSubscriptions: Subscription[] = [];
  private currentState = GameSessionState.WAITING_FOR_BADGE;
  private gamesCompleted = false;
  private manualBadgeSubject = new Subject<string>();
  private stateTransitions = new Subject<{
    from: GameSessionState;
    to: GameSessionState;
    data?: any;
  }>();

  constructor(
    @Inject(NFC_READER) private nfc: NfcReaderService,
    @Inject(SENSOR_BUS) private sensors: SensorBusService,
    @Inject(LED_CONTROL) private led: LedControlService,
    @Inject(SERIAL_CONTROL) private serial: SerialControlService,
    private cfg: ConfigService,
    private api: ApiService,
  ) {
    this.setupKeyboardListener();
  }

  async onModuleInit() {
    console.log('🎮 Team Arcade Middleware starting...');
    this.initializeStateMachine();
    this.transitionTo(GameSessionState.WAITING_FOR_BADGE);
  }

  private initializeStateMachine() {
    // Set up state transition handlers
    this.stateTransitions.subscribe(({ from, to, data }) => {
      console.log(`🔄 State transition: ${from} → ${to}`);
      this.handleStateTransition(to, data);
    });

    // Set up badge scan listener
    this.setupBadgeScanListener();
  }

  private transitionTo(newState: GameSessionState, data?: any) {
    const oldState = this.currentState;
    this.currentState = newState;
    this.stateTransitions.next({ from: oldState, to: newState, data });
  }

  private async handleStateTransition(state: GameSessionState, data?: any) {
    try {
      switch (state) {
        case GameSessionState.WAITING_FOR_BADGE:
          await this.handleWaitingForBadge();
          break;
        case GameSessionState.AUTHORIZING:
          await this.handleAuthorizing(data.badgeId);
          break;
        case GameSessionState.SETTING_UP_ROOM:
          await this.handleSettingUpRoom();
          break;
        case GameSessionState.ARCADE_SESSION_ACTIVE:
          await this.handleArcadeSessionActive();
          break;
        case GameSessionState.WAITING_FOR_SCORES:
          await this.handleWaitingForScores();
          break;
        case GameSessionState.PROCESSING_RESULTS:
          await this.handleProcessingResults(data.scores);
          break;
        case GameSessionState.SHOWING_EFFECTS:
          await this.handleShowingEffects(data.gameResult);
          break;
        case GameSessionState.CLEANING_UP:
          await this.handleCleaningUp();
          break;
        case GameSessionState.ERROR_STATE:
          await this.handleErrorState(data.error);
          break;
      }
    } catch (error) {
      console.error(`❌ Error in state ${state}:`, error);
      this.transitionTo(GameSessionState.ERROR_STATE, { error });
    }
  }

  private setupBadgeScanListener() {
    // Create a combined observable that listens to both NFC reader and manual input
    const combinedSource = new Observable<string>((subscriber) => {
      // Subscribe to real NFC reader
      const nfcSub = this.nfc.onTag().subscribe((badgeId) => {
        subscriber.next(badgeId);
      });

      // Subscribe to manual badge input
      const manualSub = this.manualBadgeSubject.subscribe((badgeId) => {
        subscriber.next(badgeId);
      });

      return () => {
        nfcSub.unsubscribe();
        manualSub.unsubscribe();
      };
    });

    // Listen for badge scans and trigger authorization
    combinedSource.subscribe((badgeId) => {
      if (this.currentState === GameSessionState.WAITING_FOR_BADGE) {
        console.log(`✅ Badge detected: ${badgeId}`);
        this.transitionTo(GameSessionState.AUTHORIZING, { badgeId });
      }
    });
  }

  // State Handlers
  private async handleWaitingForBadge() {
    console.log('🏷️ Waiting for team badge scan...');
    this.led.setColor(LedColor.GREEN);
    // Badge scan listener is already set up, just wait
  }

  private async handleAuthorizing(badgeId: string) {
    this.led.setColor(LedColor.YELLOW);
    console.log('🔐 Checking team authorization...');

    const authResult = await this.performTeamAuthorization(badgeId);
    if (authResult.success) {
      this.transitionTo(GameSessionState.SETTING_UP_ROOM);
    } else {
      await this.handleAuthorizationFailure();
      this.transitionTo(GameSessionState.WAITING_FOR_BADGE);
    }
  }

  private async handleSettingUpRoom() {
    await this.setupRoomAccess();
    await this.sendTeamDataToSimulator();
    this.transitionTo(GameSessionState.ARCADE_SESSION_ACTIVE);
  }

  private async handleArcadeSessionActive() {
    await this.startArcadeSession();
    this.transitionTo(GameSessionState.WAITING_FOR_SCORES);
  }

  private async handleWaitingForScores() {
    // Set up score listening and timer expiration handling
    this.setupScoreListening();
  }

  private setupScoreListening() {
    // Listen for scores
    const scoresSub = this.serial
      .onScoresReceived()
      .subscribe(async (scores) => {
        if (this.currentState === GameSessionState.WAITING_FOR_SCORES) {
          console.log(
            `📊 Player scores received from simulator: ${JSON.stringify(
              scores,
            )}`,
          );

          // Stop arcades and timers when scores are received
          console.log('🛑 Stopping arcades and timers - game finished');
          try {
            await this.serial.stopArcades();
            await this.serial.stopTimers();
          } catch (error) {
            console.error(
              '❌ Error stopping arcades after score submission:',
              error,
            );
          }

          this.transitionTo(GameSessionState.PROCESSING_RESULTS, { scores });
        }
      });

    // Listen for timer expiration
    const timerSub = this.serial.onRoomTimerExpired().subscribe(() => {
      if (this.currentState === GameSessionState.WAITING_FOR_SCORES) {
        console.log('⏰ Room timer expired - ending session without scores');
        this.transitionTo(GameSessionState.CLEANING_UP);
      }
    });

    this.sessionSubscriptions.push(scoresSub, timerSub);
  }

  private async handleProcessingResults(scores: GameScores) {
    const gameResult = this.evaluateGameResult(scores);
    await this.submitTeamScores(gameResult);
    this.transitionTo(GameSessionState.SHOWING_EFFECTS, { gameResult });
  }

  private async handleShowingEffects(gameResult: GameResult) {
    await this.showEndGameEffects(gameResult);
    this.transitionTo(GameSessionState.CLEANING_UP);
  }

  private async handleCleaningUp() {
    await this.cleanupSession();
    this.transitionTo(GameSessionState.WAITING_FOR_BADGE);
  }

  private async handleErrorState(error: any) {
    console.error('❌ Handling error state:', error);
    await this.cleanupSession();
    await this.delay(5000); // Wait before retrying
    this.transitionTo(GameSessionState.WAITING_FOR_BADGE);
  }

  // Phase 2: Team Authorization
  private async performTeamAuthorization(
    badgeId: string,
  ): Promise<{ success: boolean; response?: TeamGameManagerResponse }> {
    console.log('🔐 Checking team authorization...');
    const gameId = this.cfg.get<number>('global.gameId') ?? 1;

    try {
      const response = await this.api.teamAuthorization(badgeId, gameId);
      console.log('📋 API Response:', response);

      if (response.code === 200 && response.team && response.players) {
        this.currentTeam = response;
        this.gameScores.clear();
        this.gamesCompleted = false;

        // Initialize scores for all players
        response.players.forEach((player) => {
          this.gameScores.set(player.id, 0);
        });

        console.log(
          `✅ Team authorized: ${response.team.name} (${response.players.length} players)`,
        );

        return { success: true, response };
      } else {
        console.log(`❌ Authorization failed: ${response.message}`);
        return { success: false, response };
      }
    } catch (error) {
      console.log('📋 API Error Details:', error);
      console.error(
        `❌ API Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { success: false };
    }
  }

  // Handle authorization failure
  private async handleAuthorizationFailure(): Promise<void> {
    console.log('🚫 Team authorization failed - access denied');
    this.led.setColor(LedColor.RED);
    await this.serial.sendAccessDenied();
    await this.delay(3000);
  }

  // Phase 3: Room Access Control
  private async setupRoomAccess(): Promise<void> {
    console.log('🚪 Opening room access...');
    this.led.setColor(LedColor.BLUE);

    try {
      // Turn on room lighting
      await this.serial.turnOnLighting();

      // Open access latch/door
      await this.serial.openAccessLatch();

      // Display game instructions
      const instructions = this.cfg.get<string>(
        'global.gameRules.gameInstructions',
        'Welcome! Good luck!',
      );
      await this.serial.displayInstructions(instructions);

      console.log('✅ Room access granted');
    } catch (error) {
      console.error(
        `❌ Room setup error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  // Phase 3.5: Send Team Data to Simulator
  private async sendTeamDataToSimulator(): Promise<void> {
    console.log('📤 Sending team data to simulator...');

    if (!this.currentTeam?.players) return;

    const teamData = {
      players: this.currentTeam.players.map((player, index) => ({
        badgeId: player.badgeId,
        position: index + 1, // Player 1, 2, 3, 4
      })),
    };

    try {
      await this.serial.sendTeamData(teamData);
      console.log(
        `✅ Badge IDs sent to simulator: ${this.currentTeam.players
          .map((p) => p.badgeId)
          .join(', ')}`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to send team data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  // Phase 4: Arcade Game Session Management
  private async startArcadeSession(): Promise<void> {
    console.log('🎮 Starting arcade session...');

    const roomDurationMinutes = this.cfg.get<number>(
      'global.gameRules.roomDurationMinutes',
      5,
    );

    try {
      // Start arcades with timer duration only
      await this.serial.startArcades(roomDurationMinutes);

      // Subscribe to session end events
      this.setupSessionMonitoring();

      console.log(
        `✅ Arcade session started for ${roomDurationMinutes} minutes`,
      );
    } catch (error) {
      console.error(
        `❌ Session start error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  // Setup session monitoring for timer and completion events
  private setupSessionMonitoring(): void {
    // Monitor room timer expiration
    const roomTimerSub = this.serial.onRoomTimerExpired().subscribe(() => {
      console.log('🕐 Room timer expired');
      this.handleSessionEnd('ROOM_TIMER_EXPIRED');
    });

    // Monitor all games completion
    const gamesCompleteSub = this.serial.onAllGamesComplete().subscribe(() => {
      console.log('🎮 All games completed');
      this.gamesCompleted = true;
      // Immediately unsubscribe to prevent duplicate events
      gamesCompleteSub.unsubscribe();
      this.handleSessionEnd('ALL_GAMES_COMPLETE');
    });

    this.sessionSubscriptions.push(roomTimerSub, gamesCompleteSub);
  }

  // Handle session end conditions
  private async handleSessionEnd(reason: string): Promise<void> {
    if (!this.isSessionActive()) return;

    console.log(`🛑 Session ending due to: ${reason}`);

    try {
      // For ALL_GAMES_COMPLETE, just mark games as completed
      // Arcades/timers will be stopped when scores are received
      if (reason === 'ALL_GAMES_COMPLETE') {
        console.log('🎮 Games completed - waiting for score submission');
        return;
      }

      // For timer expiration, stop everything and go to cleanup
      if (reason === 'ROOM_TIMER_EXPIRED') {
        await this.serial.stopArcades();
        await this.serial.stopTimers();
        this.transitionTo(GameSessionState.CLEANING_UP);
      }
    } catch (error) {
      console.error(
        `❌ Error stopping session: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Phase 6: Result Evaluation Logic
  private evaluateGameResult(scores: GameScores): GameResult {
    console.log('🎯 Evaluating game results...');

    const totalScore =
      scores.player1 + scores.player2 + scores.player3 + scores.player4;
    const jackpotThreshold = this.cfg.get<number>(
      'global.gameRules.jackpotThreshold',
      1000,
    );

    // Determine if any individual player hit jackpot
    const hasJackpot =
      scores.player1 >= jackpotThreshold ||
      scores.player2 >= jackpotThreshold ||
      scores.player3 >= jackpotThreshold ||
      scores.player4 >= jackpotThreshold;

    // Determine win/loss
    const teamWon = totalScore > 0;

    const result: GameResult = {
      teamWon,
      hasJackpot,
      totalScore,
      individualScores: scores,
      jackpotThreshold,
    };

    console.log(
      `🎯 Game result: ${
        teamWon ? 'WON' : 'LOST'
      }, Total: ${totalScore}, Jackpot: ${hasJackpot ? 'YES' : 'NO'}`,
    );

    return result;
  }

  // Phase 7: Backend Score Submission
  private async submitTeamScores(gameResult: GameResult): Promise<void> {
    console.log('📤 Submitting team scores...');

    if (!this.currentTeam?.players) return;

    // Map individual player scores from arcade machines to players
    const playerScores: PlayerScoreData[] = this.currentTeam.players.map(
      (player, index) => {
        // Map each player to their corresponding arcade machine score
        let playerScore = 0;
        switch (index) {
          case 0:
            playerScore = gameResult.individualScores.player1;
            break;
          case 1:
            playerScore = gameResult.individualScores.player2;
            break;
          case 2:
            playerScore = gameResult.individualScores.player3;
            break;
          case 3:
            playerScore = gameResult.individualScores.player4;
            break;
          default:
            playerScore = 0; // Extra players beyond 4 get 0 score
        }

        return {
          playerId: player.id,
          playerPoints: playerScore,
          isJackpot:
            gameResult.hasJackpot && playerScore >= gameResult.jackpotThreshold,
        };
      },
    );

    const scoreRequest: TeamScoreRequest = {
      gameId: this.cfg.get<number>('global.gameId') ?? 1,
      players: playerScores,
    };

    try {
      console.log(
        '📤 Score request payload:',
        JSON.stringify(scoreRequest, null, 2),
      );
      const response = await this.api.teamCreateScore(scoreRequest);
      if (response.code === 200) {
        console.log('✅ Scores submitted successfully');
      } else {
        console.log(`❌ Score submission failed: ${response.message}`);
      }
    } catch (error) {
      console.error(
        `❌ Score submission error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (error instanceof Error && 'response' in error) {
        console.error('📥 Error response:', error.response);
      }
    }
  }

  // Phase 8: End Game Effects
  private async showEndGameEffects(gameResult: GameResult): Promise<void> {
    console.log('🎭 Showing end game effects...');

    try {
      if (gameResult.hasJackpot) {
        console.log('💰 JACKPOT! Playing jackpot animation...');
        this.led.setColor(LedColor.YELLOW); // Gold color for jackpot
        await this.serial.showJackpotAnimation();
        await this.delay(2000);
        await this.serial.celebrate();
      } else if (gameResult.teamWon) {
        console.log('🏆 Team won! Playing win animation...');
        this.led.setColor(LedColor.BLUE);
        await this.serial.showWin();
      } else {
        console.log('😞 Team lost. Playing loss animation...');
        this.led.setColor(LedColor.RED);
        await this.serial.showLoss();
      }

      await this.delay(3000); // Show effects for 3 seconds

      // Turn off lighting
      await this.serial.turnOffLighting();
    } catch (error) {
      console.error(
        `❌ End game effects error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Phase 9: Session Cleanup
  private async cleanupSession(): Promise<void> {
    console.log('🧹 Cleaning up session...');

    try {
      // Unsubscribe from all session events
      this.sessionSubscriptions.forEach((sub) => sub.unsubscribe());
      this.sessionSubscriptions = [];

      // Reset session state
      this.currentTeam = null;
      this.gameScores.clear();

      // Close access latch
      await this.serial.closeAccessLatch();

      // Return LED to green (waiting state)
      this.led.setColor(LedColor.GREEN);

      console.log('✅ Session cleanup completed');
    } catch (error) {
      console.error(
        `❌ Cleanup error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public methods for external control if needed
  public getCurrentTeam(): TeamGameManagerResponse | null {
    return this.currentTeam;
  }

  // Helper methods for state management
  private isSessionActive(): boolean {
    return (
      this.currentState !== GameSessionState.WAITING_FOR_BADGE &&
      this.currentState !== GameSessionState.ERROR_STATE &&
      this.currentState !== GameSessionState.CLEANING_UP
    );
  }

  public getSessionActive(): boolean {
    return this.isSessionActive();
  }

  public getCurrentState(): GameSessionState {
    return this.currentState;
  }

  public async forceGameEnd(): Promise<void> {
    console.log('🛑 Forcing game end...');
    if (this.isSessionActive()) {
      this.transitionTo(GameSessionState.ERROR_STATE, {
        error: new Error('Manual override'),
      });
    }
  }

  public async emergencyStop(): Promise<void> {
    console.log('🚨 Emergency stop activated...');
    try {
      await this.serial.stopArcades();
      await this.serial.stopTimers();
      await this.serial.turnOffLighting();
      await this.cleanupSession();
    } catch (error) {
      console.error(
        `❌ Emergency stop error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Development helper: Keyboard listener for manual badge input
  private setupKeyboardListener(): void {
    // Only enable in SIM mode
    const mode = this.cfg.get<string>('global.mode', 'PROD');
    if (mode !== 'SIM') {
      return;
    }

    // Create persistent readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Listen for line input (when user presses Enter)
    rl.on('line', (input) => {
      const inputStr = input.toString().trim().toUpperCase();

      if (inputStr === 'B') {
        this.promptForBadgeId(rl);
      }
    });

    console.log('⌨️  Type "B" + Enter to simulate badge scan');
  }

  private promptForBadgeId(rl: readline.Interface): void {
    rl.question('🏷️  Enter badge ID: ', (badgeId) => {
      if (badgeId.trim()) {
        console.log(`📱 Simulating badge scan: ${badgeId.trim()}`);
        this.manualBadgeSubject.next(badgeId.trim());
      } else {
        console.log('❌ Empty badge ID ignored');
      }
    });
  }
}
