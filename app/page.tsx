"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/dist/client/components/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"></div>
  );
}
