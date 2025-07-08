import { Injectable } from '@nestjs/common';
import { DisplayService } from '../interfaces/display.interface';

@Injectable()
export class ConsoleDisplayService implements DisplayService {
  showSplash(title: string, subtitle?: string): void {
    console.log('='.repeat(50));
    console.log(`🎮  ${title}`);
    if (subtitle) {
      console.log(`    ${subtitle}`);
    }
    console.log('='.repeat(50));
  }

  updateScore(score: number): void {
    console.log(`📊 Score: ${score}`);
  }

  updateTimer(secRemaining: number): void {
    console.log(`⏱️  Time remaining: ${secRemaining}s`);
  }

  showResult(result: string): void {
    console.log('='.repeat(50));
    console.log(`🏁 RESULT: ${result}`);
    console.log('='.repeat(50));
  }
}
