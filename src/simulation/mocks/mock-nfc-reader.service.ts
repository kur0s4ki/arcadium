import { Injectable } from '@nestjs/common';
import { NfcReaderService } from '../../hardware/interfaces/nfc-reader.interface';
import { Subject, Observable } from 'rxjs';
import * as readline from 'node:readline';

@Injectable()
export class MockNfcReaderService implements NfcReaderService {
  private readonly tag$ = new Subject<string>();
  constructor() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.on('keypress', (_, key) => {
      if (key.name === 's') this.tag$.next('123456');
    });
  }
  onTag(): Observable<string> {
    return this.tag$.asObservable();
  }
}
