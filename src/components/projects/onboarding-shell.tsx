"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithChapters, UserProfile } from "@/types";

export function OnboardingShell({
  projects,
  profile,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects/new");
  }, [router]);

  return null;
}
