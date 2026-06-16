import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request, Response } from 'express';

interface PaginationPayload {
  total: number;
  page: number;
  limit: number;
}

interface ApiResponseEnvelope {
  success: boolean;
  message: string;
  data: unknown;
  errors: unknown[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((result: unknown) => {
        if (response.headersSent || response.writableEnded) {
          return result;
        }

        return {
          success: true,
          message: this.extractResponseMessage(result, request),
          data: this.extractData(result),
          errors: [],
          pagination: this.extractPagination(result),
        };
      }),
    );
  }

  private extractResponseMessage(result: unknown, request: Request): string {
    if (this.isRecord(result) && typeof result.message === 'string') {
      return result.message;
    }

    return this.buildSuccessMessage(request);
  }

  private extractData(result: unknown): unknown {
    if (this.isRecord(result) && typeof result.message === 'string') {
      if (Object.prototype.hasOwnProperty.call(result, 'data')) {
        return result.data;
      }

      const payload = { ...result };
      delete payload.message;
      return Object.keys(payload).length > 0 ? payload : {};
    }

    if (this.isPaginationPayload(result)) {
      return result.data;
    }

    return result ?? null;
  }

  private extractPagination(
    result: unknown,
  ): ApiResponseEnvelope['pagination'] {
    if (!this.isPaginationPayload(result)) {
      return null;
    }

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  private isPaginationPayload(value: unknown): value is PaginationPayload & {
    data: unknown;
  } {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value.data !== 'undefined' &&
      typeof value.total === 'number' &&
      typeof value.page === 'number' &&
      typeof value.limit === 'number'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private buildSuccessMessage(request: Request): string {
    const method = request.method.toUpperCase();
    const routePath = this.getRoutePath(request.path);

    if (routePath === '') {
      return 'Application health check successful';
    }

    if (routePath === 'auth/login') {
      return 'User logged in successfully';
    }

    if (routePath === 'auth/refresh') {
      return 'Tokens refreshed successfully';
    }

    if (routePath === 'auth/logout') {
      return 'Logged out successfully';
    }

    if (routePath === 'request/records') {
      return 'Request records uploaded successfully';
    }

    if (routePath === 'notifications/alert') {
      return 'Unread notifications count retrieved successfully';
    }

    if (routePath === 'dashboard/stats') {
      return 'Dashboard stats retrieved successfully';
    }

    if (routePath === 'dashboard/technician-performance') {
      return 'Technician performance retrieved successfully';
    }

    if (routePath === 'dashboard/financial-report') {
      return 'Financial report retrieved successfully';
    }

    if (routePath === 'finance/summary') {
      return 'Financial summary retrieved successfully';
    }

    const resource = this.getResourceName(routePath);

    if (method === 'POST') {
      return `${resource} created successfully`;
    }

    if (method === 'PUT' || method === 'PATCH') {
      return `${resource} updated successfully`;
    }

    if (method === 'DELETE') {
      return `${resource} deleted successfully`;
    }

    if (this.isSingularRoute(routePath)) {
      return `${resource} retrieved successfully`;
    }

    return `${this.pluralize(resource)} retrieved successfully`;
  }

  private getRoutePath(path: string): string {
    const normalizedPath = path.replace(/^\/+/, '');
    return normalizedPath.startsWith('api/')
      ? normalizedPath.slice(4)
      : normalizedPath;
  }

  private getResourceName(routePath: string): string {
    const segments = routePath
      .split('/')
      .filter(Boolean)
      .filter((segment) => !this.isIdSegment(segment));

    const segment = segments[segments.length - 1] ?? 'resource';

    return segment
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private isSingularRoute(routePath: string): boolean {
    const segments = routePath.split('/').filter(Boolean);

    return segments.some((segment) => this.isIdSegment(segment));
  }

  private isIdSegment(segment: string): boolean {
    return (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        segment,
      ) ||
      /^\d+$/.test(segment) ||
      segment === 'me'
    );
  }

  private pluralize(resource: string): string {
    if (resource.endsWith('y')) {
      return `${resource.slice(0, -1)}ies`;
    }

    if (resource.endsWith('s')) {
      return resource;
    }

    return `${resource}s`;
  }
}
