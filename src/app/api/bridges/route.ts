import { NextRequest, NextResponse } from "next/server";
import {
  DatabaseConfigError,
  DatabaseUnavailableError,
  withSession,
} from "@/lib/neo4j";
import { findSkillBridges } from "@/lib/queries";
import type { ApiErrorBody } from "@/lib/types";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      {
        error: "Query params `from` and `to` (role ids) are required.",
        code: "BAD_REQUEST",
      } satisfies ApiErrorBody,
      { status: 400 },
    );
  }

  try {
    const bridges = await withSession((session) =>
      findSkillBridges(session, from, to),
    );
    return NextResponse.json({ bridges });
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
