import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export default registerAs('global', () => {
  const file = path.join(__dirname, 'global.json');
  const cfg: any = JSON.parse(fs.readFileSync(file, 'utf8'));

  return {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : cfg.port,

    gameId: process.env.GAME_ID
      ? parseInt(process.env.GAME_ID, 10)
      : cfg.gameId,

    stationId: process.env.STATION_ID ? process.env.STATION_ID : cfg.stationId,

    mode: process.env.MODE ? process.env.MODE : cfg.mode,

    api: {
      baseUrl: process.env.API_BASE ? process.env.API_BASE : cfg.api.baseUrl,
    },

    gameRules: {
      roomDurationMinutes: process.env.ROOM_DURATION_MINUTES
        ? parseInt(process.env.ROOM_DURATION_MINUTES, 10)
        : cfg.gameRules.roomDurationMinutes,
      maxGamesPerSession: process.env.MAX_GAMES_PER_SESSION
        ? parseInt(process.env.MAX_GAMES_PER_SESSION, 10)
        : cfg.gameRules.maxGamesPerSession,
      individualGameDurationMinutes:
        cfg.gameRules.individualGameDurationMinutes,
      jackpotThreshold: process.env.JACKPOT_THRESHOLD
        ? parseInt(process.env.JACKPOT_THRESHOLD, 10)
        : cfg.gameRules.jackpotThreshold,
      gameInstructions: cfg.gameRules.gameInstructions,
    },

    hardware: {
      ...cfg.hardware,
      simulator: {
        host:
          process.env.SIMULATOR_HOST ||
          cfg.hardware?.simulator?.host ||
          'localhost',
        port: process.env.SIMULATOR_PORT
          ? parseInt(process.env.SIMULATOR_PORT, 10)
          : cfg.hardware?.simulator?.port || 9999,
      },
    },
    adminBadges: cfg.adminBadges,
  };
});
