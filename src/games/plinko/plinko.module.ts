import { Module } from '@nestjs/common';
import { PlinkoStrategy } from './plinko.strategy';
@Module({ providers: [PlinkoStrategy], exports: [PlinkoStrategy] })
export class PlinkoModule {}