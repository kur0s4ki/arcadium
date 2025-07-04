import { Module } from '@nestjs/common';
import { RollerSkateStrategy } from './roller-skate.strategy';
@Module({ providers: [RollerSkateStrategy], exports: [RollerSkateStrategy] })
export class RollerSkateModule {}