import "reflect-metadata";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";


dotenv.config({
  path: resolve(process.cwd(), ".env"),
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing from ai.help.api/.env");
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application listening on port ${port}`);
}

bootstrap();
