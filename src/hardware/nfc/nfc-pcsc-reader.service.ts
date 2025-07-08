import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NfcReaderService } from '../interfaces/nfc-reader.interface';
import { NFC } from 'nfc-pcsc';

@Injectable()
export class PcscLiteReaderService implements NfcReaderService {
  private readonly tag$ = new Subject<string>();

  constructor() {
    console.log('🔧 PcscLiteReaderService constructor called');

    try {
      const pcsc = new NFC();

      pcsc.on('reader', (reader) => {
        console.log(`reader detected → ${reader.name}`);
        reader.on('card', (card) => {
          this.tag$.next(card.uid);
        });
        reader.on('error', (err) =>
          console.error(`❌ NFC reader error: ${err.message}`),
        );
        reader.on('end', () => console.log('📱 NFC reader removed'));
      });

      pcsc.on('error', (err) => {
        console.error(`❌ PCSC error: ${err.message}`);
      });

      console.log('✅ PCSC NFC reader initialized');
    } catch (error) {
      console.error(
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
