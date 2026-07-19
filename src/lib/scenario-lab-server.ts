import { auth } from "@/lib/auth";
import { canAccessScenarioLab, isTrustedLabOrigin } from "@/lib/scenario-lab";

const saves = new Map<string, number[]>();
export async function requireScenarioLab() {
  const session = await auth();
  return session?.user?.id && canAccessScenarioLab(process.env.ENABLE_SCENARIO_LAB === "true", session.user.username) ? session : null;
}
export function isSameOrigin(request: Request) {
  return isTrustedLabOrigin(request.url, request.headers.get("origin"), request.headers.get("x-forwarded-proto"), request.headers.get("x-forwarded-host"), request.headers.get("host"), process.env.NODE_ENV === "production");
}
export function withinLabSaveLimit(userId: string) {
  const now = Date.now(); const recent = (saves.get(userId) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 10) return false; recent.push(now); saves.set(userId, recent); return true;
}
