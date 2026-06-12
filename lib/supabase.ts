// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 회원 공유 페이지에서 사용하는 클라이언트
 * share_token을 헤더로 실어 보내면 RLS 정책에서
 * current_setting('app.share_token')으로 비교합니다.
 */
export function createMemberClient(shareToken: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-share-token': shareToken,
      },
    },
  });
}
