import { Injectable } from '@nestjs/common';
import { GameStrategy } from '../game-core/game-strategy.interface';
import * as SkyscraperConfig from '../../config/games/skyscraper.json';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { GameContext } from '../../common/interfaces/game-context.interface';
import { GameResult } from '../../common/interfaces/game-result.interface';
import { Observable, of } from 'rxjs';

@StrategyId('skyscraper')
@Injectable()
export class SkyscraperStrategy implements GameStrategy {
  public static readonly config = SkyscraperConfig;
  private bonus = 0; private start = 0;

  onGameStart(ctx): Observable<void> { this.start = Date.now(); this.bonus = 0; ctx.display.showSplash('SKYSCRAPER', 'Fast!'); return of(); }
  onSensor(ev: SensorEvent, ctx: GameContext): void {
    const hit = SkyscraperConfig.sensors.find(s => s.id === ev.id);
    if (hit) this.bonus += hit.points;
    console.log(`Sensor ${ev.id} hit! Bonus: ${this.bonus}`);
    ctx.timer.stop();
  }
  onGameEnd(ctx): GameResult {
    console.log(`Game ended! Bonus: ${this.bonus}`); 
    const elapsed = (Date.now() - this.start) / 1000; 
    const core = Math.max(SkyscraperConfig.maxDurationSec - elapsed, 0) * 10; 
    return { gameId: SkyscraperConfig.id, playerTag: ctx.playerTag, score: Math.round(core + this.bonus), durationSec: elapsed, startedAt: ctx.startEpoch, finishedAt: Date.now() }; }
}

function StrategyId(id: string): ClassDecorator {
  return (target: any) => {
    target.id = id;
    return target;
  };
}
