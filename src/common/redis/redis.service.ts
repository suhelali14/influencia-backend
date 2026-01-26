import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject('REDIS_CLIENT') private readonly client: any,
  ) {}

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Set a key with optional expiration in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSeconds);
    return Boolean(result);
  }

  /**
   * Get remaining TTL of a key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Store JSON object
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Get JSON object
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Add to a set
   */
  async sAdd(key: string, ...values: string[]): Promise<number> {
    return this.client.sAdd(key, values);
  }

  /**
   * Get all members of a set
   */
  async sMembers(key: string): Promise<string[]> {
    return this.client.sMembers(key);
  }

  /**
   * Remove from a set
   */
  async sRem(key: string, ...values: string[]): Promise<number> {
    return this.client.sRem(key, values);
  }

  /**
   * Check if member exists in set
   */
  async sIsMember(key: string, value: string): Promise<boolean> {
    const result = await this.client.sIsMember(key, value);
    return Boolean(result);
  }

  /**
   * Hash set field
   */
  async hSet(key: string, field: string, value: string): Promise<number> {
    return this.client.hSet(key, field, value);
  }

  /**
   * Hash get field
   */
  async hGet(key: string, field: string): Promise<string | undefined> {
    const result = await this.client.hGet(key, field);
    return result ?? undefined;
  }

  /**
   * Hash get all fields
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  /**
   * Hash delete field
   */
  async hDel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hDel(key, fields);
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(keys);
  }

  /**
   * Increment a value
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Get raw client for advanced operations
   */
  getClient(): RedisClientType {
    return this.client;
  }
}
