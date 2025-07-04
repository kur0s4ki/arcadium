import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import globalConfig from './config/global';
import validationSchema from './config/validation.schema';
import { HardwareModule } from './hardware/hardware.module';
import { ApiModule } from './api/api.module';
import { UiModule } from './ui/ui.module';
import { GameCoreModule } from './games/game-core/game-core.module';
import { PinballModule } from './games/pinball/pinball.module';
import { RollerSkateModule } from './games/roller-skate/roller-skate.module';
import { PlinkoModule } from './games/plinko/plinko.module';
import { SpiralModule } from './games/spiral/spiral.module';
import { FortressModule } from './games/fortress/fortress.module';
import { SkeeBallModule } from './games/skee-ball/skee-ball.module';
import { SkyscraperModule } from './games/skyscraper/skyscraper.module';
import { SimulationModule } from './simulation/mocks/simulation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [globalConfig],
      validationSchema,
    }),
    HardwareModule.register(process.env.MODE === 'PROD' ? 'PROD' : 'SIM'),
    SimulationModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({ mode: cfg.get('mode') }),
      inject: [ConfigService],
    }),
    ApiModule,
    UiModule,
    GameCoreModule,
    // Game modules (all loaded, engine picks active one)
    PinballModule,
    RollerSkateModule,
    PlinkoModule,
    SpiralModule,
    FortressModule,
    SkeeBallModule,
    SkyscraperModule,
  ],
})
export class AppModule {}