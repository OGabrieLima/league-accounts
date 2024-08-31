import { z } from "zod"
import "dotenv/config";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	RIOT_API_KEY: z.string().min(1)
});

export const env = envSchema.parse(process.env);