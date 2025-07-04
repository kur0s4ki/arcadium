import { Module } from '@nestjs/common';
import { HardwareModule } from '../hardware/hardware.module';
import { ApiModule } from '../api/api.module';
import { TeamArcadeService } from './team-arcade.service';

@Module({
  imports: [HardwareModule, ApiModule],
  providers: [TeamArcadeService],
  exports: [TeamArcadeService],
})
export class TeamArcadeModule {}
