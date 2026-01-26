import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentsRepository.create(createPaymentDto);
    return this.paymentsRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['campaign', 'creator'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCreator(creatorId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { creator_id: creatorId },
      relations: ['campaign'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCampaign(campaignId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { campaign_id: campaignId },
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['campaign', 'creator'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async updateStatus(id: string, status: PaymentStatus, transactionId?: string): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = status;
    
    if (transactionId) {
      payment.transaction_id = transactionId;
    }

    if (status === PaymentStatus.COMPLETED) {
      payment.processed_at = new Date();
    }

    return this.paymentsRepository.save(payment);
  }

  async getCreatorEarnings(creatorId: string) {
    const payments = await this.findByCreator(creatorId);
    
    const completed = payments.filter(p => p.status === PaymentStatus.COMPLETED);
    const pending = payments.filter(p => p.status === PaymentStatus.PENDING);

    return {
      total_earnings: completed.reduce((sum, p) => sum + Number(p.amount), 0),
      pending_earnings: pending.reduce((sum, p) => sum + Number(p.amount), 0),
      total_payments: completed.length,
      payments: payments,
    };
  }
}
