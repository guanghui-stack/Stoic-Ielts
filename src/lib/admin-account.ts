import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Logic bảo đảm tài khoản quản trị — tách riêng khỏi init-db để kiểm thử được
 * độc lập với database thật (xem scripts/test-admin-account.ts).
 */

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  activeSessionId: string | null;
};

/** Phần giao diện Prisma tối thiểu mà hàm này cần. */
export type AdminDb = {
  user: {
    findUnique(args: { where: { email: string } }): Promise<AdminUser | null>;
    findFirst(args: {
      where: { role: string; email: { in: string[] } };
    }): Promise<AdminUser | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    updateMany(args: {
      where: { email: { in: string[] }; active: boolean };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  config: {
    findUnique(args: {
      where: { key: string };
    }): Promise<{ key: string; value: string } | null>;
    upsert(args: {
      where: { key: string };
      update: { value: string };
      create: { key: string; value: string };
    }): Promise<unknown>;
  };
};

/** Các email quản trị mặc định cũ cần được thay thế / vô hiệu hóa. */
export const LEGACY_ADMIN_EMAILS = ["admin@wobridges.vn"];

const FINGERPRINT_KEY = "ADMIN_PASSWORD_FINGERPRINT";

export type EnsureAdminResult = {
  /** promoted: nâng quyền tài khoản sẵn có · renamed: đổi email admin cũ · created: tạo mới · unchanged */
  action: "promoted" | "renamed" | "created" | "unchanged";
  /** Mật khẩu tạm sinh ngẫu nhiên khi tạo mới mà không có ADMIN_PASSWORD. */
  temporaryPassword?: string;
  /** Có chắc chắn đăng nhập được bằng tài khoản này không. */
  usable: boolean;
  /** Số tài khoản quản trị mặc định cũ đã bị khóa. */
  lockedLegacy: number;
  messages: string[];
};

/**
 * Bảo đảm luôn có đúng một tài khoản quản trị đang hoạt động.
 *
 * Mật khẩu từ biến môi trường chỉ được áp dụng KHI GIÁ TRỊ THAY ĐỔI (so bằng
 * vân tay SHA-256 lưu trong bảng Config) — nhờ vậy mật khẩu tự đổi trong giao
 * diện không bị ghi đè trở lại sau mỗi lần triển khai.
 */
export async function ensureAdminAccount(
  db: AdminDb,
  opts: { email: string; name: string; envPassword?: string }
): Promise<EnsureAdminResult> {
  const email = opts.email.trim().toLowerCase();
  const envPassword = opts.envPassword?.trim();
  const messages: string[] = [];

  /** Băm mật khẩu nếu env đặt giá trị mới; null nghĩa là giữ nguyên mật khẩu cũ. */
  const pendingPasswordHash = async (): Promise<string | null> => {
    if (!envPassword) return null;
    const fingerprint = createHash("sha256").update(envPassword).digest("hex");
    const applied = await db.config.findUnique({ where: { key: FINGERPRINT_KEY } });
    if (applied?.value === fingerprint) return null; // đã áp dụng trước đó
    const hash = await bcrypt.hash(envPassword, 10);
    await db.config.upsert({
      where: { key: FINGERPRINT_KEY },
      update: { value: fingerprint },
      create: { key: FINGERPRINT_KEY, value: fingerprint },
    });
    return hash;
  };

  let action: EnsureAdminResult["action"] = "unchanged";
  let usable = false;
  let temporaryPassword: string | undefined;

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    const wasAdmin = existing.role === "ADMIN";
    const data: Record<string, unknown> = {};
    if (!wasAdmin) data.role = "ADMIN";
    if (!existing.active) data.active = true;
    const hash = await pendingPasswordHash();
    if (hash) {
      data.passwordHash = hash;
      data.activeSessionId = null;
    }
    if (Object.keys(data).length > 0) {
      await db.user.update({ where: { id: existing.id }, data });
      action = wasAdmin ? "unchanged" : "promoted";
      messages.push(`Đã cập nhật tài khoản quản trị: ${email}`);
    }
    // Đã là admin từ trước, hoặc vừa đặt mật khẩu mới → chắc chắn đăng nhập được.
    // Nếu chỉ nâng quyền một tài khoản học viên cũ thì mật khẩu là mật khẩu học
    // viên đó — chưa chắc người vận hành còn nhớ, nên giữ lại lối vào dự phòng.
    usable = wasAdmin || Boolean(hash);
    if (!usable) {
      messages.push(
        `LƯU Ý: ${email} vốn là tài khoản học viên, nay được cấp quyền quản trị — hãy đăng nhập bằng đúng mật khẩu của tài khoản đó (hoặc đặt biến ADMIN_PASSWORD).`
      );
    }
  } else {
    // Chưa có → ưu tiên ĐỔI TÊN tài khoản admin cũ để giữ nguyên lịch sử chấm bài
    const legacy = await db.user.findFirst({
      where: { role: "ADMIN", email: { in: LEGACY_ADMIN_EMAILS } },
    });
    const hash = await pendingPasswordHash();
    if (legacy) {
      await db.user.update({
        where: { id: legacy.id },
        data: {
          email,
          active: true,
          ...(hash ? { passwordHash: hash, activeSessionId: null } : {}),
        },
      });
      action = "renamed";
      usable = true; // đổi tên chính tài khoản đang dùng → mật khẩu cũ vẫn vào được
      messages.push(
        `Đã đổi email đăng nhập quản trị: ${legacy.email} → ${email}` +
          (hash ? " (kèm mật khẩu mới)" : " (giữ nguyên mật khẩu cũ)")
      );
    } else {
      // Database trắng → tạo mới. Không có ADMIN_PASSWORD thì sinh mật khẩu
      // ngẫu nhiên và in ra nhật ký để người vận hành đăng nhập lần đầu.
      const temp = envPassword || randomBytes(9).toString("base64url");
      await db.user.create({
        data: {
          email,
          name: opts.name,
          passwordHash: hash ?? (await bcrypt.hash(temp, 10)),
          role: "ADMIN",
        },
      });
      action = "created";
      usable = true;
      messages.push(`Đã tạo tài khoản quản trị: ${email}`);
      if (!envPassword) {
        temporaryPassword = temp;
        messages.push(
          `Mật khẩu tạm thời: ${temp} — hãy đăng nhập và đổi ngay tại /doi-mat-khau`
        );
      }
    }
  }

  // Vô hiệu hóa tài khoản admin mặc định còn sót lại (mật khẩu mặc định từng
  // nằm trong mã nguồn công khai nên không được phép đăng nhập nữa) — chỉ làm
  // khi đã chắc chắn còn lối vào khu quản trị bằng tài khoản mới.
  let lockedLegacy = 0;
  const stale = LEGACY_ADMIN_EMAILS.filter((e) => e !== email);
  if (usable && stale.length > 0) {
    const res = await db.user.updateMany({
      where: { email: { in: stale }, active: true },
      data: { active: false, role: "STUDENT" },
    });
    lockedLegacy = res.count;
    if (lockedLegacy > 0) {
      messages.push(`Đã khóa ${lockedLegacy} tài khoản quản trị mặc định cũ`);
    }
  }

  return { action, usable, temporaryPassword, lockedLegacy, messages };
}
