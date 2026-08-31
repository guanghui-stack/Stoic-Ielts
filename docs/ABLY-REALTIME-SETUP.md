# Thiết lập Ably Free cho STOIC · IELTS

Ably chỉ báo trạng thái online và phát tín hiệu để trình duyệt tải dữ liệu mới.
Tin nhắn, bài viết và bình luận luôn được ghi vào MySQL trước.

## Tạo API key chuyên dụng

Trong application dành cho `stoic-ielts.online`, tạo key mới; không dùng key
`Root`. Chỉ bật:

- `Publish`
- `Subscribe`
- `Presence`

Tắt History, Message Delete, Push, LiveObjects, Statistics, Privileged Headers
và các quyền còn lại. Giới hạn resource ở đúng ba namespace:

```text
chat:user:*
forum:level:*
presence:students
```

Key này chỉ nằm ở máy chủ. Token trình duyệt sống 10 phút và bị thu hẹp tiếp:

- học viên `U` chỉ subscribe `chat:user:U`;
- học viên bậc `L` chỉ subscribe `forum:level:1` đến `forum:level:L`;
- học viên được enter và quan sát `presence:students`.

Không dán API key thật vào mã nguồn, tài liệu, issue hoặc chat. Repository là
public và CI có bộ quét khóa Ably trước khi cho phép merge.

## Biến môi trường Hostinger

Trong hPanel → website → **Biến môi trường**, thêm:

```text
ABLY_API_KEY=<KHÓA_API_ABLY>
ENABLE_ABLY_REALTIME=true
```

`ENABLE_ABLY_CHAT=true` vẫn được nhận tạm thời như tên cũ, nhưng cấu hình mới
phải dùng `ENABLE_ABLY_REALTIME`. Không dùng tiền tố `NEXT_PUBLIC_` cho API key.

## Kênh và dữ liệu được phát

| Kênh | Phạm vi | Payload |
|---|---|---|
| `presence:students` | Học viên đăng nhập ở bất kỳ trang nào | Chỉ ID do máy chủ gắn; không có tên, email hoặc bậc |
| `chat:user:<userId>` | Đúng người nhận | `conversationId`, `messageId` |
| `forum:level:<level>` | Người đã đạt bậc tương ứng | Loại thay đổi, `postId`, `commentId` nếu có |

Máy chủ luôn đọc bậc từ MySQL khi cấp token; không nhận `userId` hoặc `level` từ
request để quyết định capability.

## Tắt nhanh

Đặt cả hai biến sau thành `false`, áp dụng rồi tái triển khai:

```text
ENABLE_ABLY_REALTIME=false
ENABLE_ABLY_CHAT=false
```

Chat và diễn đàn vẫn đọc/ghi MySQL. Chat quay về polling; Presence không hiện.
Không cần rollback database vì realtime không thêm bảng hoặc cột.

## Xác minh sau triển khai

1. Mở hai trình duyệt hoặc hai hồ sơ trình duyệt, đăng nhập hai học viên.
2. Để A ở trang bất kỳ; mở Đối Thoại hoặc Nghị Sự Đường ở B và xác nhận A online.
3. Gửi tin riêng và xác nhận bên nhận cập nhật gần như ngay lập tức.
4. Đăng chủ đề Bậc 4; xác nhận Bậc 4 nhận cập nhật còn Bậc 3 không nhận sự kiện.
5. Tắt mạng, tạo thêm dữ liệu, bật lại và xác nhận MySQL đồng bộ đầy đủ.
6. Đăng xuất và xác nhận trạng thái online biến mất sau khoảng phục hồi ngắn.
7. Kiểm tra connection, channel, presence member và message usage trong Ably.

## Giới hạn gói Free

Mỗi tab là một connection và Presence member. Giao diện phải gộp nhiều member có
cùng `clientId`; chỉ đánh dấu offline khi tab cuối cùng rời.

Presence được enter ở mọi trang, nhưng chỉ tải danh sách thành viên khi Đối Thoại
hoặc Nghị Sự Đường cần hiển thị. Khi số tab đồng thời tiến gần 150–200, phải đánh
giá lại kiến trúc hoặc nâng gói.

Giới hạn có thể thay đổi; kiểm tra lại [Ably Free](https://ably.com/docs/platform/pricing/free),
[giới hạn nền tảng](https://ably.com/docs/platform/pricing/limits) và
[cách tính message](https://ably.com/docs/platform/pricing/message-counting).
