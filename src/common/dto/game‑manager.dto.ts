export interface TeamGameManagerResponse {
  code: number; // Status code (200 = success, others = error)
  message: string; // Human-readable status message
  team: TeamData | null; // Team information (null on error)
  players: PlayerData[] | null; // Array of team players (null on error)
}

export interface TeamData {
  id: number;
  name: string;
  playerCount: number;
  points: number;
  session: SessionData;
  gamePlay: GamePlayData;
  language: LanguageData;
}

export interface SessionData {
  id: number;
  timestamp: string; // ISO 8601 format
  duration: number; // Duration in seconds
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'STOPPED' | 'FINISHED';
}

export interface GamePlayData {
  id: number;
  description: string;
  duration: number; // Duration in seconds
}

export interface LanguageData {
  id: number;
  code: string; // Language code (e.g., "en", "es")
  name: string; // Language name (e.g., "English", "Spanish")
}

export interface PlayerData {
  id: number;
  badgeId: string;
  badgeActivated: boolean;
  displayName: string;
  firstName: string;
  lastName: string;
  points: number;
  isJackpot: boolean;
  avatarUrl?: string;
  team: {
    id: number;
    name: string;
  };
}

export interface TeamScoreRequest {
  gameId: number; // Required: Target game ID
  players: PlayerScoreData[]; // Required: Array of player scores (min 1 item)
}

export interface PlayerScoreData {
  playerId: number; // Required: Player identifier
  playerPoints: number; // Required: Points achieved by player
  isJackpot?: boolean; // Optional: Jackpot status (default: false)
}
