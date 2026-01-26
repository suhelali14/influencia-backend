import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatus } from './entities/payment.entity';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('creator/:creatorId')
  @ApiOperation({ summary: 'Get payments by creator' })
  findByCreator(@Param('creatorId') creatorId: string) {
    return this.paymentsService.findByCreator(creatorId);
  }

  @Get('creator/:creatorId/earnings')
  @ApiOperation({ summary: 'Get creator earnings summary' })
  getCreatorEarnings(@Param('creatorId') creatorId: string) {
    return this.paymentsService.getCreatorEarnings(creatorId);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Get payments by campaign' })
  findByCampaign(@Param('campaignId') campaignId: string) {
    return this.paymentsService.findByCampaign(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: PaymentStatus; transaction_id?: string }
  ) {
    return this.paymentsService.updateStatus(id, body.status, body.transaction_id);
  }
}
