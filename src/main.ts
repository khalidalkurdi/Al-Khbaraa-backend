import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const logger = new Logger('Bootstrap');

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Security headers with Helmet
  app.use(
    helmet.default({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: ['https://api.maintenancees-sy.net'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global API response interceptor
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  // Swagger API documentation
  if (configService.get('swagger') !== false) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Al-Khbaraa API')
      .setDescription('Electrical Appliance Repair Center Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', err);
  process.exit(1);
});
