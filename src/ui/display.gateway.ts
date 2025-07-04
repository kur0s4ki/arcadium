import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger, Injectable } from '@nestjs/common';
import { DisplayMessage } from './dto/display-message.dto';

@Injectable()
@WebSocketGateway(8000, { path: '/ws', cors: { origin: '*' } })
export class DisplayGateway implements OnGatewayConnection {
  private readonly log = new Logger(DisplayGateway.name);
  @WebSocketServer() server: Server;

  handleConnection(client: WebSocket) {
    this.log.log(`💻  Client connected (${this.server.clients.size} total)`);
  }

  /** Broadcasts a typed message to every connected client */
  broadcast(msg: DisplayMessage) {
    const json = JSON.stringify(msg);
    // 🔭 Log every payload for easier debugging
    this.log.debug(`📡  WS payload → ${json}`);
    this.server.clients.forEach((c) => c.readyState === c.OPEN && c.send(json));
  }
}