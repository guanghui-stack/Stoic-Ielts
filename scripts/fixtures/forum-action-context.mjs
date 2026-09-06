// Chỉ nạp qua loader kiểm thử; không dùng trong ứng dụng.
export const context = {user: {id: "owner", role: "STUDENT"}, paths: []};
export async function requireUser() { return context.user; }
export async function requireAdmin() {
  if (context.user.role !== "ADMIN") throw new Error("Chỉ quản trị viên");
  return context.user;
}
export function revalidatePath(path) { context.paths.push(path); }
export class Redirect extends Error { constructor(path) {super(path); this.path = path;} }
export function redirect(path) { throw new Redirect(path); }
