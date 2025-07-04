import { PlayerDTO } from './player.dto';

export interface GameManagerDTO {
  code: number;
  message: string;
  playerDTO: PlayerDTO | null;
}