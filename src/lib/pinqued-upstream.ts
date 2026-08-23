import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const PINQUED_ORIGIN = "https://pinqued.top";
const SESSION_COOKIE = "xe1_pinqued_session";

export type PinquedCookieJar = Record<string, string>;

function setCookieLines(headers: Headers) {
  const enhanced = headers as Headers & { getSetCookie?: () => string[] };
  return enhanced.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : []);
}

export function mergePinquedCookies(jar: PinquedCookieJar, headers: Headers) {
  for (const line of setCookieLines(headers)) {
    const pair = line.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) jar[pair.slice(0, separator)] = pair.slice(separator + 1);
  }
  return jar;
}

export function pinquedCookieHeader(jar: PinquedCookieJar) {
  return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function readPinquedCookies(): Promise<PinquedCookieJar> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return {};
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PinquedCookieJar;
  } catch {
    return {};
  }
}

export function storePinquedCookies(response: NextResponse, jar: PinquedCookieJar) {
  response.cookies.set(SESSION_COOKIE, Buffer.from(JSON.stringify(jar)).toString("base64url"), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/pinqued",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearPinquedCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/pinqued",
    maxAge: 0,
  });
}

export async function fetchPinquedCsrf(jar: PinquedCookieJar) {
  const response = await fetch(`${PINQUED_ORIGIN}/api/v1/auth/csrf`, {
    headers: { accept: "application/json", cookie: pinquedCookieHeader(jar) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  mergePinquedCookies(jar, response.headers);
  const data = await response.json().catch(() => ({})) as { csrfToken?: string };
  if (!response.ok || !data.csrfToken) throw new Error("Could not start Pinqued authentication");
  return data.csrfToken;
}

