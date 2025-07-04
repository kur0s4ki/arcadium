import { Injectable } from '@nestjs/common';
import { DisplayService } from '../../hardware/interfaces/display.interface';

function line(title: string) {
  console.log('='.repeat(40));
  console.log(title);
  console.log('='.repeat(40));
}

@Injectable()
export class ConsoleDisplayService implements DisplayService {
  showSplash(title: string, subtitle?: string): void {
    line('🎮  ' + title);
    if (subtitle) console.log(subtitle);
  }
  updateScore(score: number): void {
    console.log('[SCORE] ' + score);
  }
  updateTimer(sec: number): void {
    console.log('[TIMER] ' + sec + 's left');
  }
  showResult(result: string): void {
    line('🏁 RESULT');
    console.log(result);
  }
}