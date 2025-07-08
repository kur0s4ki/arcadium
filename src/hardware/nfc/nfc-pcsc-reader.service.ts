import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NfcReaderService } from '../interfaces/nfc-reader.interface';
import { NFC } from 'nfc-pcsc';

@Injectable()
export class PcscLiteReaderService implements NfcReaderService {
  private readonly tag$ = new Subject<string>();
  private readonly log = new Logger(PcscLiteReaderService.name);

  constructor() {
    this.log.log('🔧 PcscLiteReaderService constructor called');

    try {
      const pcsc = new NFC();

      pcsc.on('reader', (reader) => {
        this.log.log(`reader detected → ${reader.name}`);
        reader.on('card', (card) => {
          this.tag$.next(card.uid);
        });
        reader.on('error', (err) => this.log.error(err.message));
        reader.on('end', () => this.log.warn('reader removed'));
      });

      pcsc.on('error', (err) => {
        this.log.error(`PCSC error: ${err.message}`);
      });

      this.log.log('✅ PCSC NFC reader initialized');
    } catch (error) {
      this.log.error(
        `❌ Failed to initialize PCSC: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Continue without PCSC - for development we can simulate badge scans
    }
  }

  onTag(): Observable<string> {
    return this.tag$.asObservable();
  }
}
