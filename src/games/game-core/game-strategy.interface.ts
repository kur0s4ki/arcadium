import { Observable } from 'rxjs';
import { SensorEvent } from '../../common/interfaces/sensor-event.interface';
import { GameContext } from '../../common/interfaces/game-context.interface';
import { GameResult } from '../../common/interfaces/game-result.interface';
export interface GameStrategy {
  onGameStart(ctx: GameContext): Observable<void>;
  onSensor(event: SensorEvent, ctx: GameContext): void;
  onTick?(secRemaining: number, ctx: GameContext): void;
  onGameEnd(ctx: GameContext): GameResult;
}