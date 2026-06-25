import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  dbUrl: process.env.DATABASE_URL,
};

console.log('⚙️ Config loaded:');
console.log('   PORT:', config.port);
console.log('   ENV:', config.env);
console.log('   JWT_SECRET:', config.jwtSecret);
console.log('   DATABASE_URL:', config.dbUrl ? 'SET' : 'NOT SET');