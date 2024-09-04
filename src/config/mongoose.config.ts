import { MongooseModuleOptions } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

export const mongooseConfig: MongooseModuleOptions = {
  uri: process.env.MONGO_URI 
};