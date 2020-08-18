import { entities } from '@bantr/lib/dist/entities';
import * as dotenv from 'dotenv';
import { Connection, createConnection } from 'typeorm';

let db: Database;

dotenv.config();

class Database {
  private connection: Connection;

  async up() {
    this.connection = await createConnection({
      type: 'postgres',
      entities,
      host: process.env.BANTR_PG_HOST,
      port: parseInt(process.env.BANTR_PG_PORT, 10),
      username: process.env.BANTR_PG_USER,
      password: process.env.BANTR_PG_PW,
      database: process.env.BANTR_PG_DB,
      synchronize: true,
      logging: false,
      dropSchema: true
    });
    return this.connection;
  }

  async down() {
    await this.connection.close();
  }
}

export default async function getDb() {
  if (db) {
    return db;
  }

  db = new Database();
  await db.up();
  return db;
}

afterAll(async () => {
  await db.down();
});
