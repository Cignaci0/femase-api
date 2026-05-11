import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/logos', express.static('C:\\Users\\ADMINISTRATIVO\\Documents\\Proyectos\\API\\api-femase-fmc\\imgEmpresas')); // CAMBIAR RUTA 
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('API FMC')
    .setDescription('Acá se visualizan los endpoints disponibles en la api')
    .setVersion('1.0')
    // Add security features like Bearer Auth if needed
    // .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // 'api' is the endpoint URL for the docs
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
