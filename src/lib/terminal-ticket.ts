import { createHmac, timingSafeEqual } from "crypto";

import { OWNER_USERNAME } from "@/lib/owner-access";

export const TERMINAL_TICKET_TTL_MS = 2 * 60 * 1000;

type TerminalTicketPayload = {
  u: string;
  exp: number;
  v: 1;
};

function ticketSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for terminal tickets");
  return secret;
}

function sign(payloadB64: string) {
  return createHmac("sha256", ticketSecret()).update(payloadB64).digest("base64url");
}

export function issueTerminalTicket(username: string, now = Date.now()) {
  if (username.trim().toLowerCase() !== OWNER_USERNAME) {
    throw new Error("Terminal is owner-only");
  }
  const payload: TerminalTicketPayload = {
    u: OWNER_USERNAME,
    exp: now + TERMINAL_TICKET_TTL_MS,
    v: 1,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyTerminalTicket(ticket: string, now = Date.now()) {
  const [payloadB64, signature] = ticket.split(".");
  if (!payloadB64 || !signature) return null;
  const expected = sign(payloadB64);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as TerminalTicketPayload;
    if (payload.v !== 1) return null;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (payload.u !== OWNER_USERNAME) return null;
    return payload;
  } catch {
    return null;
  }
}
