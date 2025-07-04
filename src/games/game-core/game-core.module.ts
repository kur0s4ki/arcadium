import { Module, Provider } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { TimerService } from './timer.service';
import { GameStrategy } from './game-strategy.interface';
import { PinballStrategy } from '../pinball/pinball.strategy';
import { RollerSkateStrategy } from '../roller-skate/roller-skate.strategy';
import { PlinkoStrategy } from '../plinko/plinko.strategy';
import { SpiralStrategy } from '../spiral/spiral.strategy';
import { FortressStrategy } from '../fortress/fortress.strategy';
import { SkeeBallStrategy } from '../skee-ball/skee-ball.strategy';
import { SkyscraperStrategy } from '../skyscraper/skyscraper.strategy';
import { HardwareModule } from 'src/hardware/hardware.module';
import { ApiModule } from 'src/api/api.module';
import { GAME_STRATEGIES } from './token';
import { UiModule } from 'src/ui/ui.module';

const strategies: Provider<GameStrategy>[] = [
  PinballStrategy,
  RollerSkateStrategy,
  PlinkoStrategy,
  SpiralStrategy,
  FortressStrategy,
  SkeeBallStrategy,
  SkyscraperStrategy,
];

const strategyClasses = [
  PinballStrategy,
  RollerSkateStrategy,
  PlinkoStrategy,
  SpiralStrategy,
  FortressStrategy,
  SkeeBallStrategy,
  SkyscraperStrategy,
] as const;

@Module({
  imports: [
    HardwareModule.register(process.env.MODE === 'PROD' ? 'PROD' : 'SIM'), 
    ApiModule,
    UiModule,
  ],
  providers: [
    ...strategyClasses,

    {
      provide: GAME_STRATEGIES,
      useFactory: (...strategies: typeof strategyClasses[number][]) => strategies,
      inject: [...strategyClasses],
    },
    GameEngineService, 
    TimerService
  ],
  exports: [],
})
export class GameCoreModule { }