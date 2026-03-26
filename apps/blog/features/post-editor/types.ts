import * as z from "zod";

export const createAccountFormSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z.object({
    title: z
      .string()
      .min(2, t("submit_page.string_must_contain", { num: 2 }))
      .max(255, t("submit_page.maximum_characters", { num: 255 })),
    postArea: z.string().min(1, t("submit_page.string_must_contain", { num: 1 })),
    postSummary: z.string().max(140, t("submit_page.maximum_characters", { num: 140 })),
    tags: z.string(),
    author: z.string().max(50, t("submit_page.maximum_characters", { num: 50 })),
    category: z.string(),
    beneficiaries: z.array(
      z.object({
        account: z.string(),
        weight: z.string(),
      })
    ),
    maxAcceptedPayout: z.number(),
    payoutType: z.string(),
  });

export type AccountFormValues = z.infer<ReturnType<typeof createAccountFormSchema>>;
