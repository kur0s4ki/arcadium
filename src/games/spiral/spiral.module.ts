import { Module } from '@nestjs/common';
import { SpiralStrategy } from './spiral.strategy';
@Module({ providers: [SpiralStrategy], exports: [SpiralStrategy] })
export class SpiralModule {}