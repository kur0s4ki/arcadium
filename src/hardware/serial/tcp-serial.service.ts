import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import * as net from 'net';
import {
  SerialControlService,
  GameScores,
  SerialCommand,
  SerialEvent,
} from '../interfaces/serial-control.interface';

/**
 * TCP-based serial service for development/simulation
 * Connects to the arcade hardware simulator via TCP socket
 */
@Injectable()
export class TcpSerialService implements SerialControlService {
  private readonly log = new Logger(TcpSerialService.name);
  private client: net.Socket | null = null;
  private roomTimerExpired$ = new Subject<void>();
  private allGamesComplete$ = new Subject<void>();
  private scoresReceived$ = new Subject<GameScores>();
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(private cfg: ConfigService) {
    this.initializeTcpConnection();
  }

  private initializeTcpConnection() {
    const host = this.cfg.get<string>('global.hardware.simulator.host', 'localhost');
    const port = this.cfg.get<number>('global.hardware.simulator.port', 9999);

    this.log.log(`🔌 Connecting to arcade simulator at ${host}:${port}`);
    this.connectToSimulator(host, port);
  }

  private connectToSimulator(host: string, port: number) {
    this.client = new net.Socket();

    this.client.connect(port, host, () => {
      this.log.log('✅ Connected to arcade hardware simulator');
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    });

    this.client.on('data', (data: Buffer) => {
      this.handleSimulatorData(data.toString());
    });

    this.client.on('error', (error: Error) => {
      this.log.error(`❌ TCP connection error: ${error.message}`);
      this.scheduleReconnect(host, port);
    });

    this.client.on('close', () => {
      this.log.warn('📡 Connection to simulator closed');
      this.scheduleReconnect(host, port);
    });
  }

  private scheduleReconnect(host: string, port: number) {
    if (this.reconnectInterval) return;

    this.log.log('🔄 Scheduling reconnection in 5 seconds...');
    this.reconnectInterval = setInterval(() => {
      this.log.log('🔄 Attempting to reconnect to simulator...');
      this.connectToSimulator(host, port);
    }, 5000);
  }

  private handleSimulatorData(data: string) {
    const trimmedData = data.trim();
    this.log.debug(`📨 Received from simulator: ${trimmedData}`);

    try {
      // Handle different types of incoming data from simulator
      if (trimmedData === SerialEvent.ROOM_TIMER_EXPIRED) {
        this.log.log('🕐 Room timer expired event received from simulator');
        this.roomTimerExpired$.next();
      } else if (trimmedData === SerialEvent.ALL_GAMES_COMPLETE) {
        this.log.log('🎮 All games complete event received from simulator');
        this.allGamesComplete$.next();
      } else if (trimmedData.startsWith(SerialEvent.SCORES_RECEIVED)) {
        this.handleScoresData(trimmedData);
      }
    } catch (error) {
      this.log.error(
        `Error parsing simulator data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private handleScoresData(data: string) {
    try {
      // Expected format: "SCORES_RECEIVED:{ game1: 100, game2: 200, game3: 0, game4: 150 }"
      const jsonPart = data.substring(data.indexOf(':') + 1);
      const scores: GameScores = JSON.parse(jsonPart);

      this.log.log(`📊 Scores received from simulator: ${JSON.stringify(scores)}`);
      this.scoresReceived$.next(scores);
    } catch (error) {
      this.log.error(
        `Error parsing scores data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async sendCommand(
    command: SerialCommand,
    parameter?: string | number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || this.client.destroyed) {
        const error = new Error('No connection to simulator');
        this.log.error(`Failed to send command ${command}: ${error.message}`);
        reject(error);
        return;
      }

      const commandString = parameter ? `${command}:${parameter}` : command;

      this.client.write(`${commandString}\n`, (error) => {
        if (error) {
          this.log.error(
            `Failed to send command ${commandString}: ${error.message}`,
          );
          reject(error);
        } else {
          this.log.debug(`📤 Sent to simulator: ${commandString}`);
          resolve();
        }
      });
    });
  }

  // Room control commands
  async turnOnLighting(): Promise<void> {
    await this.sendCommand(SerialCommand.TURN_ON_LIGHTING);
  }

  async turnOffLighting(): Promise<void> {
    await this.sendCommand(SerialCommand.TURN_OFF_LIGHTING);
  }

  async openAccessLatch(): Promise<void> {
    await this.sendCommand(SerialCommand.OPEN_ACCESS);
  }

  async closeAccessLatch(): Promise<void> {
    await this.sendCommand(SerialCommand.CLOSE_ACCESS);
  }

  // Game control commands
  async startArcades(maxGames: number): Promise<void> {
    await this.sendCommand(SerialCommand.START_ARCADES, maxGames);
  }

  async stopArcades(): Promise<void> {
    await this.sendCommand(SerialCommand.STOP_ARCADES);
  }

  async stopTimers(): Promise<void> {
    await this.sendCommand(SerialCommand.STOP_TIMERS);
  }

  // Display commands
  async displayInstructions(instructions: string): Promise<void> {
    await this.sendCommand(SerialCommand.DISPLAY_INSTRUCTIONS, instructions);
  }

  async showWin(): Promise<void> {
    await this.sendCommand(SerialCommand.SHOW_WIN);
  }

  async showLoss(): Promise<void> {
    await this.sendCommand(SerialCommand.SHOW_LOSS);
  }

  async showJackpotAnimation(): Promise<void> {
    await this.sendCommand(SerialCommand.JACKPOT_ANIMATION);
  }

  async celebrate(): Promise<void> {
    await this.sendCommand(SerialCommand.CELEBRATE);
  }

  // Access control
  async sendAccessDenied(): Promise<void> {
    await this.sendCommand(SerialCommand.ACCESS_DENIED);
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

  // Cleanup method
  destroy() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.client && !this.client.destroyed) {
      this.client.destroy();
    }
  }
}
