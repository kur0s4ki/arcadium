import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Observable, of, timer } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import {
  LedColor,
  LedControlService,
} from '../interfaces/led-control.interface';
import { SENSOR_BUS } from '../tokens';
import { ControllinoSensorService } from '../sensors/controllino-sensor.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ControllinoLedService implements LedControlService, OnModuleInit {
  private currentColor: LedColor = LedColor.NONE;

  // Output pin mapping from configuration
  private OUTPUT_RED: string;
  private OUTPUT_GREEN: string;
  private OUTPUT_BLUE: string;

  constructor(
    private configService: ConfigService,
    @Inject(SENSOR_BUS) private controllinoSensor: ControllinoSensorService,
  ) {
    // Load output mappings from configuration
    this.OUTPUT_RED = this.configService.get<string>(
      'global.hardware.controllino.outputs.redLed',
      '01',
    );
    this.OUTPUT_GREEN = this.configService.get<string>(
      'global.hardware.controllino.outputs.greenLed',
      '02',
    );
    this.OUTPUT_BLUE = this.configService.get<string>(
      'global.hardware.controllino.outputs.blueLed',
      '03',
    );

    console.log(
      `LED output mapping: Red=${this.OUTPUT_RED}, Green=${this.OUTPUT_GREEN}, Blue=${this.OUTPUT_BLUE}`,
    );
  }

  async onModuleInit() {
    // Initialize LEDs to off when the service starts
    this.setColor(LedColor.NONE);
  }

  setColor(color: LedColor): void {
    if (this.currentColor === color) return; // No change needed

    this.currentColor = color;
    this.sendColorCommand(color);
    this.logColorChange(color);
  }

  setColorForDuration(color: LedColor, durationMs: number): Observable<void> {
    this.setColor(color);

    return timer(durationMs).pipe(
      tap(() => {
        this.setColor(LedColor.NONE);
      }),
      switchMap(() => of(void 0)),
    );
  }

  setColorThenSwitch(
    color: LedColor,
    durationMs: number,
    nextColor: LedColor,
  ): Observable<void> {
    this.setColor(color);

    return timer(durationMs).pipe(
      tap(() => {
        this.setColor(nextColor);
      }),
      switchMap(() => of(void 0)),
    );
  }

  private sendColorCommand(color: LedColor): void {
    if (!this.controllinoSensor.isSerialPortOpen()) {
      // Serial port not open - skip LED command
      return;
    }

    // Map LED color to output pins
    // Red → Output 1, Green → Output 2, Blue → Output 3
    // Using protocol: O<OUTPUT_NUMBER><VALUE> where VALUE is 1 for ON and 0 for OFF

    switch (color) {
      case LedColor.NONE:
        // Turn off all LEDs
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_RED}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_GREEN}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_BLUE}0`);
        break;
      case LedColor.RED:
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_RED}1`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_GREEN}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_BLUE}0`);
        break;
      case LedColor.GREEN:
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_RED}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_GREEN}1`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_BLUE}0`);
        break;
      case LedColor.YELLOW:
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_RED}1`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_GREEN}1`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_BLUE}0`);
        break;
      case LedColor.BLUE:
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_RED}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_GREEN}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_BLUE}1`);
        break;
      default:
        // Default to all off
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_RED}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_GREEN}0`);
        this.controllinoSensor.sendCommand(`O${this.OUTPUT_BLUE}0`);
    }
  }

  private logColorChange(color: LedColor): void {
    const colorName = this.getColorName(color);
    console.log(`[LED] Set color to ${colorName}`);
  }

  private getColorName(color: LedColor): string {
    switch (color) {
      case LedColor.NONE:
        return 'NONE';
      case LedColor.RED:
        return 'RED';
      case LedColor.GREEN:
        return 'GREEN';
      case LedColor.YELLOW:
        return 'YELLOW';
      case LedColor.BLUE:
        return 'BLUE';
      default:
        return 'UNKNOWN';
    }
  }
}
