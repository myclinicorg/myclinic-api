import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCsrfProtection();

  const config = new DocumentBuilder()
    .setTitle('MyClinic API')
    .setDescription(
      'API de gestão para MEIs da área da saúde: pacientes, agenda, estoque e fluxo de caixa.',
    )
    .setVersion('1.0')
    .addCookieAuth('__Host-sid')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
