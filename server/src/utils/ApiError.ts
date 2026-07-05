export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message = 'Bad request') {
    return new ApiError(400, message);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static unavailable(message = 'Service unavailable') {
    return new ApiError(503, message);
  }
}
