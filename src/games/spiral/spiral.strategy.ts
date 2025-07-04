import { Injectable } from '@nestjs/common';
import { GameStrategy } from '../game-core/game-strategy.interface';
import * as SpiralConfig from '../../config/games/spiral.json';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { GameResult } from '../../common/interfaces/game-result.interface';
import { Observable, of } from 'rxjs';

@StrategyId('spiral')
@Injectable()
export class SpiralStrategy implements GameStrategy {
  public static readonly config = SpiralConfig;
  private score = 0;
  onGameStart(ctx): Observable<void> { ctx.display.showSplash('SPIRAL'); this.score = 0; return of(); }
  onSensor(ev: SensorEvent, ctx) {
    const s = SpiralConfig.sensors.find((x) => x.id === ev.id);
    if (s) { this.score += s.points; ctx.display.updateScore(this.score);} }
  onTick(sec, ctx) { ctx.display.updateTimer(sec); }
  onGameEnd(ctx): GameResult {
    return { gameId: SpiralConfig.id, playerTag: ctx.playerTag, score: this.score, durationSec: SpiralConfig.durationSec, startedAt: ctx.startEpoch, finishedAt: Date.now() }; }
}

function StrategyId(id: string): ClassDecorator {
    return (target: any) => {
        target.id = id;
        return target;
    };
}
