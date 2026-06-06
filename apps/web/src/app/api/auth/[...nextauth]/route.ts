import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const { data } = await axios.post(`${API_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password,
          });
          if (data.data?.user && data.data?.accessToken) {
            return {
              ...data.data.user,
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            };
          }
          return null;
        } catch (err: any) {
          const status = err?.response?.status;
          // 401/403 = credenciales incorrectas → NextAuth lanza CredentialsSignin
          if (status === 401 || status === 403) return null;
          // 5xx o sin conexión = problema de servidor → error distinguible
          throw new Error('ServerError');
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
      }
      if (account?.provider === 'google') {
        try {
          const { data } = await axios.post(`${API_URL}/auth/google/token`, {
            googleToken: account.id_token,
          });
          token.accessToken = data.data?.accessToken;
          token.refreshToken = data.data?.refreshToken;
          token.organizationId = data.data?.user?.organizationId;
          token.role = data.data?.user?.role;
        } catch {
          // Handle gracefully
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      session.user = {
        ...session.user,
        id: token.id as string,
        role: token.role as string,
        organizationId: token.organizationId as string,
      } as any;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
