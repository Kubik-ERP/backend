import { Body, Controller, Post } from '@nestjs/common';
import { TemplatesEmailService } from '../services/templates-email.service';
import { SendTemplateEmailDto } from '../dtos/send-template-email.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';

@ApiTags('Templates Email')
@Controller('templates-email')
export class TemplatesEmailController {
  constructor(private readonly templatesEmailService: TemplatesEmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Sent email based on template' })
  public async send(@Body() body: SendTemplateEmailDto) {
    const response = await this.templatesEmailService.sendTemplateEmail(body);
    return {
      message: 'Email berhasil dirender dan dikirim (atau dicetak)',
      result: toCamelCase(response),
    };
  }
}
