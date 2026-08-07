import dotenv from 'dotenv';
dotenv.config();
import { verifyToken, decodeJwt } from '@clerk/express';

console.log('CLERK_SECRET_KEY present:', !!process.env.CLERK_SECRET_KEY);
