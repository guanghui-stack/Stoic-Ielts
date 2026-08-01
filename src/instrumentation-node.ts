import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Tự động chuẩn bị mọi thứ khi server khởi động:
 *   1. Xác định DATABASE_URL (đọc trực tiếp, từ .env, hoặc ghép từ các biến
 *      thành phần MYSQL_* / DB_* mà Hostinger cung cấp khi kết nối database)
 *   2. Tạo bảng MySQL + migration + seed admin/bài mẫu (không cần Prisma CLI)
 *   3. Lấy SESSION_SECRET từ bảng Config trong database — nhờ đó phiên đăng
 *      nhập của học viên sống qua các lần triển khai lại (file trên hosting
 *      bị làm mới mỗi lần deploy nên không thể dựa vào .env)
 */
export async function setupServer() {
  const g = globalThis as { __wobridgesInit?: string };
  const root = process.cwd();
  const envPath = path.join(root, ".env");

  let envText = "";
  try {
    envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  } catch {
    /* không đọc được .env — bỏ qua */
  }

  const readFromEnvFile = (key: string): string | null => {
    const match = envText.match(new RegExp(`^${key}=["']?([^"'\r\n]+)`, "m"));
    return match ? match[1] : null;
  };

  /* ===== 1. DATABASE_URL ===== */
  if (!process.env.DATABASE_URL) {
    const fromFile = readFromEnvFile("DATABASE_URL");
    if (fromFile) {
      process.env.DATABASE_URL = fromFile;
    } else {
      // Ghép từ biến thành phần nếu nền tảng hosting cung cấp theo dạng đó
      const pick = (...names: string[]) =>
        names.map((n) => process.env[n]).find(Boolean);
      const host = pick("MYSQL_HOST", "MYSQLHOST", "DB_HOST", "DATABASE_HOST");
      const user = pick("MYSQL_USER", "MYSQLUSER", "DB_USER", "DB_USERNAME", "DATABASE_USER");
      const pass = pick("MYSQL_PASSWORD", "MYSQLPASSWORD", "DB_PASSWORD", "DATABASE_PASSWORD");
      const name = pick("MYSQL_DATABASE", "MYSQLDATABASE", "DB_NAME", "DB_DATABASE", "DATABASE_NAME");
      const port = pick("MYSQL_PORT", "MYSQLPORT", "DB_PORT", "DATABASE_PORT") ?? "3306";
      if (host && user && name) {
        process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass ?? "")}@${host}:${port}/${name}`;
        console.log("[wobridges] Đã ghép DATABASE_URL từ biến môi trường MySQL của hosting");
      } else {
        g.__wobridgesInit =
          "Thiếu DATABASE_URL — hãy tạo database MySQL trong hPanel và thêm biến môi trường DATABASE_URL";
        console.error(`[wobridges] ${g.__wobridgesInit}`);
        return;
      }
    }
  }

  /* ===== 2 + 3. Khởi tạo database và SESSION_SECRET ===== */
  if (process.env.NODE_ENV === "production") {
    const { initDatabase, getOrCreateSessionSecret } = await import(
      "./lib/init-db"
    );

    let initError: unknown = null;
    try {
      console.log("[wobridges] Kiểm tra database + tài khoản admin…");
      await initDatabase();
    } catch (err) {
      initError = err;
      console.error("[wobridges] Khởi tạo database thất bại:", err);
    }

    /**
     * Lấy SESSION_SECRET NGAY CẢ KHI bước trên hỏng.
     *
     * Bài học phải trả giá: một lệnh tạo bảng lỗi từng kéo theo việc bỏ qua
     * bước này, khiến khóa phiên rơi về giá trị ngẫu nhiên tạm — và mọi học
     * viên đang đăng nhập bị đá ra ngoài. Hai việc đó không liên quan gì đến
     * nhau, nên không được để chúng chết chung.
     */
    if (!process.env.SESSION_SECRET) {
      try {
        process.env.SESSION_SECRET = await getOrCreateSessionSecret();
      } catch (err) {
        console.error("[wobridges] Không lấy được SESSION_SECRET:", err);
      }
    }

    if (initError) {
      g.__wobridgesInit = String(initError).slice(0, 500);
    } else {
      g.__wobridgesInit = "ok";
      console.log("[wobridges] Khởi tạo hoàn tất — website sẵn sàng.");
    }
  }

  // Phòng hờ cuối: vẫn bảo đảm có SESSION_SECRET để đăng nhập không sập
  // (giá trị tạm trong bộ nhớ — sẽ đổi khi khởi động lại)
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET =
      readFromEnvFile("SESSION_SECRET") ?? randomBytes(32).toString("hex");
  }
}
