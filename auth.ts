import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { logger } from "./lib/logger"

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL 
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Включаем обязательную верификацию email
  },
  // Настройка email provider для отправки писем
  emailProvider: process.env.SENDGRID_API_KEY ? {
    // Используем SendGrid если API ключ доступен
    type: "sendgrid",
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || "noreply@delez-repo.ru",
    // Логирование отправки email
    onError: (error) => {
      logger.error('SendGrid email sending error', error);
    },
    onSuccess: (info) => {
      logger.info('SendGrid email sent successfully', info);
    }
  } : {
    // Fallback на SMTP если SendGrid недоступен
    type: "smtp",
    host: process.env.SMTP_HOST || "smtp.mail.ru",
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false, // true для 465, false для других портов
    auth: {
      user: process.env.SMTP_USER || "delez.ai@mail.ru",
      pass: process.env.SMTP_PASSWORD || "VvFgJPKNDQUv6CDo6pbp",
    },
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "delez.ai@mail.ru",
    // Логирование отправки email
    onError: (error) => {
      logger.error('SMTP email sending error', error);
    },
    onSuccess: (info) => {
      logger.info('SMTP email sent successfully', info);
    }
  },
  baseURL: process.env.BETTER_AUTH_URL || "https://api.delez-repo.ru",
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
  },
  advanced: {
    // Сюда можно добавить, напр., настройки безопасности, cookie и advanced.database (см. Better Auth docs)
  }
})
