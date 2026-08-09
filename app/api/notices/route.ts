import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// GET /api/notices            → 전체 목록 (관리자)
// GET /api/notices?member_id=X&active=true → 해당 회원에게 보여줄 활성 공지 (전체공지 + 개인공지)
export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get('member_id');
  const activeOnly = req.nextUrl.searchParams.get('active') === 'true';

  let query = supabase.from('notices').select('*').order('created_at', { ascending: false });
  if (activeOnly) query = query.eq('is_active', true);
  if (memberId) query = query.or(`member_id.is.null,member_id.eq.${memberId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notices: data });
}

// POST /api/notices — 공지 생성
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, content, member_id, bg_color, text_color, is_active } = body;
  if (!title?.trim()) return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase.from('notices').insert({
    title: title.trim(),
    content: content?.trim() || null,
    member_id: member_id || null,
    bg_color: bg_color || '#FEF3C7',
    text_color: text_color || '#111827',
    is_active: is_active !== false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notice: data });
}

// PUT /api/notices — 공지 수정 (body에 id 포함)
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 });

  const { data, error } = await supabase.from('notices').update(fields).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notice: data });
}

// DELETE /api/notices?id=X — 공지 삭제
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 });

  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
