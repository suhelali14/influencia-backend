import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { MetricsSyncService } from './metrics-sync.service';

export const METRICS_SYNC_QUEUE = 'metrics-sync';

export interface MetricsSyncJobData {
  type: 'single' | 'all' | 'stale';
  creatorId?: string;
  platform?: string;
  hoursThreshold?: number;
}

@Processor(METRICS_SYNC_QUEUE)
export class MetricsSyncProcessor {
  private readonly logger = new Logger(MetricsSyncProcessor.name);

  constructor(private metricsSyncService: MetricsSyncService) {}

  @Process('sync-platform')
  async handleSyncPlatform(job: Job<MetricsSyncJobData>) {
    this.logger.debug(`Processing sync job for ${job.data.platform}`);
    
    if (!job.data.creatorId || !job.data.platform) {
      throw new Error('Missing creatorId or platform');
    }

    const result = await this.metricsSyncService.syncPlatform(
      job.data.creatorId,
      job.data.platform as any,
    );

    return result;
  }

  @Process('sync-all')
  async handleSyncAll(job: Job<MetricsSyncJobData>) {
    this.logger.debug(`Processing sync-all job for creator ${job.data.creatorId}`);
    
    if (!job.data.creatorId) {
      throw new Error('Missing creatorId');
    }

    const results = await this.metricsSyncService.syncAllPlatforms(job.data.creatorId);
    return results;
  }

  @Process('sync-stale')
  async handleSyncStale(job: Job<MetricsSyncJobData>) {
    const hoursThreshold = job.data.hoursThreshold || 6;
    this.logger.debug(`Processing sync-stale job with threshold ${hoursThreshold}h`);
    
    const syncedCount = await this.metricsSyncService.syncStaleAccounts(hoursThreshold);
    return { syncedCount };
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }
}
