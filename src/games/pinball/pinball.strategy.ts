import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { GameStrategy } from '../game-core/game-strategy.interface';
import { GameContext } from 'src/common/interfaces/game-context.interface';
import { SensorEvent } from 'src/common/interfaces/sensor-event.interface';
import * as PinballConfig from '../../config/games/pinball.json';
import { GameResult } from 'src/common/interfaces/game-result.interface';

@StrategyId('pinball')
@Injectable()
export class PinballStrategy implements GameStrategy {
    public static readonly config = PinballConfig;
    private score = 0;

    onGameStart(ctx: GameContext): Observable<void> {
        this.score = 0;
        ctx.display.showSplash('PINBALL', 'Hit for 2 min');
        return of();
    }
    onSensor(ev: SensorEvent, ctx: GameContext): void {
        const s = PinballConfig.sensors.find((x) => x.id === ev.id);
        if (!s) return;
        this.score += s.points;
        ctx.display.updateScore(this.score);
    }
    onTick(sec: number, ctx: GameContext) {
        ctx.display.updateTimer(sec);
    }
    onGameEnd(ctx: GameContext): GameResult {
        return {
            gameId: PinballConfig.id,
            playerTag: ctx.playerTag,
            score: this.score,
            durationSec: PinballConfig.durationSec,
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
