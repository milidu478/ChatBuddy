import NextAuth, { type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
    };
    accessToken: string;
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    accessToken: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          // අපේ Express Backend එකට request එක යවනවා
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          // Login එක සාර්ථක නම් User සහ Token එක NextAuth එකට දෙනවා
          if (res.ok && data.data) {
            return {
              id: data.data.user.id,
              name: data.data.user.name,
              email: data.data.user.email,
              accessToken: data.data.accessToken, // Backend එකෙන් එන ටෝකන් එක
            };
          }
          return null;
        } catch (e) {
          console.error('Auth error:', e);
          return null;
        }
      }
    })
  ],
  callbacks: {
    // 1. Token එක හැදෙනකොට ඒකට අපේ access token එක දානවා
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.id = user.id;
      }
      return token;
    },
    // 2. Session එක අහනකොට token එකේ තියෙන access token එක session එකට දෙනවා
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      return session;
    }
  },
  pages: {
    signIn: '/login', // අපේ Custom Login Page එකේ URL එක
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };