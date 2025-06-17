import { Body, Controller, Post } from '@nestjs/common';
import { TemplatesEmailService } from '../services/templates-email.service';
import { SendTemplateEmailDto } from '../dtos/send-template-email.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Templates Email')
@Controller('templates-email')
export class TemplatesEmailController {
  constructor(private readonly templatesEmailService: TemplatesEmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Kirim email berdasarkan template' })
  public async send(@Body() body: SendTemplateEmailDto) {
    await this.templatesEmailService.sendTemplateEmail(body);
    return {
      message: 'Email berhasil dirender dan dikirim (atau dicetak)',
    };
  }
}
