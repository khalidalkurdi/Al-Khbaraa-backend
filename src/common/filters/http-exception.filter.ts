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
}

const errorLabels: Record<string, string> = {
  'Bad Request': 'طلب غير صالح',
  Unauthorized: 'غير مصرح',
  Forbidden: 'ممنوع',
  'Not Found': 'غير موجود',
  Conflict: 'تعارض',
  'Internal Server Error': 'خطأ داخلي في الخادم',
  HttpException: 'خطأ في الطلب',
  'Payload Too Large': 'حجم الملف كبير جداً',
  'Unsupported Media Type': 'نوع الملف غير مدعوم',
};

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

function translateErrorLabel(error: string | undefined): string {
  return error ? (errorLabels[error] ?? error) : 'خطأ في الطلب';
}

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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as ExceptionResponse;
        message = resObj.message || exception.message;
        error = resObj.error || 'HttpException';
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

    response.status(status).json({
      statusCode: status,
      message: [normalizeMessage(message)],
      error: translateErrorLabel(error),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
