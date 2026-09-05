import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  AVATAR_MAX_BYTES,
  AVATAR_OUTPUT_SIZE,
  isSafeAvatarWebp,
  webpDimensions,
} from "@/lib/avatar/rules";

const AVATAR_PREFIX = "data:image/webp;base64,";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const { userId } = await params;
  const avatar = await db.userAvatar.findFirst({
    where: {
      userId,
      user: { active: true, role: "STUDENT", isBot: false },
    },
    select: { data: true, updatedAt: true },
  });
  if (!avatar?.data.startsWith(AVATAR_PREFIX)) {
    return new Response(null, { status: 404 });
  }

  const image = Buffer.from(avatar.data.slice(AVATAR_PREFIX.length), "base64");
  const dimensions = webpDimensions(image);
  if (
    image.length === 0 ||
    image.length > AVATAR_MAX_BYTES ||
    !isSafeAvatarWebp(image) ||
    !dimensions ||
    dimensions.width !== AVATAR_OUTPUT_SIZE ||
    dimensions.height !== AVATAR_OUTPUT_SIZE
  ) {
    return new Response(null, { status: 404 });
  }

  const etag = `"avatar-${avatar.updatedAt.getTime()}-${image.length}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=31536000, immutable",
        Vary: "Cookie",
      },
    });
  }

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(image.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
