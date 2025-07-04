import { Module } from '@nestjs/common';
import { PinballStrategy } from './pinball.strategy';
@Module({
  providers: [PinballStrategy],
  exports: [PinballStrategy],
})
export class PinballModule {}