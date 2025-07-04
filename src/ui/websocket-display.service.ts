import { Injectable } from '@nestjs/common';
import { DisplayService } from '../hardware/interfaces/display.interface';
import { DisplayGateway } from './display.gateway';

@Injectable()
export class WebsocketDisplayService implements DisplayService {
  private lastScore = 0;
  constructor(private gateway: DisplayGateway) { }

  /** Ignored – front‑end shows its own splash once it receives `{action:'start'}` */
  showSplash(title: string, subtitle?: string): void {
    line('🎮  ' + title);
    if (subtitle) console.log(subtitle);
  }

  /** Emits ±delta each time strategy updates the score */
  updateScore(score: number): void {
    const diff = score - this.lastScore;
    if (diff !== 0) this.gateway.broadcast({ action: 'bonus', points: diff });
    this.lastScore = score;
    console.log('[SCORE] ' + score);
  }

  /** No per‑second timer update – countdown is done client‑side */
  updateTimer(sec: number): void {
    console.log('[TIMER] ' + sec + 's left');
  }

  /** Called once by GameEngine when the round ends */
  showResult(serialised: string): void {

    let data: any;
    try {
      data = JSON.parse(serialised);
    } catch {
      // payload is not valid JSON
      data = { message: serialised };
    }
    try {
      // Safe broadcast: if no clients or error, it's caught
      this.gateway.broadcast({ action: 'end', points: data.score });
    } catch (err) {
      console.warn(`WebSocket broadcast failed.`);
    }

    // auto‑reset 10 s later
    this.lastScore = 0;
    setTimeout(() => {
      try {
        this.gateway.broadcast({ action: 'reset' });
      } catch { }
    }, 10_000);

    line('🏁 RESULT');
    console.log(data.score ?? data.message);
  }
}

function line(title: string) {
  console.log('='.repeat(40));
  console.log(title);
  console.log('='.repeat(40));
}

