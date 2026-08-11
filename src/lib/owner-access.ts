/** Private Study + Tools surfaces are owner-only. */
export const OWNER_USERNAME = "ihe1la";

export function canAccessOwnerTools(username?: string | null) {
  return Boolean(username && username.trim().toLowerCase() === OWNER_USERNAME);
}
