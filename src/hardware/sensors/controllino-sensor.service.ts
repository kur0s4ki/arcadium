import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { SensorBusService } from '../interfaces/sensor-bus.interface';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// Dynamically support serialport v9 (constructor expects path first) and v10 (options object)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SerialPortPkg = require('serialport');
const SerialCtor: any = SerialPortPkg.SerialPort ?? SerialPortPkg;

/*
 * Serial‑line parameters now come from `global.json → hardware.controllino.serial`.
 * Fallbacks ensure legacy defaults still work if the JSON entry is missing.
 */
interface SerialCfg {
  baudRate: number;
  vendorId: string;
  defaultPort: string;
}

@Injectable()
export class ControllinoSensorService
  implements SensorBusService, OnModuleInit
{
  private readonly log = new Logger(ControllinoSensorService.name);

  private port!: any; // SerialPort instance
  private readonly chunks: string[] = [];
  /** Last emit timestamp for every sensor, used for simple debounce */
  private readonly lastHit: Record<string, number> = {};
  /** Minimal delay between two consecutive hits of the *same* sensor */
  private static readonly DEBOUNCE_MS = 120; // ms – tweak to taste
  private readonly ev$ = new Subject<SensorEvent>();

  constructor(private cfg: ConfigService) {}

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  onEvent(): Observable<SensorEvent> {
    return this.ev$.asObservable();
  }

  /**
   * Send a command to the Controllino
   * @param command The command to send
   */
  sendCommand(command: string): void {
    if (!this.port || !this.port.isOpen) {
      this.log.warn('Cannot send command - serial port not open');
      return;
    }

    this.log.debug(`Sending command to Controllino: ${command}`);
    this.port.write(command);
  }

  /**
   * Check if the serial port is open
   */
  isSerialPortOpen(): boolean {
    return this.port && this.port.isOpen;
  }

  async onModuleInit() {
    await this.openSerial();
  }

  /* ------------------------------------------------------------------ */
  /*  Serial initialisation                                             */
  /* ------------------------------------------------------------------ */

  private async openSerial() {
    const serialCfg: SerialCfg = this.cfg.get<SerialCfg>(
      'global.hardware.controllino.serial',
    ) ?? {
      baudRate: 9600,
      vendorId: '2341',
      defaultPort: '/dev/ttyACM0',
    };

    // 1️⃣  Explicit env override still wins (WINDOWS: e.g. "COM9")
    let path = serialCfg.defaultPort;
    if (path) {
      this.log.log(`Using port from env/global.json → ${path}`);
    } else {
      // 2️⃣  Auto‑detect by USB vendorId (works on Linux & macOS; vendorId often undefined on Windows)
      const ports = await SerialPortPkg.list();
      const info = ports.find(
        (p: any) =>
          (p.vendorId ?? '').toLowerCase() === serialCfg.vendorId.toLowerCase(),
      );
      if (!info) {
        throw new Error(
          `Controllino not found. Provide PORT=<COMx> env var or define "defaultPort" in global.json`,
        );
      }
      path = info.path;
    }

    /* open */
    this.port = new SerialCtor(path, {
      baudRate: serialCfg.baudRate,
      autoOpen: false,
    });

    this.port.once('open', () => {
      this.log.log(`Controllino opened on ${path}`);
      // Initial poll to get the current mask
      this.port.write('I');
    });

    this.port.on('data', (buf: Buffer) => this.onChunk(buf));
    this.port.on('error', (err: Error) => this.log.error(err.message));
    this.port.open();
  }

  /* ------------------------------------------------------------------ */
  /*  Parsing                                                           */
  /* ------------------------------------------------------------------ */

  private onChunk(buf: Buffer) {
    this.chunks.push(buf.toString('ascii'));
    this.parseChunks();
  }

  private parseChunks() {
    let buffer = this.chunks.join('');
    while (true) {
      const i = buffer.indexOf('I');
      if (i < 0 || buffer.length - i < 7) break; // no complete frame yet
      const frame = buffer.substring(i, i + 7); // I + 2 + 4
      buffer = buffer.substring(i + 7);
      this.handleFrame(frame);
    }
    // keep remainder for next round
    this.chunks.length = 0;
    if (buffer.length) this.chunks.push(buffer);
  }

  private handleFrame(frame: string) {
    // Ex: "I01A0F3"
    const maskHex = frame.substring(3, 7);
    const mask = parseInt(maskHex, 16);
    if (Number.isNaN(mask)) return;

    const now = Date.now();

    // Iterate over *currently high* bits – treat each high level as a potential hit, but debounce.
    for (let bit = 0; bit < 16; bit++) {
      if (mask & (1 << bit)) {
        const id = 'IR' + (bit + 1);

        // Skip if the last hit was too recent (simple debounce)
        if (
          now - (this.lastHit[id] ?? 0) <
          ControllinoSensorService.DEBOUNCE_MS
        ) {
          continue;
        }

        this.lastHit[id] = now;
        this.ev$.next({ id, ts: now });
        this.log.log(`IR hit → ${id}`);
      }
    }
  }
}
