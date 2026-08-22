import neo4j, { type Driver } from "neo4j-driver";

// A fresh driver per request would exhaust CognoDB's free-tier connection cap fast,
// so we keep one driver alive for the life of the server process. In dev, Next.js
// hot-reloads this module on every save, which would normally leak a new driver each
// time — stashing it on `global` survives the reload and keeps us to one connection.
declare global {
  // eslint-disable-next-line no-var
  var __cognodbDriver: Driver | undefined;
}

function createDriver(): Driver {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      "Missing CognoDB credentials. Set COGNODB_URI, COGNODB_USER and COGNODB_PASSWORD " +
        "in .env.local (see .env.example)."
    );
  }

  return neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20, // free tier caps at 200 total connections across all clients
  });
}

export function getDriver(): Driver {
  if (!global.__cognodbDriver) {
    global.__cognodbDriver = createDriver();
  }
  return global.__cognodbDriver;
}

/**
 * Runs a parameterized Cypher query and returns plain records.
 * Every query in this app goes through here — never string-concatenate Cypher.
 */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/** Cheap connectivity check, used by the /api/health route and surfaced in the UI. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await getDriver().verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}
