import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
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

  public handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  public handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // function for trigger notification to client
  notifyPaymentSuccess(orderId: string) {
    this.server.emit('payment-success', {
      orderId,
      message: 'Payment has been successfully processed',
    });
  }

  notifyPaymentFailed(orderId: string) {
    this.server.emit('payment-failed', {
      orderId,
      message: 'Payment failed or was cancelled',
    });
  }
}
