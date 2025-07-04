// src/api/api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GameManagerDTO } from '../common/dto/game‑manager.dto';

@Injectable()
export class ApiService {
  private log = new Logger(ApiService.name);

  constructor(private http: HttpService, private cfg: ConfigService) {}

  private baseUrl() {
    return this.cfg.get<string>('global.api.baseUrl');
  }

  /** ➜ GET /authorization */
  async authorize(badgeId: string, gameId: number): Promise<GameManagerDTO> {
    const url = `${this.baseUrl()}/authorization`;
    const { data } = await firstValueFrom(
      this.http.get<GameManagerDTO>(url, { params: { badgeId, gameId } }),
    );
    return data;
  }

  /** ➜ GET /create-score */
  async createScore(
    playerId: number,
    gameId: number,
    playerPoints: number,
  ): Promise<GameManagerDTO> {
    const url = `${this.baseUrl()}/create-score`;
    const { data } = await firstValueFrom(
      this.http.get<GameManagerDTO>(url, {
        params: { playerId, gameId, playerPoints },
      }),
    );
    // this.log.log(`[SCORE] ${JSON.stringify(data)}`);
    return data;
  }
}
