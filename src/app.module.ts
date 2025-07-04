import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import globalConfig from './config/global';
import validationSchema from './config/validation.schema';
import { HardwareModule } from './hardware/hardware.module';
import { ApiModule } from './api/api.module';
import { TeamArcadeModule } from './team-arcade/team-arcade.module';
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
    TeamArcadeModule,
  ],
})
export class AppModule {}
