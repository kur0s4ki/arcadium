import { Injectable } from '@nestjs/common';
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
  private client: net.Socket | null = null;
  private roomTimerExpired$ = new Subject<void>();
  private allGamesComplete$ = new Subject<void>();
  private scoresReceived$ = new Subject<GameScores>();
  private reconnectInterval: NodeJS.Timeout | null = null;
  private sessionActive = false;

  constructor(private cfg: ConfigService) {
    this.initializeTcpConnection();
  }

  private initializeTcpConnection() {
    const host = this.cfg.get<string>(
      'global.hardware.simulator.host',
      'localhost',
    );
    const port = this.cfg.get<number>('global.hardware.simulator.port', 9999);

    console.log(`🔌 Connecting to arcade simulator at ${host}:${port}`);
    this.connectToSimulator(host, port);
  }

  private connectToSimulator(host: string, port: number) {
    this.client = new net.Socket();

    this.client.connect(port, host, () => {
      console.log('✅ Connected to arcade hardware simulator');
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    });

    this.client.on('data', (data: Buffer) => {
      this.handleSimulatorData(data.toString());
    });

    this.client.on('error', (error: Error) => {
      // TCP connection error - will retry
      this.scheduleReconnect(host, port);
    });

    this.client.on('close', () => {
      // Connection to simulator closed - will retry
      this.scheduleReconnect(host, port);
    });
  }

  private scheduleReconnect(host: string, port: number) {
    if (this.reconnectInterval) return;

    console.log('🔄 Scheduling reconnection in 5 seconds...');
    this.reconnectInterval = setInterval(() => {
      console.log('🔄 Attempting to reconnect to simulator...');
      this.connectToSimulator(host, port);
    }, 5000);
  }

  private handleSimulatorData(data: string) {
    const trimmedData = data.trim();
    console.log(`📨 Received from simulator: ${trimmedData}`);

    try {
      // Handle different types of incoming data from simulator
      if (trimmedData === SerialEvent.ROOM_TIMER_EXPIRED) {
        if (this.sessionActive) {
          console.log('🕐 Room timer expired event received from simulator');
          this.roomTimerExpired$.next();
        } else {
          console.log('⚠️ Ignoring ROOM_TIMER_EXPIRED - no active session');
        }
      } else if (trimmedData === SerialEvent.ALL_GAMES_COMPLETE) {
        if (this.sessionActive) {
          console.log('🎮 All games complete event received from simulator');
          this.allGamesComplete$.next();
        } else {
          console.log('⚠️ Ignoring ALL_GAMES_COMPLETE - no active session');
        }
      } else if (trimmedData.startsWith(SerialEvent.SCORES_RECEIVED)) {
        // Always process scores when received, regardless of session state
        // This prevents race conditions where session is marked inactive
        // before scores are fully processed
        console.log('🎯 Processing scores data...');
        this.handleScoresData(trimmedData);
      } else {
        console.log(`📡 Unhandled simulator data: ${trimmedData}`);
      }
    } catch (error) {
      console.error(
        `❌ Error parsing simulator data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private handleScoresData(data: string) {
    try {
      // Expected format: "SCORES_RECEIVED:{ player1: 100, player2: 200, player3: 0, player4: 150 }"
      const jsonPart = data.substring(data.indexOf(':') + 1);
      const scores: GameScores = JSON.parse(jsonPart);

      console.log(
        `📊 Player scores received from simulator: ${JSON.stringify(scores)}`,
      );
      this.scoresReceived$.next(scores);
    } catch (error) {
      console.error(
        `❌ Error parsing scores data: ${
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
        console.error(`❌ Failed to send command ${command}: ${error.message}`);
        reject(error);
        return;
      }

      const commandString = parameter ? `${command}:${parameter}` : command;

      this.client.write(`${commandString}\n`, (error) => {
        if (error) {
          console.error(
            `❌ Failed to send command ${commandString}: ${error.message}`,
          );
          reject(error);
        } else {
          // Debug: console.log(`📤 Sent to simulator: ${commandString}`);
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
  async startArcades(durationMinutes: number): Promise<void> {
    this.sessionActive = true;
    await this.sendCommand(SerialCommand.START_ARCADES, durationMinutes);
  }

  async stopArcades(): Promise<void> {
    await this.sendCommand(SerialCommand.STOP_ARCADES);
  }

  async stopTimers(): Promise<void> {
    this.sessionActive = false;
    await this.sendCommand(SerialCommand.STOP_TIMERS);
  }

  // Display commands
  async displayInstructions(instructions: string): Promise<void> {
    await this.sendCommand(SerialCommand.DISPLAY_INSTRUCTIONS, instructions);
  }

  async sendTeamData(teamData: any): Promise<void> {
    await this.sendCommand(SerialCommand.TEAM_DATA, JSON.stringify(teamData));
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
