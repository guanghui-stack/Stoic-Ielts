import {
  TAG_MAX,
  cleanTag,
  extractTagsFromBody,
  formatTaggedBody,
  normalizeTags,
} from "../src/lib/forum/tags.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures += 1;
  }
}

console.log("\n— Luật hệ thống tag —");
check("bỏ dấu # và chuẩn hóa khoảng trắng", cleanTag("  ##Matching   Headings  "), "Matching Headings");
check("Unicode NFC được chuẩn hóa", cleanTag("Cafe\u0301"), "Café");
check("chống trùng không phân biệt hoa thường", normalizeTags(["Reading", "reading", "#READING", "Writing"]), ["Reading", "Writing"]);
check("giới hạn tối đa năm tag", normalizeTags(["a", "b", "c", "d", "e", "f"]), ["a", "b", "c", "d", "e"]);
check("hằng giới hạn là năm", TAG_MAX, 5);

const taggedBody = formatTaggedBody(["matching headings", "Reading"], "Nội dung trao đổi");
check("format metadata tag tương thích rich text", taggedBody, "**Chủ đề:** #matching-headings #Reading\n\nNội dung trao đổi");
check("parse metadata tag thành chip data", extractTagsFromBody(taggedBody), {
  tags: ["matching-headings", "Reading"],
  content: "Nội dung trao đổi",
});
check("bài cũ không có tag vẫn giữ nguyên nội dung", extractTagsFromBody("Bài viết cũ\n\nKhông có metadata."), {
  tags: [],
  content: "Bài viết cũ\n\nKhông có metadata.",
});

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử tag thất bại.`);
  process.exit(1);
}
console.log("✅ HỆ TAG ĐỀU ĐẠT");
