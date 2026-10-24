# AI CLASSROOM – Hướng dẫn đưa lên GitHub và Netlify

## Cấu trúc
```
statverse/
├─ public/index.html, app.js      (giao diện + logic)
├─ netlify/functions/chat.js      (gọi AI phía máy chủ)
├─ netlify.toml                   (cấu hình Netlify)
└─ supabase/schema.sql            (tạo bảng diễn đàn)
```

## Bước 1 – Tạo bảng diễn đàn trên Supabase
1. Vào https://supabase.com/dashboard → mở project của bạn.
2. **SQL Editor** → **New query** → dán toàn bộ `supabase/schema.sql` → **Run**.

## Bước 2 – Đưa lên GitHub
1. https://github.com → **New repository** → tên `ai-classroom` → **Create repository**.
2. Không cần lệnh: bấm **uploading an existing file**, kéo thả TOÀN BỘ nội dung thư mục `statverse` (giữ nguyên thư mục con, kể cả `netlify.toml`) → **Commit changes**.
   Hoặc dùng lệnh:
   ```
   cd statverse
   git init && git add . && git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<ten-ban>/ai-classroom.git
   git push -u origin main
   ```

## Bước 3 – Triển khai trên Netlify
1. https://app.netlify.com → **Add new site → Import an existing project → GitHub** → chọn repo `ai-classroom`.
2. Build command: để trống. Publish directory: `public` (đã có trong netlify.toml). Bấm **Deploy**.
3. **Site configuration → Environment variables → Add a variable**:
   - `ANTHROPIC_API_KEY` = khoá API Claude của bạn (https://console.anthropic.com)
   - (tuỳ chọn) `ANTHROPIC_MODEL` = tên model muốn dùng
4. **Deploys → Trigger deploy → Clear cache and deploy site**.
5. Mở `https://<ten-site>.netlify.app`. Micro và camera chỉ chạy trên HTTPS (Netlify có sẵn).

## Bước 4 – Dán địa chỉ Netlify vào Supabase (làm sau)
Supabase → **Authentication → URL Configuration** → điền **Site URL** là địa chỉ Netlify.

## Kiểm tra nhanh
- Giải bài → gõ `3*(4+5)^2` → **＝ Tính** → 243 (không cần AI).
- Micro: bấm 🎤, nói nhiều câu; chỉ tắt khi bạn bấm ⏹.
- Mở web ở 2 máy → Diễn đàn → đăng ở máy 1, máy 2 tự hiện.
- Chatbot 💬 và "Giải đề" cần đã đặt `ANTHROPIC_API_KEY`.
