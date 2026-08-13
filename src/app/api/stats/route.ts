import { NextResponse } from "next/server";
import {
  DatabaseConfigError,
  DatabaseUnavailableError,
  withSession,
} from "@/lib/neo4j";
import { getStats } from "@/lib/queries";
import type { ApiErrorBody } from "@/lib/types";

export async function GET() {
  try {
    const stats = await withSession((session) => getStats(session));
    return NextResponse.json({ stats });
  } catch (err) {
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
}
