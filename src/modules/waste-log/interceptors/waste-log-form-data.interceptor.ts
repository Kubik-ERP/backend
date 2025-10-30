import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CreateWasteLogItemDto } from '../dtos/create-waste-log.dto';

@Injectable()
export class WasteLogFormDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Parse dynamic payload[n] format from form data
    const items: CreateWasteLogItemDto[] = [];
    const processedIndexes = new Set<number>();

    Object.keys(body).forEach((key) => {
      const match = key.match(/^payload\[(\d+)\]\.(.+)$/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];

        if (!items[index]) {
          items[index] = {} as CreateWasteLogItemDto;
        }

        processedIndexes.add(index);

        if (field === 'quantity') {
          (items[index] as any)[field] = parseFloat(body[key]);
        } else {
          (items[index] as any)[field] = body[key];
        }
      }
    });

    // Filter out empty items and validate required fields
    const validItems = items.filter(
      (item, index) =>
        processedIndexes.has(index) && item && item.inventory_item_id,
    );

    if (validItems.length === 0) {
      throw new BadRequestException(
        'At least one payload item is required with inventory_item_id',
      );
    }

    // Set the processed payload to the request body
    request.body.payload = validItems;

    return next.handle();
  }
}
