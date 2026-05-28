import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ExecuteRequestDto, ExecuteResponseDto } from './proxy.dto';

@Controller('proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  execute(@Body() dto: ExecuteRequestDto): Promise<ExecuteResponseDto> {
    return this.proxyService.execute(dto);
  }
}

