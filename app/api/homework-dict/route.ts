// app/api/homework-dict/route.ts
// 숙제 사전 조회/추가/삭제 API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// 전체 조회
export async function GET() {
  const { data, error } = await supabase
    .from('homework_dict')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 추가/수정
export async function POST(req: NextRequest) {
  const { keyword, description, video_url, video_title } = await req.json();
  if (!keyword || !description) {
    return NextResponse.json({ error: '키워드와 설명은 필수입니다' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('homework_dict')
    .upsert({ keyword, description, video_url: video_url || null, video_title: video_title || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 삭제
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const { error } = await supabase.from('homework_dict').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
