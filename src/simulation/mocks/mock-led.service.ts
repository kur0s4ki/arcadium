import { Injectable, Logger } from '@nestjs/common';
import { Observable, of, timer } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { LedColor, LedControlService } from '../../hardware/interfaces/led-control.interface';

@Injectable()
export class MockLedService implements LedControlService {
  private readonly log = new Logger(MockLedService.name);
  private currentColor: LedColor = LedColor.NONE;

  setColor(color: LedColor): void {
    this.currentColor = color;
    this.logColorChange(color);
  }

  setColorForDuration(color: LedColor, durationMs: number): Observable<void> {
    this.setColor(color);
    
    return timer(durationMs).pipe(
      tap(() => {
        this.setColor(LedColor.NONE);
      }),
      switchMap(() => of(void 0))
    );
  }

  setColorThenSwitch(color: LedColor, durationMs: number, nextColor: LedColor): Observable<void> {
    this.setColor(color);
    
    return timer(durationMs).pipe(
      tap(() => {
        this.setColor(nextColor);
      }),
      switchMap(() => of(void 0))
    );
  }

  private logColorChange(color: LedColor): void {
    const colorName = this.getColorName(color);
    this.log.log(`[LED] Set color to ${colorName}`);
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
