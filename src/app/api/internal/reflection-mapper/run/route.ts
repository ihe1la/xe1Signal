import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessReflectionMapper, parseTargetAllowlist, runReflectionMapper } from "@/lib/reflection-mapper";

const inputSchema = z.object({
  targetUrl: z.string().url().max(2048),
  customHeaders: z.string().max(8000).optional(),
  cookie: z.string().max(8000).optional(),
  markerPrefix: z.string().max(40).default("REFLECT"),
  delayMs: z.number().int().min(0).max(5000).default(0),
  mode: z.enum(["combined", "separate"]).default("combined"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !canAccessReflectionMapper(process.env.ENABLE_TEST_LAB === "true", session.user.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const input = inputSchema.parse(await request.json());
    const allowlist = parseTargetAllowlist(process.env.TEST_LAB_ALLOWED_HOSTS);
    if (!allowlist.length) return NextResponse.json({ error: "No Test Lab targets are configured" }, { status: 403 });
    const output = await runReflectionMapper(input, allowlist);
    const run = await db.reflectionRun.create({
      data: {
        targetUrl: output.targetUrl,
        finalRequestUrl: output.finalRequestUrl,
        mode: output.mode,
        statusCode: output.statusCode,
        contentType: output.contentType,
        responseSize: output.responseSize,
        responseTimeMs: output.responseTimeMs,
        requestCount: output.requestCount,
        createdById: session.user.id,
        results: { create: output.results.map((result) => ({
          parameterName: result.name,
          occurrenceIndex: result.occurrenceIndex,
          marker: result.marker,
          reflected: result.reflected,
          reflectionCount: result.reflectionCount,
          firstPosition: result.firstPosition,
          context: result.context,
          encoding: result.encoding,
          responseSection: result.responseSection,
          snippet: result.snippet,
        })) },
      },
      include: { results: true },
    });
    return NextResponse.json({ runId: run.id, ...output, results: output.results.map((result, index) => ({ ...result, id: run.results[index]?.id })) });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Invalid input" : error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
