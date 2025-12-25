import { Controller, Post, Req, Res } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // TODO: lanjutin setelah API BAYARIN ready
  @Post('bayarin/invoice')
  @ApiOperation({
    summary: 'Listening the callback response from BAYARIN',
  })
  bayarinInvoice(@Req() req: Request, @Res() res: Response) {
    console.log('Bayarin Invoice', { req: req.body });
    return res.status(200).json({ message: 'Coming soon...' });
  }
}
