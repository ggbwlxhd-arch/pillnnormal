'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Diary, PainRecord, Comment, EQUIP, BODY_PARTS, nc, nl, fmtD, nextDayAt10am } from '@/lib/utils';

type PainRow = { id: string; part: string; prev: number; curr: number };

export default function DiaryTab({
  memberId, diaries, painRecs, onRefresh,
}: {
  memberId: string;
  diaries: Diary[];
  painRecs: PainRecord[];
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetchComments();
  }, [memberId]);

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at');
    setComments(data ?? []);

    // 읽지 않은 댓글 모두 읽음 처리
    if (data && data.some((c: Comment) => !c.is_read)) {
      await supabase.from('comments').update({ is_read: true }).eq('member_id', memberId).eq('is_read', false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={() => setShowModal(true)}
        style={{
          background: '#fff', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
          border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>+</div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700 }}>오늘의 운동 일지 작성</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>숙제 · 영상 링크 · 통증 변화 체크</p>
        </div>
      </button>

      {diaries.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>아직 작성된 일지가 없습니다</p>
        </div>
      )}

      {diaries.map((d) => {
        const dCmts = comments.filter((c) => c.diary_id === d.id);
        return (
          <DiaryCard
            key={d.id}
            diary={d}
            comments={dCmts}
            isOpen={openId === d.id}
            onToggle={() => setOpenId(openId === d.id ? null : d.id)}
          />
        );
      })}

      {showModal && (
        <DiaryModal
          memberId={memberId}
          painRecs={painRecs}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefresh(); fetchComments(); }}
        />
      )}
    </div>
  );
}

function DiaryCard({ diary: d, comments, isOpen, onToggle }: { diary: Diary; comments: Comment[]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtD(d.session_date)}</span>
            {d.notify_at && !d.notify_sent && <Tag bg="#EFF6FF" color="#3182F6">알림예약</Tag>}
            {d.pain_changes && d.pain_changes.length > 0 && (() => {
              const cleared = d.pain_changes.filter((p) => p.curr_nrs === 0 && p.prev_nrs > 0).length;
              const improved = d.pain_changes.filter((p) => p.curr_nrs < p.prev_nrs && p.curr_nrs > 0).length;
              const worsened = d.pain_changes.filter((p) => p.curr_nrs > p.prev_nrs).length;
              return (
                <>
                  {cleared > 0 && <Tag bg="#F0FDF4" color="#16A34A">✨소멸 {cleared}</Tag>}
                  {improved > 0 && <Tag bg="#EFF6FF" color="#3182F6">↓개선 {improved}</Tag>}
                  {worsened > 0 && <Tag bg="#FEF2F2" color="#DC2626">↑악화 {worsened}</Tag>}
                </>
              );
            })()}
            {comments.length > 0 && <Tag bg="#FFFBEB" color="#92400E">💬 피드백 {comments.length}개</Tag>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.equipment.map((e) => <Tag key={e} bg="#F3F4F6" color="#6B7280">{e}</Tag>)}
            {d.homework && <Tag bg="#F5F3FF" color="#6D28D9">📝숙제</Tag>}
            {d.video_url && <Tag bg="#F0FDF4" color="#059669">🎬영상</Tag>}
          </div>
        </div>
        <span style={{ color: '#C4C9D4', fontSize: 12, transition: 'transform .2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {d.purpose && <InfoBlock label="운동 목적" value={d.purpose} />}
          {d.content && <InfoBlock label="수업 내용" value={d.content} />}
          {d.compensation && <AccentBlock label="⚠️ 주의사항" value={d.compensation} bg="#FFFBEB" border="#F59E0B" color="#78350F" labelColor="#92400E" />}
          {d.improvement && <AccentBlock label="🎉 잘한 점" value={d.improvement} bg="#F0FDF4" border="#22C55E" color="#14532D" labelColor="#166534" />}

          {d.pain_changes && d.pain_changes.length > 0 && (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>📊 이번 수업 통증 변화</p>
              {d.pain_changes.map((p) => {
                const diff = p.prev_nrs - p.curr_nrs;
                const cleared = p.curr_nrs === 0 && p.prev_nrs > 0;
                const worse = p.curr_nrs > p.prev_nrs;
                let badge = '개선 ↓', bc = '#3182F6';
                if (cleared) { badge = '소멸 ✨'; bc = '#10B981'; }
                else if (worse) { badge = '악화 ↑'; bc = '#EF4444'; }
                else if (diff === 0) { badge = '유지 →'; bc = '#9CA3AF'; }
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.body_part}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: nc(p.prev_nrs) }}>{p.prev_nrs}</span>
                    <span style={{ color: '#D1D5DB', fontSize: 11 }}>→</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: nc(p.curr_nrs) }}>{p.curr_nrs}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: bc, background: `${bc}18`, padding: '3px 9px', borderRadius: 20 }}>{badge}</span>
                  </div>
                );
              })}
            </div>
          )}

          {d.homework && (
            <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1px solid #BFDBFE', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>📝</span>
                <p style={{ fontSize: 13, fontWeight: 700 }}>이번 주 숙제</p>
              </div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.homework}</p>
            </div>
          )}

          {d.video_url && (
            <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🎬</span>
                <p style={{ fontSize: 13, fontWeight: 700 }}>참고 영상</p>
              </div>
              <a href={d.video_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, textDecoration: 'none', border: '1px solid #A7F3D0' }}>
                <span style={{ fontSize: 20 }}>▶</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{d.video_title || '영상 보기'}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{d.video_url.length > 40 ? d.video_url.slice(0, 40) + '...' : d.video_url}</p>
                </div>
              </a>
            </div>
          )}

          {/* 회원 피드백 표시 */}
          {comments.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 10 }}>💬 회원 피드백</p>
              {comments.map((c) => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{c.body}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tag({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{children}</span>;
}
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  );
}
function AccentBlock({ label, value, bg, border, color, labelColor }: { label: string; value: string; bg: string; border: string; color: string; labelColor: string }) {
  return (
    <div style={{ background: bg, borderLeft: `3px solid ${border}`, borderRadius: '0 10px 10px 0', padding: '10px 14px' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, color, lineHeight: 1.6 }}>{value}</p>
    </div>
  );
}

function DiaryModal({ memberId, painRecs, onClose, onSaved }: { memberId: string; painRecs: PainRecord[]; onClose: () => void; onSaved: () => void }) {
  const [equip, setEquip] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [content, setContent] = useState('');
  const [comp, setComp] = useState('');
  const [improv, setImprov] = useState('');
  const [homework, setHomework] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const latest = painRecs[painRecs.length - 1];
  const [painRows, setPainRows] = useState<PainRow[]>(() => {
    if (latest) return latest.body_parts.map((pt) => ({ id: 'r' + Math.random(), part: pt, prev: latest.nrs_score, curr: latest.nrs_score }));
    return [{ id: 'r' + Math.random(), part: '', prev: 0, curr: 0 }];
  });

  const toggleEquip = (e: string) => setEquip((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  const addRow = () => setPainRows((prev) => [...prev, { id: 'r' + Math.random(), part: '', prev: 0, curr: 0 }]);
  const removeRow = (id: string) => setPainRows((prev) => prev.filter((r) => r.id !== id));
  const updateRow = (id: string, patch: Partial<PainRow>) => setPainRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function save(withNotify: boolean) {
    if (!content.trim()) { alert('수업 내용을 입력해주세요'); return; }
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: diary, error } = await supabase.from('diaries').insert({
      member_id: memberId, session_date: today, equipment: equip,
      purpose: purpose.trim() || null, content: content.trim(),
      compensation: comp.trim() || null, improvement: improv.trim() || null,
      homework: homework.trim() || null,
      video_url: videoUrl.trim() || null, video_title: videoTitle.trim() || null,
      notify_at: withNotify ? nextDayAt10am() : null, notify_sent: false,
    }).select().single();

    if (error || !diary) { alert('저장 실패: ' + error?.message); setSaving(false); return; }

    const validRows = painRows.filter((r) => r.part);
    if (validRows.length > 0) {
      await supabase.from('diary_pain_changes').insert(
        validRows.map((r) => ({ diary_id: diary.id, body_part: r.part, prev_nrs: r.prev, curr_nrs: r.curr }))
      );
      const changed = validRows.filter((r) => r.curr !== r.prev);
      if (changed.length > 0) {
        await supabase.from('pain_records').insert(
          changed.map((r) => ({ member_id: memberId, recorded_at: today, month: today.slice(0, 7), body_parts: [r.part], nrs_score: r.curr, memo: null, is_first: false }))
        );
      }
    }

    setSaving(false);
    if (withNotify) setTimeout(() => alert('✅ 저장 완료! 내일 오전 10시에 회원에게 알림이 발송됩니다.'), 100);
    onSaved();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>운동 일지 작성</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="운동 기구">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {EQUIP.map((e) => (
                <button key={e} onClick={() => toggleEquip(e)} style={chipStyle(equip.includes(e))}>{e}</button>
              ))}
            </div>
          </Field>
          <Field label="운동 목적">
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="예) 코어 강화, 고관절 가동성 향상" style={inputStyle} />
          </Field>
          <Field label="수업 내용 *">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="오늘 진행한 운동 내용을 기록해주세요" style={{ ...inputStyle, resize: 'none' }} />
          </Field>
          <Field label="보상작용 / 주의점">
            <textarea value={comp} onChange={(e) => setComp(e.target.value)} rows={2} placeholder="관찰된 보상작용이나 주의사항" style={{ ...inputStyle, resize: 'none' }} />
          </Field>
          <Field label="잘한 점 / 개선된 부분 🎉">
            <textarea value={improv} onChange={(e) => setImprov(e.target.value)} rows={2} placeholder="오늘 잘한 점" style={{ ...inputStyle, resize: 'none' }} />
          </Field>

          <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>📊 통증 변화</p>
              <button onClick={addRow} style={{ padding: '5px 12px', background: '#EFF6FF', color: '#3182F6', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}>+ 부위 추가</button>
            </div>
            {painRows.map((row) => (
              <PainRowEditor key={row.id} row={row} onChange={(patch) => updateRow(row.id, patch)} onRemove={() => removeRow(row.id)} />
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1px solid #BFDBFE', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>📝</span>
              <p style={{ fontSize: 13, fontWeight: 700 }}>숙제 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(선택)</span></p>
            </div>
            <textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={2} placeholder="예) 매일 아침 복횡근 활성화 10회" style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>🎬</span>
              <p style={{ fontSize: 13, fontWeight: 700 }}>영상 링크 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(선택)</span></p>
            </div>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." style={inputStyle} />
            <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="영상 제목" style={{ ...inputStyle, marginTop: 8 }} />
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '12px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>🔔 발송 예약</p>
            <p style={{ fontSize: 12, color: '#3B82F6', marginTop: 3 }}>내일 오전 10시에 회원에게 일지 링크가 전송됩니다</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => save(false)} disabled={saving} style={{ flex: 1, padding: 14, background: '#F3F4F6', color: '#374151', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>저장</button>
            <button onClick={() => save(true)} disabled={saving} style={{ flex: 1, padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>📅 발송 예약</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PainRowEditor({ row, onChange, onRemove }: { row: PainRow; onChange: (p: Partial<PainRow>) => void; onRemove: () => void }) {
  const prevColor = nc(row.prev);
  const currColor = nc(row.curr);
  const diff = row.prev - row.curr;
  let diffText = '→ 변화 없음', diffColor = '#9CA3AF';
  if (row.curr === 0 && row.prev > 0) { diffText = '✨ 통증 소멸!'; diffColor = '#10B981'; }
  else if (diff > 0) { diffText = `↓ ${diff}점 개선`; diffColor = '#3182F6'; }
  else if (diff < 0) { diffText = `↑ ${Math.abs(diff)}점 악화`; diffColor = '#EF4444'; }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid #F3F4F6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <select value={row.part} onChange={(e) => onChange({ part: e.target.value })} style={{ flex: 1, padding: '8px 12px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13 }}>
          <option value="">통증 부위 선택</option>
          {BODY_PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={onRemove} style={{ padding: '6px 11px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>이전 NRS</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: prevColor }}>{row.prev}</span>
      </div>
      <input type="range" min={0} max={10} value={row.prev} onChange={(e) => onChange({ prev: Number(e.target.value) })} style={{ width: '100%', marginBottom: 12, accentColor: prevColor }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>현재 NRS</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: currColor }}>{row.curr}</span>
      </div>
      <input type="range" min={0} max={10} value={row.curr} onChange={(e) => onChange({ curr: Number(e.target.value) })} style={{ width: '100%', accentColor: currColor }} />
      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, fontWeight: 700, color: diffColor }}>{diffText}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${active ? '#3182F6' : '#E5E7EB'}`,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? '#3182F6' : '#fff', color: active ? '#fff' : '#374151',
  };
}
