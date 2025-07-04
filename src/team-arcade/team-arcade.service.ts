import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NFC_READER, SENSOR_BUS, LED_CONTROL } from '../hardware/tokens';
import { NfcReaderService } from '../hardware/interfaces/nfc-reader.interface';
import { SensorBusService } from '../hardware/interfaces/sensor-bus.interface';
import {
  LedControlService,
  LedColor,
} from '../hardware/interfaces/led-control.interface';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../api/api.service';
import {
  TeamGameManagerResponse,
  PlayerData,
  TeamScoreRequest,
  PlayerScoreData,
} from '../common/dto/game‑manager.dto';

@Injectable()
export class TeamArcadeService implements OnModuleInit {
  private readonly log = new Logger(TeamArcadeService.name);
  private currentTeam: TeamGameManagerResponse | null = null;
  private gameScores: Map<number, number> = new Map(); // playerId -> score

  constructor(
    @Inject(NFC_READER) private nfc: NfcReaderService,
    @Inject(SENSOR_BUS) private sensors: SensorBusService,
    @Inject(LED_CONTROL) private led: LedControlService,
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
        await this.waitForTeamAuthorization();
        await this.handleGameSession();
      } catch (error) {
        this.log.error(
          `Error in main loop: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.delay(5000); // Wait 5 seconds before retrying
      }
    }
  }

  private async waitForTeamAuthorization() {
    this.log.log('🏷️  Waiting for team badge scan...');
    this.led.setColor(LedColor.GREEN);

    const badgeId = await firstValueFrom(this.nfc.onTag());
    const gameId = this.cfg.get<number>('global.gameId') ?? 1;

    this.log.log(`Badge scanned: ${badgeId}`);
    this.led.setColor(LedColor.YELLOW);

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
        this.led.setColor(LedColor.BLUE);
        return;
      } else {
        this.log.warn(`❌ Authorization failed: ${response.message}`);
        this.led.setColor(LedColor.RED);
        await this.delay(3000);
        throw new Error('Authorization failed');
      }
    } catch (error) {
      this.log.error(
        `API Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.led.setColor(LedColor.RED);
      await this.delay(3000);
      throw error;
    }
  }

  private async handleGameSession() {
    if (!this.currentTeam) return;

    this.log.log('🎯 Game session started - monitoring sensors...');

    // Subscribe to sensor events
    this.sensors.onEvent().subscribe((event) => {
      this.handleSensorEvent(event);
    });

    // Wait for game completion signal (this could be a timeout, specific sensor, or external signal)
    // For now, we'll wait for a specific duration or until all players have scores
    await this.waitForGameCompletion();

    // Submit final scores
    await this.submitTeamScores();

    // Reset for next game
    this.currentTeam = null;
    this.gameScores.clear();
  }

  private handleSensorEvent(event: any) {
    if (!this.currentTeam) return;

    this.log.log(`🎯 Sensor event: ${JSON.stringify(event)}`);

    // This is where you would implement game-specific scoring logic
    // For now, we'll add points based on sensor events
    const points = this.calculatePointsFromSensor(event);

    if (points > 0) {
      // For team games, we might distribute points among players
      // or assign to a specific player based on game logic
      this.distributePoints(points);
    }
  }

  private calculatePointsFromSensor(event: any): number {
    // Implement your sensor-to-points logic here
    // This depends on your specific arcade machine setup
    return event.points || 10; // Default 10 points per sensor event
  }

  private distributePoints(points: number) {
    if (!this.currentTeam?.players) return;

    // Simple distribution: give points to first active player
    // You can implement more sophisticated logic here
    const firstPlayer = this.currentTeam.players[0];
    if (firstPlayer) {
      const currentScore = this.gameScores.get(firstPlayer.id) || 0;
      this.gameScores.set(firstPlayer.id, currentScore + points);
      this.log.log(
        `➕ Added ${points} points to ${firstPlayer.displayName} (total: ${
          currentScore + points
        })`,
      );
    }
  }

  private async waitForGameCompletion(): Promise<void> {
    // Implement your game completion logic here
    // This could be:
    // - A timeout
    // - All players reaching a certain score
    // - A specific sensor event
    // - An external signal

    return new Promise((resolve) => {
      setTimeout(() => {
        this.log.log('⏰ Game session completed (timeout)');
        resolve();
      }, 60000); // 60 second timeout for demo
    });
  }

  private async submitTeamScores() {
    if (!this.currentTeam?.players) return;

    const playerScores: PlayerScoreData[] = this.currentTeam.players.map(
      (player) => ({
        playerId: player.id,
        playerPoints: this.gameScores.get(player.id) || 0,
        isJackpot: false, // You can implement jackpot logic here
      }),
    );

    const scoreRequest: TeamScoreRequest = {
      gameId: this.cfg.get<number>('global.gameId') ?? 1,
      players: playerScores,
    };

    try {
      const response = await this.api.teamCreateScore(scoreRequest);

      if (response.code === 200) {
        this.log.log('✅ Scores submitted successfully');
        this.led.setColor(LedColor.GREEN);
      } else {
        this.log.warn(`❌ Score submission failed: ${response.message}`);
        this.led.setColor(LedColor.RED);
      }
    } catch (error) {
      this.log.error(
        `Score submission error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.led.setColor(LedColor.RED);
    }

    await this.delay(3000); // Show result for 3 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public methods for external control if needed
  public getCurrentTeam(): TeamGameManagerResponse | null {
    return this.currentTeam;
  }

  public addPointsToPlayer(playerId: number, points: number): void {
    const currentScore = this.gameScores.get(playerId) || 0;
    this.gameScores.set(playerId, currentScore + points);
    this.log.log(`➕ Manually added ${points} points to player ${playerId}`);
  }

  public async forceGameEnd(): Promise<void> {
    this.log.log('🛑 Forcing game end...');
    await this.submitTeamScores();
  }
}
