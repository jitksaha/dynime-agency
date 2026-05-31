import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Multer (multipart upload) errors are plain Errors, not HttpExceptions.
    const multer = this.asMulterError(exception);

    const status = multer
      ? multer.status
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = multer
      ? { message: multer.message }
      : exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(typeof payload === 'object' ? payload : { message: payload }),
    });
  }

  private asMulterError(
    exception: unknown,
  ): { status: number; message: string } | null {
    if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { name?: string }).name === 'MulterError'
    ) {
      const code = (exception as { code?: string }).code;
      if (code === 'LIMIT_FILE_SIZE') {
        return {
          status: HttpStatus.PAYLOAD_TOO_LARGE,
          message: 'Uploaded file exceeds the maximum allowed size',
        };
      }
      return {
        status: HttpStatus.BAD_REQUEST,
        message: (exception as { message?: string }).message ?? 'Upload error',
      };
    }
    return null;
  }
}
