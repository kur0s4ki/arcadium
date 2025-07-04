import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import globalConfig from './config/global';
import validationSchema from './config/validation.schema';
import { HardwareModule } from './hardware/hardware.module';
import { ApiModule } from './api/api.module';
import { TeamArcadeModule } from './team-arcade/team-arcade.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [globalConfig],
      validationSchema,
    }),
    HardwareModule,
    ApiModule,
    TeamArcadeModule,
  ],
})
export class AppModule {}
