import { Observable } from 'rxjs';

export interface SerialControlService {
  // Room control commands
  turnOnLighting(): Promise<void>;
  turnOffLighting(): Promise<void>;
  openAccessLatch(): Promise<void>;
  closeAccessLatch(): Promise<void>;
  
  // Game control commands
  startArcades(maxGames: number): Promise<void>;
  stopArcades(): Promise<void>;
  stopTimers(): Promise<void>;
  
  // Display commands
  displayInstructions(instructions: string): Promise<void>;
  showWin(): Promise<void>;
  showLoss(): Promise<void>;
  showJackpotAnimation(): Promise<void>;
  celebrate(): Promise<void>;
  
  // Access control
  sendAccessDenied(): Promise<void>;
  
  // Event monitoring
  onRoomTimerExpired(): Observable<void>;
  onAllGamesComplete(): Observable<void>;
  onScoresReceived(): Observable<GameScores>;
}

export interface GameScores {
  game1: number;
  game2: number;
  game3: number;
  game4: number;
}

export enum SerialCommand {
  TURN_ON_LIGHTING = 'LIGHT_ON',
  TURN_OFF_LIGHTING = 'LIGHT_OFF',
  OPEN_ACCESS = 'OPEN_LATCH',
  CLOSE_ACCESS = 'CLOSE_LATCH',
  START_ARCADES = 'START_ARCADES',
  STOP_ARCADES = 'STOP_ARCADES',
  STOP_TIMERS = 'STOP_TIMERS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SHOW_WIN = 'SHOW_WIN',
  SHOW_LOSS = 'SHOW_LOSS',
  JACKPOT_ANIMATION = 'JACKPOT_ANIMATION',
  CELEBRATE = 'CELEBRATE',
  DISPLAY_INSTRUCTIONS = 'DISPLAY_INSTRUCTIONS'
}

export enum SerialEvent {
  ROOM_TIMER_EXPIRED = 'ROOM_TIMER_EXPIRED',
  ALL_GAMES_COMPLETE = 'ALL_GAMES_COMPLETE',
  SCORES_RECEIVED = 'SCORES_RECEIVED'
}
