export class ApiResponseDto<T> {
  success: boolean;

  data?: T;

  message?: string;

  error?: string;

  constructor() {
    this.success = false;
  }

  static success<U>(data: U, message?: string): ApiResponseDto<U> {
    const response = new ApiResponseDto<U>();
    response.success = true;
    response.data = data;
    if (message) response.message = message;
    return response;
  }

  static error(error: string): ApiResponseDto<never> {
    const response = new ApiResponseDto<never>();
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
