// src/api/api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  TeamGameManagerResponse,
  TeamScoreRequest,
} from '../common/dto/game‑manager.dto';

@Injectable()
export class ApiService {
  private log = new Logger(ApiService.name);

  constructor(private http: HttpService, private cfg: ConfigService) {}

  private baseUrl() {
    return this.cfg.get<string>('global.api.baseUrl');
  }

  /** ➜ GET /authorization */
  async teamAuthorization(
    badgeId: string,
    gameId: number,
  ): Promise<TeamGameManagerResponse> {
    const url = `${this.baseUrl()}/team-authorization`;
    this.log.log(
      `[TEAM-AUTH] Requesting authorization for badge ${badgeId} on game ${gameId}`,
    );

    const { data } = await firstValueFrom(
      this.http.get<TeamGameManagerResponse>(url, {
        params: { badgeId, gameId },
        headers: { Accept: 'application/json' },
      }),
    );

    this.log.log(
      `[TEAM-AUTH] Response code: ${data.code}, message: ${data.message}`,
    );
    return data;
  }

  /** ➜ GET /create-score */
  async teamCreateScore(
    scoreRequest: TeamScoreRequest,
  ): Promise<TeamGameManagerResponse> {
    const url = `${this.baseUrl()}/team-create-score`;
    this.log.log(
      `[TEAM-SCORE] Submitting scores for game ${scoreRequest.gameId} with ${scoreRequest.players.length} players`,
    );

    const { data } = await firstValueFrom(
      this.http.post<TeamGameManagerResponse>(url, scoreRequest, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }),
    );

    this.log.log(
      `[TEAM-SCORE] Response code: ${data.code}, message: ${data.message}`,
    );
    return data;
  }
}
