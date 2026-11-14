import app from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';

async function bootstrap() {
  console.log('--- Khởi động Backend Smart Electronics Store ---');
  console.log(`Môi trường: ${env.NODE_ENV}`);
  
  // Kiểm tra kết nối cơ sở dữ liệu (PostgreSQL)
  await checkDatabaseConnection();

  const server = app.listen(env.PORT, () => {
    console.log(`[Server] Backend đang chạy tại http://localhost:${env.PORT}`);
    console.log(`[Server] Endpoint API Tìm kiếm: http://localhost:${env.PORT}/api/products/search`);
    console.log(`[Server] Endpoint Healthcheck: http://localhost:${env.PORT}/api/health`);
  });

  // Graceful shutdown
  const handleExit = () => {
    console.log('\n[Server] Đang đóng kết nối...');
    server.close(() => {
      console.log('[Server] Đã dừng server.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

bootstrap().catch((err) => {
  console.error('[Server] Lỗi khởi động:', err);
  process.exit(1);
});
