import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { SerialPort } from 'serialport';
import { 
  SerialControlService, 
  GameScores, 
  SerialCommand, 
  SerialEvent 
} from '../interfaces/serial-control.interface';

@Injectable()
export class ControllinoSerialService implements SerialControlService {
  private readonly log = new Logger(ControllinoSerialService.name);
  private serialPort: SerialPort;
  private roomTimerExpired$ = new Subject<void>();
  private allGamesComplete$ = new Subject<void>();
  private scoresReceived$ = new Subject<GameScores>();

  constructor(private cfg: ConfigService) {
    this.initializeSerial();
  }

  private initializeSerial() {
    const portPath = this.cfg.get<string>('global.hardware.controllino.serial.defaultPort', '/dev/ttyACM0');
    const baudRate = this.cfg.get<number>('global.hardware.controllino.serial.baudRate', 9600);

    this.serialPort = new SerialPort({
      path: portPath,
      baudRate: baudRate,
    });

    this.serialPort.on('data', (data) => {
      this.handleSerialData(data.toString());
    });

    this.serialPort.on('error', (error) => {
      this.log.error(`Serial port error: ${error.message}`);
    });

    this.log.log(`Serial port initialized on ${portPath} at ${baudRate} baud`);
  }

  private handleSerialData(data: string) {
    const trimmedData = data.trim();
    this.log.debug(`Received serial data: ${trimmedData}`);

    try {
      // Handle different types of incoming data
      if (trimmedData === SerialEvent.ROOM_TIMER_EXPIRED) {
        this.log.log('🕐 Room timer expired event received');
        this.roomTimerExpired$.next();
      } else if (trimmedData === SerialEvent.ALL_GAMES_COMPLETE) {
        this.log.log('🎮 All games complete event received');
        this.allGamesComplete$.next();
      } else if (trimmedData.startsWith(SerialEvent.SCORES_RECEIVED)) {
        this.handleScoresData(trimmedData);
      }
    } catch (error) {
      this.log.error(`Error parsing serial data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleScoresData(data: string) {
    try {
      // Expected format: "SCORES_RECEIVED:{ game1: 100, game2: 200, game3: 0, game4: 150 }"
      const jsonPart = data.substring(data.indexOf(':') + 1);
      const scores: GameScores = JSON.parse(jsonPart);
      
      this.log.log(`📊 Scores received: ${JSON.stringify(scores)}`);
      this.scoresReceived$.next(scores);
    } catch (error) {
      this.log.error(`Error parsing scores data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async sendCommand(command: SerialCommand, parameter?: string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      const commandString = parameter ? `${command}:${parameter}` : command;
      
      this.serialPort.write(`${commandString}\n`, (error) => {
        if (error) {
          this.log.error(`Failed to send command ${commandString}: ${error.message}`);
          reject(error);
        } else {
          this.log.debug(`Sent command: ${commandString}`);
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
}
