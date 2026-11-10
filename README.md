# Tìm Số Online – 2 đến 4 người

Game tìm số 1–100, 1–200 hoặc 1–300. Tất cả người chơi nhìn cùng một bảng ô ly với các số xoay ngẫu nhiên. Ai bấm đúng số tiếp theo trước được +1 điểm; cuối trận ai nhiều điểm nhất thắng.

## Chạy trên máy tính

Cài Node.js 18+ rồi chạy:

```bash
npm install
npm start
```

Mở http://localhost:3000.

## Đẩy lên GitHub

```bash
git init
git add .
git commit -m "Create multiplayer number hunt game"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Thay USERNAME/REPO bằng repo của bạn. Nếu repo đã tồn tại, không chạy `git init`/`git remote add` lại.

## Deploy Render

1. Render → New → Web Service → Connect GitHub repository.
2. Language: Node; Build Command: `npm install`; Start Command: `npm start`.
3. Chọn instance và nhấn Deploy. Không chọn Static Site vì cần máy chủ Socket.IO.
4. Mở link Render, tạo phòng, bấm **Sao chép link mời**, gửi cho 1–3 người khác.

## Ghi chú

- Tất cả lựa chọn được kiểm tra trên máy chủ; nếu hai người bấm gần như cùng lúc, chỉ người được máy chủ ghi nhận trước nhận điểm.
- Người chơi rớt mạng có thể vào lại bằng cùng trình duyệt nhờ token lưu cục bộ.
- Dữ liệu phòng nằm trong RAM. Render restart/sleep sẽ làm mất phòng đang chơi. Dùng Redis/database nếu cần lưu bền vững hoặc triển khai nhiều instance.
- Game không có tiền cược hoặc giao dịch.

## V3 — chọn số người chơi

Chủ phòng chọn 2, 3 hoặc 4 người khi tạo phòng; cũng có thể đổi trong phòng chờ (không thấp hơn số người đã vào). Chỉ bắt đầu khi phòng đủ số người đã chọn và **tất cả đều sẵn sàng**. Người thứ N+1 không thể vào khi phòng đầy.


## V4 – Vietnamese / Simplified Chinese
- Switch language with the selector in the header. Each player may independently choose Vietnamese or Simplified Chinese.
- Language selection is saved in the browser. No server configuration change is required.
- UI, lobby, scores, results, room notices and server error messages are localized.


## V5 – song ngữ và luật chơi
- Nút **📖 Luật chơi / 游戏规则** trên đầu trang, dùng được trước và trong trận.
- Cửa sổ luật chơi đầy đủ 7 bước bằng tiếng Việt và tiếng Trung giản thể.
- Đổi ngôn ngữ ngay trong phòng hoặc khi đang mở luật chơi, không làm gián đoạn trận.
- Giữ nguyên giao thức server.js và cách deploy Render.
