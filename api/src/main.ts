import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  console.log(process.env.NODE_ENV);
  app.enableShutdownHooks();
  if (process.env.NODE_ENV === 'production') {
    app.setGlobalPrefix('api');
  }
  if (process.env.NODE_ENV === 'production') {
    app.enableCors({
      origin: ['https://jukebar.ovh', 'https://www.jukebar.ovh'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: false,
    });
  } else {
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: false,
    });
  }
  await app.listen(5000);
}
bootstrap();