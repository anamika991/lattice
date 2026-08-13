import { NextResponse } from "next/server";
import {
  DatabaseConfigError,
  DatabaseUnavailableError,
  withSession,
} from "@/lib/neo4j";
import { listRoles } from "@/lib/queries";
import type { ApiErrorBody } from "@/lib/types";

function errorResponse(err: unknown) {
  if (err instanceof DatabaseConfigError || err instanceof DatabaseUnavailableError) {
    return NextResponse.json(
      { error: err.message, code: err.code } satisfies ApiErrorBody,
      { status: 503 },
    );
  }
  console.error(err);
  return NextResponse.json(
    { error: "Unexpected server error" } satisfies ApiErrorBody,
    { status: 500 },
  );
}

export async function GET() {
  try {
    const roles = await withSession((session) => listRoles(session));
    return NextResponse.json({ roles });
  } catch (err) {
    return errorResponse(err);
  }
}
