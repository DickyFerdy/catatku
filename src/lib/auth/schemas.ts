import { z } from "zod";

export const authInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password terlalu panjang"),
});

export type AuthInput = z.infer<typeof authInputSchema>;
