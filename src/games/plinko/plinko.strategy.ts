import { Injectable } from '@nestjs/common';
import { GameStrategy } from '../game-core/game-strategy.interface';
import * as PlinkoConfig from '../../config/games/plinko.json';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { GameContext } from '../../common/interfaces/game-context.interface';
import { GameResult } from '../../common/interfaces/game-result.interface';
import { Observable, of } from 'rxjs';

@StrategyId('plinko')
@Injectable()
export class PlinkoStrategy implements GameStrategy {
  public static readonly config = PlinkoConfig;
  private bonus = 0;
  private start = 0;

  onGameStart(ctx: GameContext): Observable<void> {
    this.start = Date.now();
    this.bonus = 0;
    ctx.display.showSplash('PLINKO', 'Fast!');
    return of();
  }
  onSensor(ev: SensorEvent, ctx: GameContext): void {
    const hit = PlinkoConfig.sensors.find(s => s.id === ev.id);
    if (hit) this.bonus += hit.points;
    ctx.timer.stop();
  }
  onGameEnd(ctx: GameContext): GameResult {
    const elapsed = (Date.now() - this.start) / 1000;
    const core = Math.max(PlinkoConfig.maxDurationSec - elapsed, 0) * 10;
    return {
      gameId: PlinkoConfig.id,
      playerTag: ctx.playerTag,
      score: Math.round(core + this.bonus),
      durationSec: elapsed,
      startedAt: ctx.startEpoch,
      finishedAt: Date.now(),
    };
  }
}

function StrategyId(id: string): ClassDecorator {
  return (target: any) => {
    target.id = id;
    return target;
  };
}
