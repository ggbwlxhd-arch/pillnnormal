'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PainRecord, BODY_PARTS, nc, nl, fmtD, curM } from '@/lib/utils';

export default function PainTab({
  memberId, painRecs, onRefresh,
}: {
  memberId: string;
  painRecs: PainRecord[];
  onRefresh: () => void;
}) {
  const [parts, setParts] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [memo, setMemo] = useState('');
  const [viewMonth, setViewMonth] = useState(curM());
  const [saving, setSaving] = useState(false);

  const months = [...new Set(painRecs.map((p) => p.month))].sort().reverse();
  if (months.length === 0) months.push(curM());

  // 부위별 최신 기록
  const partMap: Record<string, PainRecord> = {};
  painRecs.forEach((p) => p.body_parts.forEach((pt) => { partMap[pt] = p; }));

  const togglePart = (p: string) =>
    setParts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  async function save() {
    if (!parts.length) { alert('통증 부위를 선택해주세요'); return; }
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('pain_records').insert({
      member_id: memberId, recorded_at: today, month: today.slice(0, 7),
      body_parts: parts, nrs_score: score, memo: memo || null, is_first: painRecs.length === 0,
    });
    setParts([]); setScore(0); setMemo('');
    setSaving(false);
    onRefresh();
  }

  const monthRecs = painRecs.filter((p) => p.month === viewMonth).slice().reverse();
  const color = nc(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 부위별 현황 */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>현재 통증 현황</p>
        {Object.keys(partMap).length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>통증 기록이 없습니다</p>}
        {Object.entries(partMap).map(([pt, rec]) => {
          const fpr = painRecs.find((r) => r.body_parts.includes(pt) && r.is_first) ?? painRecs.find((r) => r.body_parts.includes(pt));
          const fn = fpr?.nrs_score ?? rec.nrs_score;
          const diff = fn - rec.nrs_score;
          return (
            <div key={pt} style={{ background: '#F9FAFB', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: nc(rec.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                {rec.nrs_score}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pt}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : '#9CA3AF' }}>
                    {diff > 0 ? `첫방문 ${fn}점 → -${diff}↓` : diff < 0 ? `악화 +${Math.abs(diff)}↑` : '유지'}
                  </span>
                </div>
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 5 }}>
                  <div style={{ height: '100%', width: `${rec.nrs_score * 10}%`, background: nc(rec.nrs_score), borderRadius: 3, transition: 'width .6s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{nl(rec.nrs_score)}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(rec.recorded_at)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* 추이 그래프 */}
        {painRecs.length > 1 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.04em', margin: '14px 0 8px' }}>
              NRS 변화 추이 (최근 {Math.min(painRecs.length, 12)}회)
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
              {painRecs.slice(-12).map((r) => {
                const h = r.nrs_score === 0 ? 4 : Math.round((r.nrs_score / 10) * 48) + 4;
                return (
                  <div
                    key={r.id}
                    title={`${fmtD(r.recorded_at)}: NRS ${r.nrs_score}점`}
                    style={{ flex: 1, background: nc(r.nrs_score), height: h, borderRadius: '4px 4px 0 0', opacity: 0.85, cursor: 'help' }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(painRecs[Math.max(0, painRecs.length - 12)].recorded_at)}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>← 시간 흐름 →</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(painRecs[painRecs.length - 1].recorded_at)}</span>
            </div>
          </>
        )}
      </div>

      {/* 월별 기록 */}
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 15, fontWeight: 700 }}>월별 기록</p>
          <select value={viewMonth} onChange={(e) => setViewMonth(e.target.value)} style={{ padding: '7px 12px', fontSize: 12, borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#F9FAFB' }}>
            {months.map((m) => <option key={m} value={m}>{m.replace('-', '년 ')}월</option>)}
          </select>
        </div>
        <div style={{ padding: '0 20px' }}>
          {monthRecs.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>이 달의 기록이 없습니다</p>
          ) : monthRecs.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid #F9FAFB' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: nc(r.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {r.nrs_score}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{r.body_parts.join(', ')}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(r.recorded_at)}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#6B7280' }}>{nl(r.nrs_score)}</span>
                  {r.is_first && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FFFBEB', color: '#92400E' }}>🏥 첫방문</span>}
                </div>
                {r.memo && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>{r.memo}</p>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 4 }} />
      </div>

      {/* 새 기록 추가 */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>+ 통증 기록 추가</p>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 7, display: 'block' }}>통증 부위</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {BODY_PARTS.map((p) => (
            <button
              key={p}
              onClick={() => togglePart(p)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${parts.includes(p) ? '#3182F6' : '#E5E7EB'}`,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', background: parts.includes(p) ? '#3182F6' : '#fff',
                color: parts.includes(p) ? '#fff' : '#374151',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>통증 강도 (NRS)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color }}>{score}</span>
            <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color, color: '#fff' }}>{nl(score)}</span>
          </div>
        </div>
        <input
          type="range" min={0} max={10} value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 4, accentColor: color }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>0 없음</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>5 중등</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>10 극심</span>
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 7, display: 'block' }}>메모</label>
        <textarea
          value={memo} onChange={(e) => setMemo(e.target.value)}
          placeholder="임산부: 불편감 위치, 양상도 함께 기록해주세요"
          rows={2}
          style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', marginBottom: 14, boxSizing: 'border-box' }}
        />
        <button
          onClick={save} disabled={saving}
          style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '저장 중...' : '기록 저장'}
        </button>
      </div>
    </div>
  );
}
