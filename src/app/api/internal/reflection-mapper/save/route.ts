import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessReflectionMapper } from "@/lib/reflection-mapper";

const schema = z.object({ runId: z.string().min(1), resultId: z.string().min(1).optional(), notes: z.string().max(2000).optional() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !canAccessReflectionMapper(process.env.ENABLE_TEST_LAB === "true", session.user.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const input = schema.parse(await request.json());
    const run = await db.reflectionRun.findFirst({ where: { id: input.runId, createdById: session.user.id }, include: { results: true } });
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    const results = input.resultId ? run.results.filter((result) => result.id === input.resultId) : run.results;
    if (!results.length) return NextResponse.json({ error: "Result not found" }, { status: 404 });
    const target = new URL(run.targetUrl);
    const lines = [
      `Reflection map for ${target.hostname}${target.pathname}`,
      `Mode: ${run.mode}; status: ${run.statusCode}; content type: ${run.contentType}`,
      `Response: ${run.responseSize} bytes in ${run.responseTimeMs} ms`,
      `Run timestamp: ${run.createdAt.toISOString()}`,
      "",
      ...results.map((result) => `${result.parameterName}[${result.occurrenceIndex}] · ${result.marker} · ${result.reflectionCount} reflection(s) · ${result.context || "not reflected"} · ${result.encoding || "none"}`),
      ...(input.notes?.trim() ? ["", `Notes: ${input.notes.trim()}`] : []),
    ];
    const signal = await db.signal.create({ data: {
      ownerId: session.user.id,
      type: "NOTE",
      title: `Reflection map · ${target.hostname}${target.pathname}`.slice(0, 180),
      content: lines.join("\n"),
      description: `${results.filter((result) => result.reflected).length} reflected parameter(s)`,
      tags: "reflection-map,test-lab",
      visibility: "PRIVATE",
    } });
    return NextResponse.json({ signalId: signal.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Invalid input" : "Unable to save Signal" }, { status: 400 });
  }
}
