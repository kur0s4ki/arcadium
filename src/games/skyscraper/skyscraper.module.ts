import { Module } from '@nestjs/common';
import { SkyscraperStrategy } from './skyscraper.strategy';
@Module({ providers: [SkyscraperStrategy], exports: [SkyscraperStrategy] })
export class SkyscraperModule {}