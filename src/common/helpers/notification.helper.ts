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
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Client subscribe ke invoice tertentu
  @SubscribeMessage('subscribe-invoice')
  handleSubscribeInvoice(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(orderId);
    console.log(`Client ${client.id} subscribed to invoice ${orderId}`);
  }

  // (opsional) unsubscribe
  @SubscribeMessage('unsubscribe-invoice')
  handleUnsubscribeInvoice(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(orderId);
    console.log(`Client ${client.id} unsubscribed from invoice ${orderId}`);
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
    this.server.emit('new-order-incomming', {
      storeId: storeId,
      message: 'New order incomming please update the kitchen queue',
    });
  }
}
