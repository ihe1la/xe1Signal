import { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 90 * 24 * 60 * 60,
  },
  jwt: { maxAge: 90 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse({
          identifier: credentials?.identifier,
          password: credentials?.password,
        });
        if (!parsedCredentials.success) return null;

        const { identifier, password } = parsedCredentials.data;
        const normalizedIdentifier = identifier.toLowerCase();

        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: normalizedIdentifier },
              { username: normalizedIdentifier },
            ],
          },
        });

        if (!user || !user.passwordHash || !user.isActive || user.isBanned)
          return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name || user.username,
          username: user.username,
          role: user.role,
          avatarUrl: user.avatarUrl ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
      }

      if (trigger === "update" && session) {
        token.name = session.name;
        token.avatarUrl = session.avatarUrl;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (typeof token.username === "string")
          session.user.username = token.username;
        if (typeof token.role === "string") session.user.role = token.role;
        if (typeof token.avatarUrl === "string")
          session.user.avatarUrl = token.avatarUrl;
      }
      return session;
    },
    authorized: async ({ auth }) => !!auth,
  },
};

export default authConfig;
