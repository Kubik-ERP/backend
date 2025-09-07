import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationHelper
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationHelper.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client subscribe to selected invoice
  @SubscribeMessage('subscribe-invoice')
  handleSubscribeInvoice(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(orderId);
    this.logger.log(`Client ${client.id} subscribed to invoice ${orderId}`);
  }

  // (optional) unsubscribe
  @SubscribeMessage('unsubscribe-invoice')
  handleUnsubscribeInvoice(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(orderId);
    this.logger.log(`Client ${client.id} unsubscribed from invoice ${orderId}`);
  }

  @SubscribeMessage('subscribe-new-order')
  handleSubscribeStore(
    @MessageBody() storeId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(storeId);
    this.logger.log(`Client ${client.id} subscribed to store ${storeId}`);
  }

  @SubscribeMessage('unsubscribe-new-order')
  handleUnsubscribeStore(
    @MessageBody() storeId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(storeId);
    this.logger.log(`Client ${client.id} unsubscribed from store ${storeId}`);
  }

  // Trigger ke specific invoice room
  notifyPaymentSuccess(orderId: string) {
    this.server.to(orderId).emit('payment-success', {
      orderId,
      message: 'Payment has been successfully processed',
    });
  }

  notifyPaymentFailed(orderId: string) {
    this.server.to(orderId).emit('payment-failed', {
      orderId,
      message: 'Payment failed or was cancelled',
    });
  }

  // notify new order for kitchen queue
  notifyNewOrder(storeId: string) {
    this.server.to(storeId).emit('new-order-incoming', {
      storeId: storeId,
      message: 'New order incoming please update the kitchen queue',
    });
  }
}
