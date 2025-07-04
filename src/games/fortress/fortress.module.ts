import { Module } from '@nestjs/common';
import { FortressStrategy } from './fortress.strategy';
@Module({ providers: [FortressStrategy], exports: [FortressStrategy] })
export class FortressModule {}