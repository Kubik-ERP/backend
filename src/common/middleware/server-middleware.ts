import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ServerKeyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const serverKey = req.headers['x-server-key'];

    // bisa juga dari .env
    const validKey = process.env.SERVER_KEY || 'my-secret-key';

    if (serverKey !== validKey) {
      throw new UnauthorizedException('Invalid server key');
    }

    next();
  }
}
