import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import { TERMINAL_TICKET_TTL_MS, issueTerminalTicket } from "@/lib/terminal-ticket";

export async function POST() {
  const session = await auth();
  if (!canAccessOwnerTools(session?.user?.username)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const ticket = issueTerminalTicket(session!.user!.username!);
    return NextResponse.json({
      ticket,
      expiresInMs: TERMINAL_TICKET_TTL_MS,
      wsPath: "/ws/terminal",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ticket failed" },
      { status: 500 },
    );
  }
}
