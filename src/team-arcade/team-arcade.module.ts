import { Module, OnModuleInit } from '@nestjs/common';
import { HardwareModule } from '../hardware/hardware.module';
import { ApiModule } from '../api/api.module';
import { TeamArcadeService } from './team-arcade.service';

@Module({
  imports: [HardwareModule, ApiModule],
  providers: [TeamArcadeService],
  exports: [TeamArcadeService],
})
export class TeamArcadeModule implements OnModuleInit {
  constructor(private teamArcadeService: TeamArcadeService) {}

  async onModuleInit() {
    console.log('🔧 TeamArcadeModule initialized - service should be starting');
    // The service will initialize itself via its own OnModuleInit
  }
}
