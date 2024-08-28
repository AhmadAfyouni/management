import { Injectable } from '@nestjs/common';
import {  MongooseModuleOptions } from '@nestjs/mongoose';
import { Connection, connect } from 'mongoose';
import "dotenv/config"
@Injectable()
export class DatabaseService  {
  private connection: Connection;

  async onInit() {
    await this.connect(process.env.MONGO_URI!,{});
  }

  async connect(uri: string, options: MongooseModuleOptions) {
    this.connection = (await connect(uri, options)).connection;
  }

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Database connection is not established');
    }
    return this.connection;
  }

  async onDestroy() {
    await this.closeConnection();
  }

  async closeConnection() {
    if (this.connection) {
      await this.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}
