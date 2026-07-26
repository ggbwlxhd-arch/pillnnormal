// app/api/parse-diary/route.ts
// 선생님이 자유롭게 적은 줄글을 운동일지 폼 필드에 맞는 JSON으로 변환
// ⚠️ 서버에서만 실행 — ANTHROPIC_API_KEY 클라이언트에 노출되지 않음

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const EQUIP = ['리포머', '캐딜락', '체어', '바렐', '스프링보드', '매트'];
const BODY_PARTS = [
  '목', '어깨(좌)', '어깨(우)', '등(상부)', '등(하부)', '허리', '골반',
  '고관절(좌)', '고관절(우)', '무릎(좌)', '무릎(우)', '발목(좌)', '발목(우)',
  '손목(좌)', '손목(우)', '치골결합', '미골',
];

const SYSTEM_PROMPT = `너는 필라테스 선생님이 자유롭게 쓴 줄글 메모를 운동일지 입력 폼의 필드로 정리하는 도우미야.

아래 JSON 스키마에 정확히 맞춰서만 응답해. 다른 설명이나 마크다운 코드블록 없이 순수 JSON만 출력해.

{
  "equipment": string[],        // 다음 중에서만 선택: ${JSON.stringify(EQUIP)}. 언급 없으면 빈 배열.
  "purpose": string | null,     // 오늘 운동의 목적/포커스. 짧게. 언급 없으면 null.
  "content": string,            // 오늘 진행한 운동 내용 요약. 반드시 있어야 함.
  "compensation": string | null,// 보상작용, 주의사항. 언급 없으면 null.
  "improvement": string | null, // 잘한 점, 개선된 점. 언급 없으면 null.
  "homework": string | null,    // 숙제 — 별도로 처리하므로 여기선 null로 둬.
  "pain_changes": [
    {
      "body_part": string,      // 다음 중에서만: ${JSON.stringify(BODY_PARTS)}
      "prev_nrs": number,       // 이전 통증 점수 0~10
      "curr_nrs": number        // 현재 통증 점수 0~10
    }
  ]
}

말투 규칙:
- content, compensation, improvement는 반드시 존댓말(~했습니다, ~확인됩니다, ~향상되었습니다)로 작성해.
- compensation에는 절대 "주의해주세요", "조심하세요" 같은 지시형 표현 쓰지 마. 관찰 사실만 담담하게 서술해.
- improvement는 칭찬하되 자연스럽고 따뜻한 어조로.

규칙:
- 원문에 없는 내용을 지어내지 마.
- body_part는 반드시 목록에 있는 표현으로 매핑해.
- 통증 점수 숫자 언급 없으면 pain_changes 빈 배열로 둬.
- homework는 항상 null — 별도 시스템에서 처리함.
- content는 반드시 값이 있어야 해.`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 1. Claude AI로 일지 분석
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: `Claude API 오류: ${errText}` }, { status: 500 });
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: '파싱 결과를 해석하지 못했습니다.' }, { status: 500 });
    }

    // 안전장치
    parsed.equipment = Array.isArray(parsed.equipment)
      ? parsed.equipment.filter((e: string) => EQUIP.includes(e)) : [];
    parsed.pain_changes = Array.isArray(parsed.pain_changes)
      ? parsed.pain_changes.filter((p: any) => BODY_PARTS.includes(p.body_part)) : [];
    parsed.homework = null; // 항상 null — 아래에서 별도 처리

    // 2. 숙제 사전에서 키워드 매칭
    const { data: hwDict } = await supabase
      .from('homework_dict')
      .select('*');

    let matchedHw = null;
    let matchedVidUrl = null;
    let matchedVidTitle = null;

    if (hwDict && hwDict.length > 0) {
      const matched = hwDict.filter((h: any) => text.includes(h.keyword));
      if (matched.length > 0) {
        // 숙제 설명 합치기
        matchedHw = matched.map((h: any) => h.description).join('\n');
        // 첫 번째 영상 URL 사용
        const withUrl = matched.find((h: any) => h.video_url);
        if (withUrl) {
          matchedVidUrl = withUrl.video_url;
          matchedVidTitle = withUrl.video_title;
        }
      }
    }

    return NextResponse.json({
      ...parsed,
      homework: matchedHw,
      video_url: matchedVidUrl,
      video_title: matchedVidTitle,
      matched_keywords: hwDict
        ? hwDict.filter((h: any) => text.includes(h.keyword)).map((h: any) => h.keyword)
        : [],
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}
