import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import {
  SerialControlService,
  GameScores,
  SerialCommand,
  SerialEvent,
} from '../interfaces/serial-control.interface';

// Import SerialPort for version 9.x
const SerialPort = require('serialport');

@Injectable()
export class ControllinoSerialService implements SerialControlService {
  private serialPort: any;
  private roomTimerExpired$ = new Subject<void>();
  private allGamesComplete$ = new Subject<void>();
  private scoresReceived$ = new Subject<GameScores>();

  constructor(private cfg: ConfigService) {
    this.initializeSerial();
  }

  private initializeSerial() {
    const portPath = this.cfg.get<string>(
      'global.hardware.controllino.serial.defaultPort',
      '/dev/ttyACM0',
    );
    const baudRate = this.cfg.get<number>(
      'global.hardware.controllino.serial.baudRate',
      9600,
    );

    // For serialport v9.x, use the constructor with path and options
    this.serialPort = new SerialPort(portPath, {
      baudRate: baudRate,
    });

    this.serialPort.on('data', (data: Buffer) => {
      this.handleSerialData(data.toString());
    });

    this.serialPort.on('error', (error: Error) => {
      console.error(`❌ Serial port error: ${error.message}`);
    });

    console.log(`Serial port initialized on ${portPath} at ${baudRate} baud`);
  }

  private handleSerialData(data: string) {
    const trimmedData = data.trim();
    // Debug: console.log(`📡 Received serial data: ${trimmedData}`);

    try {
      // Handle different types of incoming data
      if (trimmedData === SerialEvent.ROOM_TIMER_EXPIRED) {
        console.log('🕐 Room timer expired event received');
        this.roomTimerExpired$.next();
      } else if (trimmedData === SerialEvent.ALL_GAMES_COMPLETE) {
        console.log('🎮 All games complete event received');
        this.allGamesComplete$.next();
      } else if (trimmedData.startsWith(SerialEvent.SCORES_RECEIVED)) {
        this.handleScoresData(trimmedData);
      }
    } catch (error) {
      console.error(
        `❌ Error parsing serial data: ${
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

      console.log(`📊 Player scores received: ${JSON.stringify(scores)}`);
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
      const commandString = parameter ? `${command}:${parameter}` : command;

      this.serialPort.write(
        `${commandString}\n`,
        (error: Error | null | undefined) => {
          if (error) {
            console.error(
              `❌ Failed to send command ${commandString}: ${error.message}`,
            );
            reject(error);
          } else {
            // Debug: console.log(`📤 Sent command: ${commandString}`);
            resolve();
          }
        },
      );
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
  async startArcades(
    maxGames: number,
    durationMinutes?: number,
  ): Promise<void> {
    const params = durationMinutes
      ? `${maxGames}:${durationMinutes}`
      : maxGames;
    await this.sendCommand(SerialCommand.START_ARCADES, params);
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
}
