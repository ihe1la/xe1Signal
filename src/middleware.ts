export { auth as middleware } from "@/lib/auth-edge";

export const config = {
  matcher: [
    "/archive/:path*",
    "/settings/:path*",
    "/inbox/:path*",
    "/notifications/:path*",
    "/signals/new",
    "/signals/:id/edit",
    "/frequencies/new",
    "/frequencies/:id/edit",
    "/trails/:id/edit",
  ],
};
