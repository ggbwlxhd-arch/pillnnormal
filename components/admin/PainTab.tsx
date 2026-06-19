'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PainRecord, BODY_PARTS, nc, nl, fmtD, curM } from '@/lib/utils';

export default function PainTab({ memberId, painRecs, onRefresh }: {
  memberId: string; painRecs: PainRecord[]; onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingRec, setEditingRec] = useState<PainRecord | null>(null);
  const [viewMonth, setViewMonth] = useState(curM());

  const sorted = [...painRecs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const months = [...new Set(sorted.map((p) => p.month))].sort().reverse();
  if (months.length === 0) months.push(curM());

  // 🆕 부위별 전체 히스토리 추적
  const partMap: Record<string, PainRecord[]> = {};
  sorted.forEach((p) => p.body_parts.forEach((pt) => {
    (partMap[pt] ??= []).push(p);
  }));

  const monthRecs = sorted.filter((p) => p.month === viewMonth).slice().reverse();

  function openAdd() { setEditingRec(null); setShowModal(true); }
  function openEdit(rec: PainRecord) { setEditingRec(rec); setShowModal(true); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 🆕 부위별 현황 카드 */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>현재 통증 현황 <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>(부위별)</span></p>
        {Object.keys(partMap).length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>통증 기록이 없습니다</p>}
        {Object.entries(partMap).map(([pt, history]) => {
          const first = history[0];
          const latest = history[history.length - 1];
          const diff = first.nrs_score - latest.nrs_score;
          return (
            <div key={pt} style={{ background: '#F9FAFB', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: nc(latest.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                {latest.nrs_score}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pt}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : '#9CA3AF' }}>
                    {diff > 0 ? `첫방문 ${first.nrs_score}점 → -${diff}↓` : diff < 0 ? `악화 +${Math.abs(diff)}↑` : '유지'}
                  </span>
                </div>
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ height: '100%', width: `${latest.nrs_score * 10}%`, background: nc(latest.nrs_score), borderRadius: 3, transition: 'width .6s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{nl(latest.nrs_score)}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(latest.recorded_at)} 기준</span>
                </div>
                {/* 🆕 미니 스파크라인 */}
                {history.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24, marginTop: 8 }}>
                    {history.slice(-8).map((r, i, arr) => {
                      const h = r.nrs_score === 0 ? 3 : Math.round((r.nrs_score / 10) * 20) + 3;
                      return <div key={r.id} title={`${fmtD(r.recorded_at)}: ${r.nrs_score}점`} style={{ flex: 1, background: nc(r.nrs_score), height: h, borderRadius: '3px 3px 0 0', opacity: i === arr.length - 1 ? 1 : 0.55, cursor: 'help' }} />;
                    })}
                  </div>
                )}
              </div>
              {/* 🆕 수정 버튼 */}
              <button onClick={() => openEdit(latest)} style={{ padding: '6px 10px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}>✏️수정</button>
            </div>
          );
        })}

        {/* NRS 전체 추이 */}
        {sorted.length > 1 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>NRS 전체 추이</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
              {sorted.slice(-12).map((r) => {
                const h = r.nrs_score === 0 ? 4 : Math.round((r.nrs_score / 10) * 48) + 4;
                return <div key={r.id} title={`${fmtD(r.recorded_at)}: NRS ${r.nrs_score}점`} style={{ flex: 1, background: nc(r.nrs_score), height: h, borderRadius: '4px 4px 0 0', opacity: 0.85, cursor: 'help' }} />;
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(sorted[Math.max(0, sorted.length - 12)].recorded_at)}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>← 시간 흐름 →</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(sorted[sorted.length - 1].recorded_at)}</span>
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
          {monthRecs.length === 0
            ? <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>이 달의 기록이 없습니다</p>
            : monthRecs.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: nc(r.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{r.nrs_score}</div>
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
                {/* 🆕 수정 버튼 */}
                <button onClick={() => openEdit(r)} style={{ padding: '5px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
              </div>
            ))
          }
        </div>
        <div style={{ height: 4 }} />
      </div>

      {/* 추가 버튼 */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <button onClick={openAdd} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 16, border: 'none', cursor: 'pointer' }}>
          + 통증 기록 추가
        </button>
      </div>

      {showModal && (
        <PainModal
          memberId={memberId}
          editing={editingRec}
          isFirstRecord={painRecs.length === 0}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// 🆕 통증 추가/수정 통합 모달
function PainModal({ memberId, editing, isFirstRecord, onClose, onSaved }: {
  memberId: string; editing: PainRecord | null; isFirstRecord: boolean; onClose: () => void; onSaved: () => void;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [parts, setParts] = useState<string[]>(editing?.body_parts ?? []);
  const [score, setScore] = useState(editing?.nrs_score ?? 0);
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [date, setDate] = useState(editing?.recorded_at ?? todayStr);
  const [isFirst, setIsFirst] = useState(editing?.is_first ?? isFirstRecord);
  const [saving, setSaving] = useState(false);

  const togglePart = (p: string) => setParts((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const color = nc(score);
  const nlText = score === 0 ? '통증 없음' : score <= 3 ? '경미' : score <= 6 ? '중등도' : '심한 통증';

  async function save() {
    if (!parts.length) { alert('통증 부위를 선택해주세요'); return; }
    setSaving(true);
    const month = date.slice(0, 7);
    if (editing) {
      // 🆕 수정
      await supabase.from('pain_records').update({ body_parts: parts, nrs_score: score, memo: memo || null, recorded_at: date, month, is_first: isFirst }).eq('id', editing.id);
    } else {
      // 추가
      await supabase.from('pain_records').insert({ member_id: memberId, recorded_at: date, month, body_parts: parts, nrs_score: score, memo: memo || null, is_first: isFirst });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{editing ? '통증 기록 수정' : '통증 기록 추가'}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 🆕 날짜 선택 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
              📅 기록 날짜 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(첫 방문일 등 직접 설정 가능)</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 7, display: 'block' }}>통증 부위</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {BODY_PARTS.map((p) => (
                <button key={p} onClick={() => togglePart(p)} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${parts.includes(p) ? '#3182F6' : '#E5E7EB'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: parts.includes(p) ? '#3182F6' : '#fff', color: parts.includes(p) ? '#fff' : '#374151' }}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>통증 강도 (NRS)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color }}>{score}</span>
                <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color, color: '#fff' }}>{nlText}</span>
              </div>
            </div>
            <input type="range" min={0} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ width: '100%', accentColor: color, marginBottom: 4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>0 없음</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>5 중등</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>10 극심</span>
            </div>
          </div>

          {/* 🆕 첫방문 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 14, padding: '14px 16px' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>🏥 첫 방문 기록</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>첫 방문 시 초기 통증 수치로 표시됩니다</p>
            </div>
            <button onClick={() => setIsFirst(!isFirst)} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: isFirst ? '#3182F6' : '#D1D5DB', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 3, left: isFirst ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
            </button>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>메모</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="운동 후 변화, 특이사항 등" rows={2} style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          <button onClick={save} disabled={saving} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '저장 중...' : editing ? '수정 완료' : '기록 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
