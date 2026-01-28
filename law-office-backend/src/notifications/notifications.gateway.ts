import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  /**
   * Send notification to a specific user (in-app via WebSocket)
   */
  sendNotification(userId: string, message: any) {
    this.server.to(userId).emit('notification', message);
  }

  /**
   * Client joins their own "room" using their userId.
   * This allows targeting them individually.
   */
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(userId);
    return { event: 'joined', userId };
  }
}
