import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getAdapterClient, getDb } from "./mongodb";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(getAdapterClient(), {
    databaseName: "propfolio",
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = await getDb();
        if (!db) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await db.collection("users").findOne({ email });

        if (!user) {
          // Auto-register new users
          const result = await db.collection("users").insertOne({
            email,
            password,
            name: email.split("@")[0],
            createdAt: new Date().toISOString(),
          });
          return {
            id: result.insertedId.toString(),
            email,
            name: email.split("@")[0],
          };
        }

        if (user.password !== password) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name || user.email.split("@")[0],
          image: user.image || null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
});
