import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HeaderMiddleware implements NestMiddleware {
  use(req: ICustomRequestHeaders, res: Response, next: NextFunction) {
    const storeId = req.headers['x-store-id'];
    if (typeof storeId === 'string') {
      req.store_id = storeId;
    }
    next();
  }
}
