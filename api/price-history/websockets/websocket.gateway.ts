import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ port: 5201, cors: { origin: ['https://jukebar.ovh', 'https://www.jukebar.ovh'] } })
  export class PriceHistoryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log(`[WebSocket] Instance ID: ${process.pid}`);
    console.log('WebSocket server initialized and ready to accept connections');
  }
  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }

  sendPriceUpdate(update: any) {
    this.server.emit('price-updates', update);
  }
  closeServer() {
    this.server.close(() => {
      console.log('WebSocket server closed');
    });
}
}