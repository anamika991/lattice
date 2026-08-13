import neo4j, { Driver, Session } from "neo4j-driver";

let driver: Driver | null = null;

export class DatabaseConfigError extends Error {
  code = "MISSING_CONFIG" as const;
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

export class DatabaseUnavailableError extends Error {
  code = "DB_UNREACHABLE" as const;
  constructor(message: string) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

function readConfig() {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER || "cognodb";
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !password) {
    throw new DatabaseConfigError(
      "Missing COGNODB_URI or COGNODB_PASSWORD. Copy .env.example to .env.local and add your CognoDB credentials.",
    );
  }

  return { uri, user, password };
}

export function getDriver(): Driver {
  if (driver) return driver;

  const { uri, user, password } = readConfig();
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    connectionTimeout: 8_000,
    maxConnectionLifetime: 60_000,
  });
  return driver;
}

export async function withSession<T>(
  work: (session: Session) => Promise<T>,
): Promise<T> {
  const d = getDriver();
  const session = d.session();
  try {
    return await work(session);
  } catch (err) {
    if (
      err instanceof DatabaseConfigError ||
      err instanceof DatabaseUnavailableError
    ) {
      throw err;
    }

    const message = err instanceof Error ? err.message : String(err);
    const unreachable =
      /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Failed to connect|ServiceUnavailable|SessionExpired|No routing servers|certificate|handshake/i.test(
        message,
      );

    if (unreachable) {
      throw new DatabaseUnavailableError(
        "Could not reach CognoDB. Check your URI, password, and that the instance is running.",
      );
    }
    throw err;
  } finally {
    await session.close();
  }
}

export async function verifyConnectivity(): Promise<void> {
  const d = getDriver();
  try {
    await d.verifyConnectivity();
  } catch {
    throw new DatabaseUnavailableError(
      "Could not reach CognoDB. Check your URI, password, and that the instance is running.",
    );
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export function toNumber(value: unknown): number {
  if (neo4j.isInt(value)) return value.toNumber();
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}
