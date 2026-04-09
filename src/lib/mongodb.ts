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

// Export a lazy promise for NextAuth MongoDB adapter
// The adapter needs a Promise<MongoClient>, so we create one that resolves when first used
export const mongoClientPromise: Promise<MongoClient> = new Promise((resolve, reject) => {
  // Defer until runtime when env vars are available
  setTimeout(() => {
    const promise = getClientPromise();
    if (!promise) {
      reject(new Error("MONGODB_URI not configured"));
      return;
    }
    promise.then(resolve, reject);
  }, 0);
});

export default getClientPromise;
