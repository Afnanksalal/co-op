import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  error?: string;

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    if (message) response.message = message;
    return response;
  }

  static error(error: string): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>();
    response.success = false;
    response.error = error;
    return response;
  }

  static message(message: string): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>();
    response.success = true;
    response.message = message;
    return response;
  }
}
