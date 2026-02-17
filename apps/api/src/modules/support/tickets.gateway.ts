import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TicketsService, AddTicketMessageDto } from './tickets.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
}

@WebSocketGateway({
  namespace: '/support',
  cors: { origin: '*' },
})
export class TicketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TicketsGateway.name);
  /** userId → set of socket IDs */
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private ticketsService: TicketsService,
  ) {}

  // ─── Connection handling ───
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      // Auto-join the support:staff room for support/admin
      if (client.userRole === 'SUPPORT' || client.userRole === 'ADMIN') {
        client.join('support:staff');
      }

      this.logger.log(
        `[Support WS] Connected: ${client.userId} (${client.userRole})`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.get(client.userId)?.delete(client.id);
      if (this.userSockets.get(client.userId)?.size === 0) {
        this.userSockets.delete(client.userId);
      }
    }
    this.logger.log(`[Support WS] Disconnected: ${client.id}`);
  }

  // ─── Join a ticket room (to receive live messages) ───
  @SubscribeMessage('joinTicket')
  handleJoinTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    client.join(`ticket:${data.ticketId}`);
    return { event: 'joinedTicket', data: { ticketId: data.ticketId } };
  }

  @SubscribeMessage('leaveTicket')
  handleLeaveTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    client.leave(`ticket:${data.ticketId}`);
  }

  // ─── Send a message in a ticket (real-time) ───
  @SubscribeMessage('ticketMessage')
  async handleTicketMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      ticketId: string;
      content: string;
      attachmentUrl?: string;
      attachmentType?: string;
      isInternal?: boolean;
    },
  ) {
    try {
      const dto: AddTicketMessageDto = {
        content: data.content,
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
        isInternal: data.isInternal,
      };

      const message = await this.ticketsService.addMessage(
        data.ticketId,
        client.userId,
        client.userRole,
        '', // name resolved from DB in service
        dto,
      );

      // Broadcast to everyone in the ticket room
      this.server
        .to(`ticket:${data.ticketId}`)
        .emit('newTicketMessage', message);

      return { event: 'ticketMessageSent', data: message };
    } catch (error: any) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  // ─── Claim ticket (real-time) ───
  @SubscribeMessage('claimTicket')
  async handleClaimTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    try {
      const ticket = await this.ticketsService.claimTicket(
        data.ticketId,
        client.userId,
      );

      // Notify all staff + the ticket room
      this.server.to('support:staff').emit('ticketClaimed', ticket);
      this.server.to(`ticket:${data.ticketId}`).emit('ticketUpdated', ticket);

      return { event: 'ticketClaimSuccess', data: ticket };
    } catch (error: any) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  // ─── Update status (real-time) ───
  @SubscribeMessage('updateTicketStatus')
  async handleUpdateStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { ticketId: string; status: string; note?: string },
  ) {
    try {
      const ticket = await this.ticketsService.updateTicketStatus(
        data.ticketId,
        data.status as any,
        client.userId,
        data.note,
      );

      this.server.to('support:staff').emit('ticketStatusChanged', ticket);
      this.server
        .to(`ticket:${data.ticketId}`)
        .emit('ticketUpdated', ticket);

      return { event: 'statusUpdateSuccess', data: ticket };
    } catch (error: any) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  // ─── Helpers: emit to specific user(s) from outside the gateway ───
  emitToUser(userId: string, event: string, payload: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const sid of sockets) {
        this.server.to(sid).emit(event, payload);
      }
    }
  }

  /** Broadcast new ticket to all support staff in real-time */
  broadcastNewTicket(ticket: any) {
    this.server.to('support:staff').emit('newTicket', ticket);
  }
}
