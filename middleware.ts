import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "super_secret_wa_sender_key_2026_secured_random_string_xyz",
});

export const config = {
  matcher: [
    "/((?!api/auth|api/campaigns|api/wa/sessions|api/wa/qr|api/chats|api/templates|api/webhooks|api/v1|api/drip|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
