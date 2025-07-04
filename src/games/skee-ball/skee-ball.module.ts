import { Module } from '@nestjs/common';
import { SkeeBallStrategy } from './skee-ball.strategy';
@Module({ providers: [SkeeBallStrategy], exports: [SkeeBallStrategy] })
export class SkeeBallModule {}
