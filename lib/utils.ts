// lib/utils.ts

export type Member = {
  id: string;
  name: string;
  phone: string | null;
  registered_at: string;
  notes: string | null;
  is_pregnant: boolean;
  edd: string | null;
  notify_channel: 'kakao' | 'sms';
  share_token: string;
};

export type Goal = {
  id: string;
  member_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  month?: string; // monthly_goals만 해당
};

export type PainRecord = {
  id: string;
  member_id: string;
  recorded_at: string;
  month: string;
  body_parts: string[];
  nrs_score: number;
  memo: string | null;
  is_first: boolean;
};

export type PainChange = {
  id: string;
  diary_id: string;
  body_part: string;
  prev_nrs: number;
  curr_nrs: number;
};

export type Diary = {
  id: string;
  member_id: string;
  session_date: string;
  equipment: string[];
  purpose: string | null;
  content: string | null;
  compensation: string | null;
  improvement: string | null;
  homework: string | null;
  video_url: string | null;
  video_title: string | null;
  notify_at: string | null;
  notify_sent: boolean;
  notify_channel: 'kakao' | 'sms';
  pain_changes?: PainChange[];
};

export type Comment = {
  id: string;
  diary_id: string;
  member_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export const EQUIP = ['리포머', '캐딜락', '체어', '바렐', '스프링보드', '매트'];
export const BODY_PARTS = [
  '목', '어깨(좌)', '어깨(우)', '등(상부)', '등(하부)', '허리', '골반',
  '고관절(좌)', '고관절(우)', '무릎(좌)', '무릎(우)', '발목(좌)', '발목(우)',
  '손목(좌)', '손목(우)', '치골결합', '미골',
];

export function uid() {
  return 'x' + Math.random().toString(36).slice(2);
}

export function fmtD(d: string) {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

export function curM() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export function pregW(edd: string) {
  const lmp = new Date(new Date(edd).getTime() - 280 * 86400000);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  lmp.setHours(0, 0, 0, 0);
  const d = Math.floor((t.getTime() - lmp.getTime()) / 86400000);
  if (d < 0) return null;
  return { w: Math.floor(d / 7), d: d % 7, lbl: `임신 ${Math.floor(d / 7)}주 ${d % 7}일차` };
}

export function calcR(gs: Goal[]) {
  if (!gs || !gs.length) return 0;
  return Math.round((gs.filter((g) => g.is_done).length / gs.length) * 100);
}

export function rc(r: number) {
  if (r === 100) return '#3182F6';
  if (r >= 70) return '#10B981';
  if (r >= 40) return '#F59E0B';
  return '#FBBF24';
}

export function nc(s: number) {
  return s <= 3 ? '#22C55E' : s <= 6 ? '#F97316' : '#EF4444';
}

export function nl(s: number) {
  return s === 0 ? '통증 없음' : s <= 3 ? '경미' : s <= 6 ? '중등도' : '심한 통증';
}

/** 다음날 오전 10시(KST) ISO 문자열 */
export function nextDayAt10am() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}
