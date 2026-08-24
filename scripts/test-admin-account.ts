/**
 * Kiểm thử logic tài khoản quản trị với database giả lập trong bộ nhớ.
 * Chạy: node --experimental-strip-types scripts/test-admin-account.ts
 */
import bcrypt from "bcryptjs";
import {
  ensureAdminAccount,
  type AdminDb,
  type AdminUser,
} from "../src/lib/admin-account.ts";

type Row = AdminUser & {
  name: string;
  passwordHash: string;
  activeSessionId: string | null;
};

function makeDb(users: Row[], config: Record<string, string> = {}) {
  const db = {
    users,
    config,
    user: {
      async findUnique({ where }: { where: { email: string } }) {
        return users.find((u) => u.email === where.email) ?? null;
      },
      async findFirst({
        where,
      }: {
        where: { role: string; email: { in: string[] } };
      }) {
        return (
          users.find(
            (u) => u.role === where.role && where.email.in.includes(u.email)
          ) ?? null
        );
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) {
        const u = users.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return u;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const u = {
          id: `u${users.length + 1}`,
          activeSessionId: null,
          ...data,
        } as Row;
        users.push(u);
        return u;
      },
      async updateMany({
        where,
        data,
      }: {
        where: { email: { in: string[] }; active: boolean };
        data: Record<string, unknown>;
      }) {
        const hit = users.filter(
          (u) => where.email.in.includes(u.email) && u.active === where.active
        );
        hit.forEach((u) => Object.assign(u, data));
        return { count: hit.length };
      },
    },
    config_: config,
    configStore: config,
  } as unknown as AdminDb & { users: Row[] };

  (db as unknown as { config: unknown }).config = {
    async findUnique({ where }: { where: { key: string } }) {
      return config[where.key] ? { key: where.key, value: config[where.key] } : null;
    },
    async upsert({
      where,
      update,
      create,
    }: {
      where: { key: string };
      update: { value: string };
      create: { key: string; value: string };
    }) {
      config[where.key] = config[where.key] ? update.value : create.value;
      return null;
    },
  };
  return db;
}

const NEW_EMAIL = "dangquanghuy17012001@gmail.com";
const LEGACY = "admin@wobridges.vn";
const OLD_PASSWORD = "MatKhauCu@2026";
const ENV_PASSWORD = "MatKhauMoi@2026";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  console.log(`${cond ? "  ✓" : "  ✗ THẤT BẠI:"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

const legacyRow = async (): Promise<Row> => ({
  id: "u1",
  email: LEGACY,
  name: "Quản trị Wobridges",
  role: "ADMIN",
  active: true,
  activeSessionId: "sid-legacy",
  passwordHash: await bcrypt.hash(OLD_PASSWORD, 10),
});

const studentRow = async (email: string, pwd: string, id = "u2"): Promise<Row> => ({
  id,
  email,
  name: "Học viên",
  role: "STUDENT",
  active: true,
  activeSessionId: "sid-student",
  passwordHash: await bcrypt.hash(pwd, 10),
});

/* ===== TH1: DB hiện tại của Wobridges — admin cũ, chưa đặt ADMIN_PASSWORD ===== */
console.log("\nTH1 · Đổi email admin cũ (không đặt ADMIN_PASSWORD)");
{
  const users = [await legacyRow(), await studentRow("hocvien@test.vn", "abc12345")];
  const db = makeDb(users);
  const r = await ensureAdminAccount(db, { email: NEW_EMAIL, name: "Quản trị Wobridges" });
  const admin = users.find((u) => u.email === NEW_EMAIL)!;
  check("hành động = renamed", r.action === "renamed", r.action);
  check("chỉ còn 1 tài khoản ADMIN đang hoạt động",
    users.filter((u) => u.role === "ADMIN" && u.active).length === 1);
  check("email đăng nhập đã đổi", !!admin);
  check("giữ nguyên id (bảo toàn lịch sử chấm bài)", admin.id === "u1");
  check("MẬT KHẨU CŨ VẪN ĐĂNG NHẬP ĐƯỢC", await bcrypt.compare(OLD_PASSWORD, admin.passwordHash));
  check("email mặc định cũ không còn tồn tại", !users.some((u) => u.email === LEGACY));
  check("học viên khác không bị ảnh hưởng",
    users.find((u) => u.email === "hocvien@test.vn")!.active === true);
}

/* ===== TH2: Có đặt ADMIN_PASSWORD ===== */
console.log("\nTH2 · Đổi email kèm đặt mật khẩu qua ADMIN_PASSWORD");
{
  const users = [await legacyRow()];
  const cfg: Record<string, string> = {};
  const db = makeDb(users, cfg);
  const r = await ensureAdminAccount(db, {
    email: NEW_EMAIL,
    name: "Quản trị Wobridges",
    envPassword: ENV_PASSWORD,
  });
  const admin = users.find((u) => u.email === NEW_EMAIL)!;
  check("hành động = renamed", r.action === "renamed", r.action);
  check("đăng nhập được bằng MẬT KHẨU MỚI", await bcrypt.compare(ENV_PASSWORD, admin.passwordHash));
  check("mật khẩu cũ không còn dùng được", !(await bcrypt.compare(OLD_PASSWORD, admin.passwordHash)));
  check("đặt mật khẩu mới khi đổi tên thu hồi phiên legacy", admin.activeSessionId === null);
  check("đã lưu vân tay mật khẩu", Boolean(cfg.ADMIN_PASSWORD_FINGERPRINT));
}

/* ===== TH3: Triển khai lại nhiều lần — không ghi đè mật khẩu đổi trong giao diện ===== */
console.log("\nTH3 · Triển khai lại: mật khẩu tự đổi trong giao diện KHÔNG bị ghi đè");
{
  const users = [await legacyRow()];
  const cfg: Record<string, string> = {};
  const db = makeDb(users, cfg);
  await ensureAdminAccount(db, { email: NEW_EMAIL, name: "QT", envPassword: ENV_PASSWORD });
  // người dùng tự đổi mật khẩu trong giao diện
  const admin = users.find((u) => u.email === NEW_EMAIL)!;
  admin.passwordHash = await bcrypt.hash("TuDoiTrongGiaoDien@9", 10);
  // triển khai lại với cùng biến môi trường
  const r2 = await ensureAdminAccount(db, { email: NEW_EMAIL, name: "QT", envPassword: ENV_PASSWORD });
  check("lần 2 không thay đổi gì", r2.action === "unchanged", r2.action);
  check("MẬT KHẨU TỰ ĐỔI VẪN CÒN HIỆU LỰC",
    await bcrypt.compare("TuDoiTrongGiaoDien@9", admin.passwordHash));

  // đổi giá trị biến môi trường → áp dụng lại
  admin.activeSessionId = "sid-before-env-reset";
  await ensureAdminAccount(db, { email: NEW_EMAIL, name: "QT", envPassword: "DatLai@2027" });
  check("đổi giá trị biến thì mật khẩu được đặt lại",
    await bcrypt.compare("DatLai@2027", admin.passwordHash));
  check("đặt mật khẩu mới trên admin hiện có thu hồi phiên", admin.activeSessionId === null);
}

/* ===== TH4: Email admin mới trùng một tài khoản HỌC VIÊN đã có ===== */
console.log("\nTH4 · Email admin trùng tài khoản học viên sẵn có (không được khóa lối vào)");
{
  const users = [await legacyRow(), await studentRow(NEW_EMAIL, "MatKhauHocVien@1")];
  const db = makeDb(users);
  const r = await ensureAdminAccount(db, { email: NEW_EMAIL, name: "QT" });
  const promoted = users.find((u) => u.email === NEW_EMAIL)!;
  const legacy = users.find((u) => u.email === LEGACY)!;
  check("hành động = promoted", r.action === "promoted", r.action);
  check("tài khoản đó được cấp quyền ADMIN", promoted.role === "ADMIN");
  check("vẫn đăng nhập được bằng mật khẩu học viên",
    await bcrypt.compare("MatKhauHocVien@1", promoted.passwordHash));
  check("KHÔNG khóa admin cũ (giữ lối vào dự phòng)", legacy.active === true && legacy.role === "ADMIN");
  check("có cảnh báo cho người vận hành", r.messages.some((m) => m.includes("LƯU Ý")));
}

/* ===== TH5: Database trắng hoàn toàn ===== */
console.log("\nTH5 · Database trắng, không có ADMIN_PASSWORD");
{
  const users: Row[] = [];
  const db = makeDb(users);
  const r = await ensureAdminAccount(db, { email: NEW_EMAIL, name: "QT" });
  check("hành động = created", r.action === "created", r.action);
  check("có sinh mật khẩu tạm thời", Boolean(r.temporaryPassword));
  check("mật khẩu tạm dùng được",
    await bcrypt.compare(r.temporaryPassword!, users[0].passwordHash));
  check("tài khoản có quyền ADMIN", users[0].role === "ADMIN");
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
