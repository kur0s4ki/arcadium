import { Injectable } from '@nestjs/common';
import { GameStrategy } from '../game-core/game-strategy.interface';
import * as SkeeBallConfig from '../../config/games/skee-ball.json';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { GameResult } from '../../common/interfaces/game-result.interface';
import { Observable, of } from 'rxjs';

@StrategyId('skee-ball')
@Injectable()
export class SkeeBallStrategy implements GameStrategy {
  public static readonly config = SkeeBallConfig;
  private score = 0;

  onGameStart(ctx): Observable<void> { ctx.display.showSplash('SKEE BALL'); this.score = 0; return of(); }
  onSensor(ev: SensorEvent, ctx) { const s = SkeeBallConfig.sensors.find((x) => x.id === ev.id); if (s) { this.score += s.points; ctx.display.updateScore(this.score);} }
  onTick(sec, ctx) { ctx.display.updateTimer(sec); }
  onGameEnd(ctx): GameResult { return { gameId: SkeeBallConfig.id, playerTag: ctx.playerTag, score: this.score, durationSec: SkeeBallConfig.durationSec, startedAt: ctx.startEpoch, finishedAt: Date.now() }; }
}

function StrategyId(id: string): ClassDecorator {
    return (target: any) => {
        target.id = id;
        return target;
    };
}
