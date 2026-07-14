import { z } from "zod";

const oEmbedSchema = z.object({
  title: z.string().max(500).optional(),
  author_name: z.string().max(300).optional(),
  thumbnail_url: z.string().url().optional(),
}).passthrough();

export function parseOEmbedMetadata(value: unknown) {
  const parsed = oEmbedSchema.safeParse(value);
  if (!parsed.success) return null;
  return { title: parsed.data.title || null, creator: parsed.data.author_name || null, thumbnailUrl: parsed.data.thumbnail_url || null };
}
