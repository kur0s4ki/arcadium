import { Module } from '@nestjs/common';
import { DisplayGateway } from './display.gateway';
import { WebsocketDisplayService } from './websocket-display.service';

@Module({
  providers: [DisplayGateway, WebsocketDisplayService],
  exports: [DisplayGateway, WebsocketDisplayService],
})
export class UiModule {}
