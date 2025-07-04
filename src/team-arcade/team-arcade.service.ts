import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../api/api.service';
import {
  TeamGameManagerResponse,
  PlayerData,
  TeamScoreRequest,
  PlayerScoreData,
} from '../common/dto/game‑manager.dto';

interface GameResult {
  teamWon: boolean;
  hasJackpot: boolean;
  totalScore: number;
  individualScores: GameScores;
  jackpotThreshold: number;
}

@Injectable()
export class TeamArcadeService implements OnModuleInit {
  private readonly log = new Logger(TeamArcadeService.name);
  private currentTeam: TeamGameManagerResponse | null = null;
  private gameScores: Map<number, number> = new Map(); // playerId -> score
  private sessionSubscriptions: Subscription[] = [];
  private sessionActive = false;

  constructor(
    @Inject(NFC_READER) private nfc: NfcReaderService,
    @Inject(SENSOR_BUS) private sensors: SensorBusService,
    @Inject(LED_CONTROL) private led: LedControlService,
    @Inject(SERIAL_CONTROL) private serial: SerialControlService,
    private cfg: ConfigService,
    private api: ApiService,
  ) {}

  async onModuleInit() {
    this.log.log('🎮 Team Arcade Middleware starting...');
    this.startMainLoop();
  }

  private async startMainLoop() {
    while (true) {
      try {
        // Phase 1: Badge Scanning
        const badgeId = await this.waitForBadgeScan();

        // Phase 2: Team Authorization
        const authResult = await this.performTeamAuthorization(badgeId);
        if (!authResult.success) {
          await this.handleAuthorizationFailure();
          continue;
        }

        // Phase 3: Room Access Control
        await this.setupRoomAccess();

        // Phase 4: Arcade Game Session Management
        await this.startArcadeSession();

        // Phase 5: Score Collection
        const scores = await this.waitForScores();

        // Phase 6: Result Evaluation
        const gameResult = this.evaluateGameResult(scores);

        // Phase 7: Backend Score Submission
        await this.submitTeamScores(gameResult);

        // Phase 8: End Game Effects
        await this.showEndGameEffects(gameResult);

        // Phase 9: Session Cleanup
        await this.cleanupSession();
      } catch (error) {
        this.log.error(
          `Error in main loop: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.cleanupSession();
        await this.delay(5000); // Wait 5 seconds before retrying
      }
    }
  }

  // Phase 1: Badge Scanning
  private async waitForBadgeScan(): Promise<string> {
    this.log.log('🏷️ Phase 1: Waiting for team badge scan...');
    this.led.setColor(LedColor.GREEN);

    const badgeId = await firstValueFrom(this.nfc.onTag());
    this.log.log(`Badge scanned: ${badgeId}`);
    this.led.setColor(LedColor.YELLOW);

    return badgeId;
  }

  // Phase 2: Team Authorization
  private async performTeamAuthorization(
    badgeId: string,
  ): Promise<{ success: boolean; response?: TeamGameManagerResponse }> {
    this.log.log('🔐 Phase 2: Performing team authorization...');
    const gameId = this.cfg.get<number>('global.gameId') ?? 1;

    try {
      const response = await this.api.teamAuthorization(badgeId, gameId);

      if (response.code === 200 && response.team && response.players) {
        this.currentTeam = response;
        this.gameScores.clear();

        // Initialize scores for all players
        response.players.forEach((player) => {
          this.gameScores.set(player.id, 0);
        });

        this.log.log(
          `✅ Team authorized: ${response.team.name} (${response.players.length} players)`,
        );
        this.log.log(
          `📋 Game rules: ${
            response.team.gamePlay.duration
          }s duration, ${this.cfg.get(
            'global.gameRules.maxGamesPerSession',
          )} max games`,
        );

        return { success: true, response };
      } else {
        this.log.warn(`❌ Authorization failed: ${response.message}`);
        return { success: false, response };
      }
    } catch (error) {
      this.log.error(
        `API Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false };
    }
  }

  // Handle authorization failure
  private async handleAuthorizationFailure(): Promise<void> {
    this.log.log('🚫 Phase 2 Failed: Handling authorization failure...');
    this.led.setColor(LedColor.RED);
    await this.serial.sendAccessDenied();
    await this.delay(3000);
  }

  // Phase 3: Room Access Control
  private async setupRoomAccess(): Promise<void> {
    this.log.log('🚪 Phase 3: Setting up room access...');
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

      this.log.log('✅ Room access granted and instructions displayed');
    } catch (error) {
      this.log.error(
        `Room setup error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  // Phase 4: Arcade Game Session Management
  private async startArcadeSession(): Promise<void> {
    this.log.log('🎮 Phase 4: Starting arcade session...');
    this.sessionActive = true;

    const maxGames = this.cfg.get<number>(
      'global.gameRules.maxGamesPerSession',
      4,
    );

    try {
      // Start arcades with max games parameter
      await this.serial.startArcades(maxGames);

      // Subscribe to session end events
      this.setupSessionMonitoring();

      this.log.log(`✅ Arcade session started with max ${maxGames} games`);
    } catch (error) {
      this.log.error(
        `Session start error: ${
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
      this.log.log('🕐 Room timer expired');
      this.handleSessionEnd('ROOM_TIMER_EXPIRED');
    });

    // Monitor all games completion
    const gamesCompleteSub = this.serial.onAllGamesComplete().subscribe(() => {
      this.log.log('🎮 All games completed');
      this.handleSessionEnd('ALL_GAMES_COMPLETE');
    });

    this.sessionSubscriptions.push(roomTimerSub, gamesCompleteSub);
  }

  // Handle session end conditions
  private async handleSessionEnd(reason: string): Promise<void> {
    if (!this.sessionActive) return;

    this.log.log(`🛑 Session ending due to: ${reason}`);
    this.sessionActive = false;

    try {
      await this.serial.stopArcades();
      await this.serial.stopTimers();
    } catch (error) {
      this.log.error(
        `Error stopping session: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Phase 5: Score Collection
  private async waitForScores(): Promise<GameScores> {
    this.log.log('📊 Phase 5: Waiting for final scores...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for scores'));
      }, 30000); // 30 second timeout

      const scoresSub = this.serial.onScoresReceived().subscribe((scores) => {
        clearTimeout(timeout);
        scoresSub.unsubscribe();
        this.log.log(`📊 Scores received: ${JSON.stringify(scores)}`);
        resolve(scores);
      });

      this.sessionSubscriptions.push(scoresSub);
    });
  }

  // Phase 6: Result Evaluation Logic
  private evaluateGameResult(scores: GameScores): GameResult {
    this.log.log('🎯 Phase 6: Evaluating game results...');

    const totalScore =
      scores.game1 + scores.game2 + scores.game3 + scores.game4;
    const jackpotThreshold = this.cfg.get<number>(
      'global.gameRules.jackpotThreshold',
      1000,
    );

    // Determine if any individual game hit jackpot
    const hasJackpot =
      scores.game1 >= jackpotThreshold ||
      scores.game2 >= jackpotThreshold ||
      scores.game3 >= jackpotThreshold ||
      scores.game4 >= jackpotThreshold;

    // Determine win/loss
    const teamWon = totalScore > 0;

    const result: GameResult = {
      teamWon,
      hasJackpot,
      totalScore,
      individualScores: scores,
      jackpotThreshold,
    };

    this.log.log(
      `🎯 Game result: ${
        teamWon ? 'WON' : 'LOST'
      }, Total: ${totalScore}, Jackpot: ${hasJackpot ? 'YES' : 'NO'}`,
    );

    return result;
  }

  // Phase 7: Backend Score Submission
  private async submitTeamScores(gameResult: GameResult): Promise<void> {
    this.log.log('📤 Phase 7: Submitting team scores...');

    if (!this.currentTeam?.players) return;

    // Map arcade game scores to players (distribute evenly for now)
    const playerScores: PlayerScoreData[] = this.currentTeam.players.map(
      (player, index) => {
        const gameScoreKeys = Object.keys(
          gameResult.individualScores,
        ) as (keyof GameScores)[];
        const playerScore =
          index < gameScoreKeys.length
            ? gameResult.individualScores[gameScoreKeys[index]]
            : 0;

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
      const response = await this.api.teamCreateScore(scoreRequest);

      if (response.code === 200) {
        this.log.log('✅ Scores submitted successfully');
      } else {
        this.log.warn(`❌ Score submission failed: ${response.message}`);
      }
    } catch (error) {
      this.log.error(
        `Score submission error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Phase 8: End Game Effects
  private async showEndGameEffects(gameResult: GameResult): Promise<void> {
    this.log.log('🎭 Phase 8: Showing end game effects...');

    try {
      if (gameResult.hasJackpot) {
        this.log.log('💰 JACKPOT! Playing jackpot animation...');
        this.led.setColor(LedColor.YELLOW); // Gold color for jackpot
        await this.serial.showJackpotAnimation();
        await this.delay(2000);
        await this.serial.celebrate();
      } else if (gameResult.teamWon) {
        this.log.log('🏆 Team won! Playing win animation...');
        this.led.setColor(LedColor.BLUE);
        await this.serial.showWin();
      } else {
        this.log.log('😞 Team lost. Playing loss animation...');
        this.led.setColor(LedColor.RED);
        await this.serial.showLoss();
      }

      await this.delay(3000); // Show effects for 3 seconds

      // Turn off lighting
      await this.serial.turnOffLighting();
    } catch (error) {
      this.log.error(
        `End game effects error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Phase 9: Session Cleanup
  private async cleanupSession(): Promise<void> {
    this.log.log('🧹 Phase 9: Cleaning up session...');

    try {
      // Unsubscribe from all session events
      this.sessionSubscriptions.forEach((sub) => sub.unsubscribe());
      this.sessionSubscriptions = [];

      // Reset session state
      this.sessionActive = false;
      this.currentTeam = null;
      this.gameScores.clear();

      // Close access latch
      await this.serial.closeAccessLatch();

      // Return LED to green (waiting state)
      this.led.setColor(LedColor.GREEN);

      this.log.log('✅ Session cleanup completed');
    } catch (error) {
      this.log.error(
        `Cleanup error: ${
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

  public getSessionActive(): boolean {
    return this.sessionActive;
  }

  public async forceGameEnd(): Promise<void> {
    this.log.log('🛑 Forcing game end...');
    if (this.sessionActive) {
      await this.handleSessionEnd('MANUAL_OVERRIDE');
    }
  }

  public async emergencyStop(): Promise<void> {
    this.log.log('🚨 Emergency stop activated...');
    try {
      await this.serial.stopArcades();
      await this.serial.stopTimers();
      await this.serial.turnOffLighting();
      await this.cleanupSession();
    } catch (error) {
      this.log.error(
        `Emergency stop error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
