import { NextResponse } from "next/server";
import {
  DatabaseConfigError,
  DatabaseUnavailableError,
  verifyConnectivity,
  withSession,
} from "@/lib/neo4j";
import { getStats } from "@/lib/queries";
import type { ApiErrorBody } from "@/lib/types";

function errorResponse(err: unknown) {
  if (err instanceof DatabaseConfigError) {
    const body: ApiErrorBody = { error: err.message, code: err.code };
    return NextResponse.json(body, { status: 503 });
  }
  if (err instanceof DatabaseUnavailableError) {
    const body: ApiErrorBody = { error: err.message, code: err.code };
    return NextResponse.json(body, { status: 503 });
  }
  console.error(err);
  return NextResponse.json(
    { error: "Unexpected server error" } satisfies ApiErrorBody,
    { status: 500 },
  );
}

export async function GET() {
  try {
    await verifyConnectivity();
    const stats = await withSession((session) => getStats(session));
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    return errorResponse(err);
  }
}
