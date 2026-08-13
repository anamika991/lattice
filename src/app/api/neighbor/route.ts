import { NextRequest, NextResponse } from "next/server";
import {
  DatabaseConfigError,
  DatabaseUnavailableError,
  withSession,
} from "@/lib/neo4j";
import { exploreRole } from "@/lib/queries";
import type { ApiErrorBody } from "@/lib/types";

export async function GET(request: NextRequest) {
  const roleId = request.nextUrl.searchParams.get("roleId");

  if (!roleId) {
    return NextResponse.json(
      {
        error: "Query param `roleId` is required.",
        code: "BAD_REQUEST",
      } satisfies ApiErrorBody,
      { status: 400 },
    );
  }

  try {
    const result = await withSession((session) => exploreRole(session, roleId));
    if (!result) {
      return NextResponse.json(
        { error: "Role not found.", code: "NOT_FOUND" } satisfies ApiErrorBody,
        { status: 404 },
      );
    }
    return NextResponse.json(result);
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
