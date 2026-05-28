import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
  OnGatewayDisconnect, OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppGateway.name);

  // Map userId -> Set<socketId>
  private userSockets = new Map<string, Set<string>>();
  // Map orgId -> Set<socketId>
  private orgSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.organizationId = payload.organizationId;
      client.data.role = payload.role;

      // Join org room
      client.join(`org:${payload.organizationId}`);
      client.join(`user:${payload.sub}`);

      // Track connections
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      if (!this.orgSockets.has(payload.organizationId)) {
        this.orgSockets.set(payload.organizationId, new Set());
      }
      this.orgSockets.get(payload.organizationId)!.add(client.id);

      this.logger.debug(`Client connected: ${client.id} — User: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const { userId, organizationId } = client.data;

    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
    }
    if (organizationId) {
      this.orgSockets.get(organizationId)?.delete(client.id);
    }

    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // =====================================================================
  // EMIT TO ORG — broadcast to all connections in an organization
  // =====================================================================
  emitToOrg(organizationId: string, event: string, data: any) {
    this.server.to(`org:${organizationId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // =====================================================================
  // REAL-TIME EVENTS
  // =====================================================================
  broadcastNewOrder(organizationId: string, order: any) {
    this.emitToOrg(organizationId, 'order:new', {
      type: 'NEW_ORDER',
      order,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastStockAlert(organizationId: string, product: any, currentStock: number) {
    this.emitToOrg(organizationId, 'inventory:low-stock', {
      type: 'LOW_STOCK',
      product,
      currentStock,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastNotification(userId: string, notification: any) {
    this.emitToUser(userId, 'notification:new', notification);
  }

  broadcastDashboardUpdate(organizationId: string, stats: any) {
    this.emitToOrg(organizationId, 'dashboard:update', stats);
  }

  // =====================================================================
  // CLIENT SUBSCRIPTIONS
  // =====================================================================
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('subscribe:dashboard')
  handleDashboardSubscription(@ConnectedSocket() client: Socket) {
    client.join(`dashboard:${client.data.organizationId}`);
    return { subscribed: true };
  }

  @SubscribeMessage('subscribe:pos')
  handlePOSSubscription(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: string }) {
    client.join(`pos:${data.branchId}`);
    return { subscribed: true };
  }
}
