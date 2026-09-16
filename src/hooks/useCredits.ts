import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Every new account gets this many complimentary credits. */
export const INITIAL_CREDITS = 2;

export class NoCreditsError extends Error {
  constructor() {
    super("You've used your complimentary credits. Upgrade to keep booking.");
    this.name = "NoCreditsError";
  }
}

/** Complimentary credit balance for the signed-in account. */
export function useCredits() {
  return useQuery({
    queryKey: ["credits"],
    staleTime: 10_000,
    queryFn: async (): Promise<number | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.credits ?? 0;
    },
  });
}

/**
 * Uses one credit. Throws NoCreditsError when the balance is already empty.
 * The balance can only ever go down — the database blocks any increase.
 */
export async function consumeCredit(): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Please sign in again.");

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: current, error: readError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .maybeSingle();
    if (readError) throw readError;

    const balance = current?.credits ?? 0;
    if (balance <= 0) throw new NoCreditsError();

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ credits: balance - 1 })
      .eq("id", userId)
      .eq("credits", balance)
      .select("credits")
      .maybeSingle();
    if (error) throw error;
    if (updated) return updated.credits;
  }

  throw new Error("Could not update your credit balance. Please try again.");
}

/** Paid subscriptions are not limited by complimentary credits. */
export function isPaidPlan(planStatus: string | undefined) {
  return planStatus === "active";
}
