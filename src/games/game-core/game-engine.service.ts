import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NFC_READER,
  SENSOR_BUS,
  DISPLAY,
  LED_CONTROL,
} from '../../hardware/tokens';
import { NfcReaderService } from '../../hardware/interfaces/nfc-reader.interface';
import { SensorBusService } from '../../hardware/interfaces/sensor-bus.interface';
import { DisplayService } from '../../hardware/interfaces/display.interface';
import {
  LedControlService,
  LedColor,
} from '../../hardware/interfaces/led-control.interface';
import { GameStrategy } from './game-strategy.interface';
import { ConfigService } from '@nestjs/config';
import { GameContext } from '../../common/interfaces/game-context.interface';
import { TimerService } from './timer.service';
import { Subject, firstValueFrom } from 'rxjs';
import { ApiService } from '../../api/api.service';
import { GAME_STRATEGIES } from './token';
import { DisplayGateway } from 'src/ui/display.gateway';

@Injectable()
export class GameEngineService {
  private readonly log = new Logger(GameEngineService.name);
  private activeStrategy: GameStrategy;
  constructor(
    @Inject(NFC_READER) private nfc: NfcReaderService,
    @Inject(SENSOR_BUS) private sensors: SensorBusService,
    @Inject(DISPLAY) private display: DisplayService,
    @Inject(LED_CONTROL) private led: LedControlService,
    private cfg: ConfigService,
    private timerSvc: TimerService,
    private api: ApiService,
    private ui: DisplayGateway,
    // Strategies injected via providers token array
    @Inject(GAME_STRATEGIES)
    private readonly strategies: GameStrategy[],
  ) {
    // pick strategy matching activeGame
    const id = cfg.get<string>('global.activeGame');
    this.activeStrategy = this.strategies.find(
      (s: any) => (s.constructor as any).id === id,
    ) as GameStrategy;
    if (!this.activeStrategy) throw new Error(`No strategy for game '${id}'`);

    this.run();
  }

  private async run() {
    this.display.showSplash('Scan your ball');
    // Set green LED while waiting for player
    this.led.setColor(LedColor.GREEN);
    const tag = await firstValueFrom(this.nfc.onTag());
    const gameId = this.cfg.get<number>('global.gameId') ?? 1;

    const adminBadges = this.cfg.get<string[]>('global.adminBadges') ?? [];
    const isAdmin = adminBadges.includes(tag);

    let player: any;
    if (isAdmin) {
      this.log.warn(`Admin badge '${tag}' detected – bypassing API`);
      player = { id: 0, badgeId: tag, displayName: 'Admin' };
    } else {
      const auth = await this.api.authorize(tag, gameId).catch(() => {});
      if (!auth || auth.code !== 200 || !auth.playerDTO) {
        this.display.showResult('🚫 Unauthorized');
        return this.run();
      }
      player = auth.playerDTO;
    }

    const cfg: any = (this.activeStrategy as any).constructor?.config ?? {};

    // Compose and log the message once so we can both send and trace it
    const startMsg = {
      action: 'start',
      gameName: cfg.gameName,
      instructions: cfg.instructions,
      playerDisplayName: player.displayName,
      timer: cfg.type === 'POINTS' ? cfg.durationSec : cfg.maxDurationSec,
    } as const;

    this.log.debug(
      `➡️  Broadcasting start message: ${JSON.stringify(startMsg)}`,
    );
    this.ui.broadcast(startMsg);

    // 🏁 Start game
    const ctx: GameContext = {
      display: this.display,
      timer: this.timerSvc,
      led: this.led,
      startEpoch: Date.now(),
      playerId: player.id,
      playerTag: tag,
    };

    // Set yellow LED for game in progress
    this.led.setColor(LedColor.YELLOW);
    this.activeStrategy.onGameStart(ctx).subscribe();
    const gameDuration =
      cfg.type === 'POINTS' ? cfg.durationSec : cfg.maxDurationSec;
    console.log('DEBUG - Game-specific duration:', gameDuration);
    const timer$ = this.timerSvc.start(
      gameDuration || this.cfg.get('global.game.durationSec', 120),
    );
    const stop$ = new Subject<void>();

    // tick subscription
    // NEW
    timer$.subscribe({
      next: (sec) => {
        if (this.activeStrategy.onTick) this.activeStrategy.onTick(sec, ctx);
        this.log.verbose(`⏱️  Tick → ${sec}s remaining`);
        if (sec <= 0) stop$.next(); // natural timeout
      },
      complete: () => stop$.next(), // early stop (HOLE mode)
    });

    // sensor subscription
    const sensorSub = this.sensors.onEvent().subscribe((ev) => {
      // Trace every hardware event as it arrives
      this.log.debug(`🔌  Sensor event: ${JSON.stringify(ev)}`);

      // Bonus event: Green LED for 2 seconds, then Yellow LED
      this.led
        .setColorThenSwitch(LedColor.GREEN, 2000, LedColor.YELLOW)
        .subscribe();

      this.activeStrategy.onSensor(ev, ctx);
    });

    // await stop
    await firstValueFrom(stop$);
    this.timerSvc.stop();
    sensorSub.unsubscribe(); // unsubscribe from sensor events
    const result = this.activeStrategy.onGameEnd(ctx);
    this.display.showResult(JSON.stringify(result));

    this.log.log(`🏁  Game finished – result: ${JSON.stringify(result)}`);

    // Handle game result with LED feedback
    if (result.score > 0) {
      // Game won: Green LED for 3 seconds
      await firstValueFrom(this.led.setColorForDuration(LedColor.GREEN, 3000));
    } else {
      // Game lost: Red LED for 3 seconds
      await firstValueFrom(this.led.setColorForDuration(LedColor.RED, 3000));
    }

    // End of game: Blue LED
    this.led.setColor(LedColor.BLUE);

    if (!isAdmin) {
      await this.api.createScore(ctx.playerId, gameId, result.score);
    }
    this.log.log('Game finished -> score posted');

    // Wait for 3 seconds with blue LED before restarting
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return this.run(); // restart game
  }
}
