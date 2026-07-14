import NextAuth from "next-auth";

export const { auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: { authorized: async ({ auth: session }) => Boolean(session) },
});
