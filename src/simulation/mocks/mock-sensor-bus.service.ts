import { Injectable } from '@nestjs/common';
import { SensorBusService } from '../../hardware/interfaces/sensor-bus.interface';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { Subject, Observable } from 'rxjs';
import * as readline from 'node:readline';

@Injectable()
export class MockSensorBusService implements SensorBusService {
  private readonly ev$ = new Subject<SensorEvent>();
  constructor() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
      if (key.sequence >= '1' && key.sequence <= '9') {
        const id = 'IR' + key.sequence;
        this.ev$.next({ id, ts: Date.now() });
      }
    });
  }
  onEvent(): Observable<SensorEvent> {
    return this.ev$.asObservable();
  }
}