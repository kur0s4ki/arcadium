import { Injectable } from '@nestjs/common';
import { Subject, Observable, interval, takeUntil, map } from 'rxjs';
@Injectable()
export class TimerService {
  private stop$ = new Subject<void>();
  start(durationSec: number): Observable<number> {
    this.stop$ = new Subject<void>();
    return interval(1000).pipe(
      map((i) => durationSec - i - 1),
      takeUntil(this.stop$),
    );
  }
  stop() {
    this.stop$.next();
  }
}
