import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly userSockets = new Map<string, string[]>(); // userId -> socketIds

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);
      client.join(`user:${userId}`);
      this.logger.log(
        `Client connected: user:${userId} (socketId: ${client.id})`,
      );
    } else {
      this.logger.log(`Anonymous client connected: socketId: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      let sockets = this.userSockets.get(userId) || [];
      sockets = sockets.filter((id) => id !== client.id);
      if (sockets.length > 0) {
        this.userSockets.set(userId, sockets);
      } else {
        this.userSockets.delete(userId);
      }
      this.logger.log(
        `Client disconnected: user:${userId} (socketId: ${client.id})`,
      );
    } else {
      this.logger.log(`Anonymous client disconnected: socketId: ${client.id}`);
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.log(`Sent real-time event '${event}' to user:${userId}`);
  }

  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Sent real-time event '${event}' to all users`);
  }

  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }
}
