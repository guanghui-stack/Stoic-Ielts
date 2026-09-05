export type StudentAvatarAccount = {
  id: string;
  avatarUrl: string | null;
  uploadedAvatar: { updatedAt: Date } | null;
};

/**
 * Anh tai len duoc phuc vu qua route co xac thuc thay vi chen nguyen data URL
 * vao RSC. Tham so phien ban doi moi khi anh doi, nen trinh duyet co the cache
 * lau ma van nhan dung anh moi.
 */
export function studentAvatarSource(
  account: StudentAvatarAccount,
): string | null {
  if (!account.uploadedAvatar) return account.avatarUrl;
  return `/api/students/${encodeURIComponent(account.id)}/avatar?v=${account.uploadedAvatar.updatedAt.getTime()}`;
}
