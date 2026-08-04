"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArtAsset } from "@/lib/brand/art-manifest";

/**
 * Lớp ảnh thủy mặc, tự biến mất khi file không tải được.
 *
 * Đây là client component vì một lý do duy nhất: cần `onError`. Ảnh
 * production đi qua pipeline duyệt thủ công, nên trong phần lớn thời gian
 * phát triển các file này CHƯA TỒN TẠI. Nếu thiếu ảnh mà hero vỡ hoặc hiện
 * icon ảnh hỏng thì cả trang mất giá trị — trong khi thứ người học cần đọc
 * (tiêu đề, mô tả chức năng, nút bấm) vốn nằm hoàn toàn trong DOM.
 *
 * Khi ảnh hỏng, component trả về null và lớp mực CSS bên dưới lộ ra. Không
 * có khoảng trống nào xuất hiện vì phần tử này `absolute inset-0`, nên bố
 * cục không hề dịch chuyển.
 */
export function InkWashArt({
  asset,
  priority = false,
  className = "object-cover opacity-90",
}: {
  asset: ArtAsset;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      fill
      priority={priority}
      sizes="100vw"
      className={className}
      style={{ objectPosition: `${asset.focal.x}% ${asset.focal.y}%` }}
      onError={() => setFailed(true)}
    />
  );
}
