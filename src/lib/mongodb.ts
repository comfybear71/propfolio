import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> | null {
  if (!uri) return null;

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db | null> {
  const promise = getClientPromise();
  if (!promise) return null;
  const client = await promise;
  return client.db("propfolio");
}

// Export for NextAuth MongoDB adapter
// Uses a getter pattern so env vars are available at runtime, not build time
let _adapterClientPromise: Promise<MongoClient> | null = null;
export function getAdapterClient(): Promise<MongoClient> {
  if (!_adapterClientPromise) {
    const promise = getClientPromise();
    if (!promise) throw new Error("MONGODB_URI not configured");
    _adapterClientPromise = promise;
  }
  return _adapterClientPromise;
}

export default getClientPromise;
