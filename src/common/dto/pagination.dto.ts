import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shared pagination query DTO.
 * All list endpoints should accept these parameters.
 */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC', description: 'Sort direction' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Search query string' })
  @IsOptional()
  @IsString()
  q?: string;

  /** Computed skip value for TypeORM */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.pageSize ?? 20);
  }

  /** Computed take value for TypeORM */
  get take(): number {
    return this.pageSize ?? 20;
  }
}

/**
 * Standard paginated response wrapper.
 * Every list endpoint should return this shape.
 */
export class PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  constructor(data: T[], totalCount: number, page: number, pageSize: number) {
    const totalPages = Math.ceil(totalCount / pageSize);
    this.data = data;
    this.meta = {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
