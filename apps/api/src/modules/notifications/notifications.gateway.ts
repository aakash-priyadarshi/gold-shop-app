import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
}

/**
 * Real-time delivery channel for in-app notifications.
 *
 * Every authenticated client joins a private room `user:<userId>`. When a
 * notification is created for that user (including admin broadcasts), the
 * service emits a `notification` event to that room so the bell updates
 * instantly instead of waiting for the 30s polling interval.
 */
@WebSocketGateway({
  namespace: "/notifications",
  cors: { origin: "*" },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      client.join(`user:${client.userId}`);

      this.logger.log(
        `[Notifications WS] Connected: ${client.userId} (${client.userRole})`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`[Notifications WS] Disconnected: ${client.id}`);
  }

  /** Push a freshly created notification to the recipient in real time. */
  emitToUser(userId: string, notification: unknown) {
    if (!userId) return;
    this.server?.to(`user:${userId}`).emit("notification", notification);
  }
}
