import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
    const requestId = (request as Request & { requestId?: string }).requestId ?? request.header("x-request-id") ?? "unknown";
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      JSON.stringify({
        event: "http.request.failed",
        requestId,
        method: request.method,
        endpoint: request.originalUrl,
        statusCode,
        exception: exception instanceof Error ? exception.name : typeof exception,
      }),
      stack,
    );

    if (exception instanceof HttpException) {
      response.status(statusCode).json(exception.getResponse());
      return;
    }

    response.status(500).json({
      statusCode: 500,
      message: "Internal server error",
    });
  }
}