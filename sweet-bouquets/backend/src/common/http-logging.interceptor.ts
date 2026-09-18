import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Observable, finalize } from "rxjs";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = request.header("x-request-id")?.trim() || randomUUID();
    const startedAt = Date.now();

    response.setHeader("x-request-id", requestId);
    (request as Request & { requestId?: string }).requestId = requestId;
    this.log("http.request.started", {
      requestId,
      method: request.method,
      endpoint: request.originalUrl,
    });

    return next.handle().pipe(
      finalize(() => {
        this.log("http.request.completed", {
          requestId,
          method: request.method,
          endpoint: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
    );
  }

  private log(event: string, details: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ event, ...details }));
  }
}