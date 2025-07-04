import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NfcReaderService } from '../interfaces/nfc-reader.interface';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SerialPort = require('serialport');

@Injectable()
export class Rs232ReaderService implements NfcReaderService, OnModuleInit {
  private readonly tag$ = new Subject<string>();
  private readonly log = new Logger(Rs232ReaderService.name);
  private serialPort: any = null;
  private receivedData: string = '';
  private lastEmittedData: string | null = null;

  constructor(private cfg: ConfigService) {}

  async onModuleInit() {
    await this.initSerialPort();
  }

  private async initSerialPort() {
    try {
      const ports = await SerialPort.list();
      this.log.log(
        `Available serial ports: ${ports.map((p) => p.path).join(', ')}`,
      );

      // Get the configured port path
      const defaultPort = this.cfg.get<string>(
        'global.hardware.rs232.defaultPort',
        '/dev/ttyUSB0',
      );

      // Use the configured port directly instead of searching by vendor ID
      this.log.log(`Using configured RS232 port: ${defaultPort}`);

      // Initialize serial port
      this.serialPort = new SerialPort(defaultPort, {
        baudRate: this.cfg.get<number>('global.hardware.rs232.baudRate', 9600),
        autoOpen: false,
      });

      this.serialPort.open();

      // Initialize receivedData to empty string
      this.receivedData = '';

      this.serialPort.on('data', (data) => {
        // Convert buffer to string and append to receivedData
        const dataStr = data.toString();
        this.receivedData += dataStr;

        // Debug the received data
        this.log.debug(
          `Received data: ${dataStr} (buffer length: ${this.receivedData.length})`,
        );

        // Check if we have a complete message
        if (this.receivedData.includes('\r\n')) {
          // Process each complete message in the buffer
          const messages = this.receivedData.split('\r\n');

          // Keep the last incomplete message (if any)
          this.receivedData = messages.pop() || '';

          // Process complete messages
          for (const message of messages) {
            if (message.length >= 10) {
              // Adjust minimum length as needed
              const trimmedMessage = message.trim();
              const badgeId = trimmedMessage.substring(2); // Extract badge ID from message

              this.log.log(`Badge detected → ${badgeId}`);

              // Prevent duplicate badge reads
              if (badgeId !== this.lastEmittedData) {
                this.tag$.next(badgeId);

                // Update last emitted data
                this.lastEmittedData = badgeId;

                // Reset lastEmittedData after timeout
                setTimeout(() => {
                  this.lastEmittedData = null;
                }, 5000);
              } else {
                this.log.debug(`Duplicate badge read detected: ${badgeId}`);
              }
            }
          }
        }
      });

      this.serialPort.on('error', (err) =>
        this.log.error(`Serial port error: ${err.message}`),
      );
    } catch (error: unknown) {
      // Type-safe error handling
      if (error instanceof Error) {
        this.log.error(`Error initializing RS232 reader: ${error.message}`);
      } else {
        this.log.error(`Error initializing RS232 reader: ${String(error)}`);
      }
    }
  }

  onTag(): Observable<string> {
    return this.tag$.asObservable();
  }
}
