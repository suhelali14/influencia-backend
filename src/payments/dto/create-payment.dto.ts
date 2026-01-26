import { IsUUID, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  campaign_id: string;

  @ApiProperty()
  @IsUUID()
  creator_id: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  payment_type: PaymentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payment_gateway?: string;
}
