declare module "mongodb" {
  export class MongoClient {
    constructor(uri: string);
    connect(): Promise<MongoClient>;
    db(name?: string): Db;
  }

  export interface Db {
    collection(name: string): {
      insertOne(document: unknown): Promise<unknown>;
    };
  }
}
