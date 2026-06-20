import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({
      auth: {
        isLoggedIn: false,
        email: null,
        displayName: null,
      },
    });
  }

  return NextResponse.json({
    auth: {
      isLoggedIn: true,
      email: user.email,
      displayName: user.displayName,
    },
    user: {
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
