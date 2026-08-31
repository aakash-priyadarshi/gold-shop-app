/** Refuse to run account-creating seeds unless the target is explicitly disposable. */
export function assertDisposableTestDatabase(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Refusing to seed accounts outside NODE_ENV=test.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !testDatabaseUrl || databaseUrl !== testDatabaseUrl) {
    throw new Error(
      "DATABASE_URL must exactly match the explicit TEST_DATABASE_URL allowlist.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("The test database URL is invalid.");
  }

  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !/(test|e2e)/.test(databaseName)
  ) {
    throw new Error(
      "The disposable database name must contain 'test' or 'e2e'.",
    );
  }
}
