import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        let user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        // Auto-create admin if no users exist in the system (first time setup)
        if (!user) {
          const userCount = await prisma.user.count();
          if (userCount === 0 && credentials.username === 'admin') {
            const hashedPassword = await bcrypt.hash(credentials.password, 10);
            user = await prisma.user.create({
              data: {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                name: 'System Admin'
              }
            });
            return { id: user.id.toString(), name: user.name, role: user.role };
          }
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        return { id: user.id.toString(), name: user.name, role: user.role };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET || "super_secret_wa_sender_key_2026",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
