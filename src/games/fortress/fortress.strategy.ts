import { Injectable } from '@nestjs/common';
import { GameStrategy } from '../game-core/game-strategy.interface';
import * as FortressConfig from '../../config/games/fortress.json';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { GameResult } from '../../common/interfaces/game-result.interface';
import { Observable, of } from 'rxjs';

@StrategyId('fortress')
@Injectable()
export class FortressStrategy implements GameStrategy {
    public static readonly config = FortressConfig;
    private score = 0;
    
    onGameStart(ctx): Observable<void> {
        this.score = 0;
        ctx.display.showSplash('FORTRESS');
        return of();
    }
    onSensor(ev: SensorEvent, ctx) { const s = FortressConfig.sensors.find((x) => x.id === ev.id); if (s) { this.score += s.points; ctx.display.updateScore(this.score); } }
    onTick(sec, ctx) { ctx.display.updateTimer(sec); }
    onGameEnd(ctx): GameResult { return { gameId: FortressConfig.id, playerTag: ctx.playerTag, score: this.score, durationSec: FortressConfig.durationSec, startedAt: ctx.startEpoch, finishedAt: Date.now() }; }
}

function StrategyId(id: string): ClassDecorator {
    return (target: any) => {
        target.id = id;
        return target;
    };
}