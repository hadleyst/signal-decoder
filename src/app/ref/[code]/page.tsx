import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 30 days
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RefPage({ params }: Props) {
  const { code } = await params;

  // Only accept [a-z0-9]{1,32} — ignore garbage
  const clean = code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);

  if (clean.length > 0) {
    const cookieStore = await cookies();
    cookieStore.set("signaldecoder_ref", clean, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false, // client needs to read it for checkout
      secure: process.env.NODE_ENV === "production",
    });
  }

  redirect("/");
}
