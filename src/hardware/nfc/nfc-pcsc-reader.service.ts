import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NfcReaderService } from '../interfaces/nfc-reader.interface';
import { NFC } from 'nfc-pcsc';

@Injectable()
export class PcscLiteReaderService implements NfcReaderService {
  private readonly tag$ = new Subject<string>();
  private readonly log = new Logger(PcscLiteReaderService.name);

  constructor() {
    const pcsc = new NFC();

    pcsc.on('reader', reader => {
      this.log.log(`reader detected → ${reader.name}`);
      reader.on('card', card => {
        this.tag$.next(card.uid);
      });
      reader.on('error', err => this.log.error(err.message));
      reader.on('end', () => this.log.warn('reader removed'));
    });
  }

  onTag(): Observable<string> {
    return this.tag$.asObservable();
  }
}
