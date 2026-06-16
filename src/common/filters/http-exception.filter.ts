import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionResponse {
  message?: unknown;
  error?: string;
}

interface ValidationErrorLike {
  property?: string;
  constraints?: Record<string, string>;
  value?: unknown;
  children?: ValidationErrorLike[];
}

interface ApiError {
  code: string;
  field: string | null;
  message: string;
  value: unknown;
}

const knownMessages: Record<string, string> = {
  'Internal server error': 'خطأ داخلي في الخادم',
  Unauthorized: 'غير مصرح',
  Forbidden: 'ممنوع',
  'Invalid credentials': 'بيانات الاعتماد غير صالحة',
  'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحين',
  'Invalid or expired refresh token': 'رمز التحديث غير صالح أو منتهي الصلاحية',
  'Refresh token is invalid or revoked': 'رمز التحديث غير صالح أو ملغى',
  'User account is disabled or not found': 'حساب المستخدم معطل أو غير موجود',
  'Access denied': 'تم رفض الوصول',
  'Insufficient permissions': 'الصلاحيات غير كافية',
};

const validationConstraints: Record<string, string> = {
  IsEmail: 'يجب أن يكون البريد الإلكتروني صالحاً',
  IsNotEmpty: 'هذا الحقل مطلوب',
  IsString: 'يجب أن يكون النص صالحاً',
  IsNumber: 'يجب أن يكون الرقم صالحاً',
  IsInt: 'يجب أن يكون الرقم صحيحاً',
  IsBoolean: 'يجب أن تكون القيمة منطقية',
  IsArray: 'يجب أن تكون القيمة مصفوفة',
  IsUUID: 'يجب أن يكون المعرف بصيغة UUID صالحة',
  IsMongoId: 'يجب أن يكون المعرف بصيغة MongoDB صالحة',
  IsDateString: 'يجب أن يكون التاريخ صالحاً',
  MinLength: 'القيمة أقصر من المطلوب',
  MaxLength: 'القيمة أطول من المسموح',
  Min: 'القيمة أقل من المسموح',
  Max: 'القيمة أكبر من المسموح',
  Length: 'طول القيمة غير صالح',
  Matches: 'صيغة القيمة غير صالحة',
  IsIn: 'القيمة المختارة غير صالحة',
  ValidateNested: 'يحتوي الحقل على بيانات غير صالحة',
};

const propertyNames: Record<string, string> = {
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  tokenDevice: 'رمز الجهاز',
  refreshToken: 'رمز التحديث',
  fullName: 'الاسم الكامل',
  jobTitle: 'المسمى الوظيفي',
  phone: 'رقم الهاتف',
  salary: 'الراتب',
  role: 'الدور',
  sku: 'رمز التخزين',
  quantity: 'الكمية',
  costSyp: 'تكلفة الليرة السورية',
  costUsd: 'تكلفة الدولار',
  page: 'رقم الصفحة',
  limit: 'عدد العناصر',
  inventoryDate: 'تاريخ الجرد',
  centerName: 'اسم المركز',
  secondaryName: 'الاسم الثانوي',
  address: 'العنوان',
  phone1: 'الهاتف 1',
  phone2: 'الهاتف 2',
  term1: 'البند 1',
  term2: 'البند 2',
  term3: 'البند 3',
  term4: 'البند 4',
  dollarExchangeRate: 'معدل صرف الدولار',
};

function translateKnownMessage(message: string): string {
  return knownMessages[message] ?? message;
}

function getPropertyName(property: string | undefined): string {
  return property ? (propertyNames[property] ?? property) : 'البيانات';
}

function normalizeValidationError(value: ValidationErrorLike): string {
  const propertyName = getPropertyName(value.property);
  const firstConstraint = value.constraints
    ? Object.keys(value.constraints)[0]
    : undefined;
  const constraintMessage = firstConstraint
    ? (validationConstraints[firstConstraint] ?? 'بيانات غير صالحة')
    : 'بيانات غير صالحة';

  return `${propertyName}: ${constraintMessage}`;
}

function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') {
    return translateKnownMessage(message);
  }

  if (Array.isArray(message)) {
    if (message.length === 0) {
      return 'حدث خطأ في التحقق من صحة البيانات';
    }

    return message
      .map((item) =>
        item && typeof item === 'object'
          ? normalizeValidationError(item as ValidationErrorLike)
          : normalizeMessage(item),
      )
      .join('\n');
  }

  if (message && typeof message === 'object') {
    return normalizeValidationError(message);
  }

  return translateKnownMessage(String(message));
}

function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTHENTICATION_FAILED';
    case 403:
      return 'AUTHORIZATION_FAILED';
    case 404:
      return 'RESOURCE_NOT_FOUND';
    case 409:
      return 'RESOURCE_CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    default:
      return 'API_ERROR';
  }
}

function flattenValidationErrors(message: unknown): ValidationErrorLike[] {
  if (Array.isArray(message)) {
    return message.flatMap((item) => flattenValidationErrors(item));
  }

  if (message && typeof message === 'object') {
    const value = message as ValidationErrorLike;
    if (value.property || value.constraints || value.children) {
      const children = value.children?.flatMap((child) =>
        flattenValidationErrors(child),
      );
      return [{ ...value, children: undefined }, ...(children ?? [])];
    }
  }

  return [];
}

function buildValidationError(validationError: ValidationErrorLike): ApiError {
  const message = validationError.constraints
    ? normalizeValidationError(validationError)
    : 'بيانات غير صالحة';

  return {
    code: 'VALIDATION_ERROR',
    field: validationError.property ?? null,
    message,
    value: validationError.value ?? null,
  };
}

function extractField(message: unknown): string | null {
  if (Array.isArray(message) && message.length > 0) {
    return extractField(message[0]);
  }

  if (message && typeof message === 'object') {
    const value = message as ValidationErrorLike;
    if (value.property) {
      return value.property;
    }
  }

  if (typeof message !== 'string') {
    return null;
  }

  const backtickField = message.match(/`([^`]+)`/);
  if (backtickField) {
    return backtickField[1];
  }

  const leadingField = message.match(
    /^([a-zA-Z][a-zA-Z0-9_.-]*)\s+(must|should|is|has)/i,
  );
  if (leadingField) {
    return leadingField[1];
  }

  return null;
}

function extractValue(message: unknown): unknown {
  if (Array.isArray(message) && message.length > 0) {
    return extractValue(message[0]);
  }

  if (message && typeof message === 'object') {
    const value = message as ValidationErrorLike;
    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      return value.value ?? null;
    }
  }

  if (typeof message !== 'string') {
    return null;
  }

  const quotedValue = message.match(/['"]([^'"]+)['"]/);
  if (quotedValue) {
    return quotedValue[1];
  }

  const arabicIdValue = message.match(/بالمعرف\s+([^\s]+)/);
  if (arabicIdValue) {
    return arabicIdValue[1];
  }

  const byIdValue = message.match(/ID\s+([^\s]+)/i);
  if (byIdValue) {
    return byIdValue[1];
  }

  return null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as ExceptionResponse;
        message = resObj.message ?? exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unhandled exception of unknown type: ${JSON.stringify(exception)}`,
      );
    }

    const validationErrors = flattenValidationErrors(message);
    const errors: ApiError[] = validationErrors.length
      ? validationErrors.map(buildValidationError)
      : [
          {
            code: getErrorCode(status),
            field: extractField(message),
            message: normalizeMessage(message),
            value: extractValue(message),
          },
        ];

    response.status(status).json({
      success: false,
      message: normalizeMessage(message),
      data: null,
      errors,
      pagination: null,
    });
  }
}
