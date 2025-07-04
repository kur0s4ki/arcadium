import { TimerService } from 'src/games/game-core/timer.service';
import { DisplayService } from 'src/hardware/interfaces/display.interface';
import { LedControlService } from 'src/hardware/interfaces/led-control.interface';

export interface GameContext {
  display: DisplayService;
  timer: TimerService;
  led: LedControlService;
  startEpoch: number;
  playerId: number;
  playerTag: string;
}
