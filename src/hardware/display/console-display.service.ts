import { Injectable, Logger } from '@nestjs/common';
import { DisplayService } from '../interfaces/display.interface';

@Injectable()
export class ConsoleDisplayService implements DisplayService {
  private readonly log = new Logger(ConsoleDisplayService.name);

  showSplash(title: string, subtitle?: string): void {
    this.log.log('='.repeat(50));
    this.log.log(`🎮  ${title}`);
    if (subtitle) {
      this.log.log(`    ${subtitle}`);
    }
    this.log.log('='.repeat(50));
  }

  updateScore(score: number): void {
    this.log.log(`📊 Score: ${score}`);
  }

  updateTimer(secRemaining: number): void {
    this.log.log(`⏱️  Time remaining: ${secRemaining}s`);
  }

  showResult(result: string): void {
    this.log.log('='.repeat(50));
    this.log.log(`🏁 RESULT: ${result}`);
    this.log.log('='.repeat(50));
  }
}
