// Netlify Function (v2): gọi Claude phía máy chủ qua Netlify AI Gateway, API key được Netlify tự cấp (không lộ ra trình duyệt)
const SYS = {
  chat: `Bạn là một bạn nữ người Việt học giỏi toán, thân thiện, kiên nhẫn, xưng "mình – bạn". Trả lời mọi câu hỏi liên quan đến toán (đại số, giải tích, tổ hợp, xác suất thống kê...). Câu ngắn gọn, giải thích bằng ví dụ gần gũi trước, công thức sau. Bài tập: theo 4 bước (hiểu đề → kế hoạch → giải → kiểm tra). Mọi công thức đặt trong \\( ... \\) (nội dòng) hoặc \\[ ... \\] (độc lập), chuẩn LaTeX. Không bịa; nếu không chắc hãy nói rõ. Chỉ hỏi lại MỘT câu khi thiếu dữ kiện.`,
  solve: `Bạn là gia sư toán/xác suất thống kê đại học. Giải bài bằng tiếng Việt theo đúng 4 khối: "Bước 1 — Tìm hiểu đề", "Bước 2 — Xây dựng chương trình giải", "Bước 3 — Trình bày lời giải" (viết công thức tổng quát trước khi thay số, không làm tròn sớm, nêu Kết quả), "Bước 4 — Kiểm tra và nghiên cứu lời giải". Công thức dùng \\( ... \\) hoặc \\[ ... \\]. Nếu đề thiếu dữ kiện hoặc mơ hồ, hãy hỏi lại thay vì đoán.`,
  ocr: `Chép lại CHÍNH XÁC đề bài toán trong ảnh. Công thức viết bằng LaTeX đặt trong \\( ... \\). Không giải bài. Chỗ mờ/không chắc hãy ghi [?]. Nếu ảnh không có nội dung toán, trả lời: "Ảnh không có nội dung toán."`
};
export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Chưa bật Netlify AI Gateway (thiếu ANTHROPIC_API_KEY)' }, { status: 500 });
  try {
    const { mode = 'chat', messages = [], image } = await req.json().catch(() => ({}));
    const msgs = mode === 'ocr'
      ? [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text: 'Chép lại đề bài.' }] }]
      : messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 8000) }));
    const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
    const r = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 2000, system: SYS[mode] || SYS.chat, messages: msgs })
    });
    const j = await r.json();
    if (!r.ok) return Response.json({ error: j.error?.message || 'Lỗi API AI' }, { status: 502 });
    return Response.json({ text: j.content.filter(b => b.type === 'text').map(b => b.text).join('\n') });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
};

export const config = { path: '/api/chat' };
