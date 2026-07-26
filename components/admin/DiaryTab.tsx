'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Diary, PainRecord, Comment, EQUIP, BODY_PARTS, nc, fmtD, nextDayAt10am } from '@/lib/utils';

type PainRow = { id: string; part: string; prev: number; curr: number };
type HwDict = { id: string; keyword: string; description: string; video_url: string | null; video_title: string | null };

// ─────────────────────────────────────────
// 메인 탭
// ─────────────────────────────────────────
export default function DiaryTab({ memberId, diaries, painRecs, onRefresh }: {
  memberId: string; diaries: Diary[]; painRecs: PainRecord[]; onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [showDictModal, setShowDictModal] = useState(false);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => { fetchComments(); }, [memberId]);

  async function fetchComments() {
    const { data } = await supabase.from('comments').select('*').eq('member_id', memberId).order('created_at');
    setComments(data ?? []);
    if (data?.some((c: Comment) => !c.is_read)) {
      await supabase.from('comments').update({ is_read: true }).eq('member_id', memberId).eq('is_read', false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 버튼 줄 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setEditingDiary(null); setShowModal(true); }}
          style={{ flex: 1, background: '#fff', borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', textAlign: 'left', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>+</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700 }}>운동 일지 작성</p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>AI 자동 채우기 · 숙제 사전 자동 매칭</p>
          </div>
        </button>
        <button onClick={() => setShowDictModal(true)}
          style={{ padding: '0 14px', background: '#F5F3FF', color: '#6D28D9', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 16, cursor: 'pointer', flexShrink: 0 }}>
          📝 숙제사전
        </button>
      </div>

      {diaries.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>아직 작성된 일지가 없습니다</p>
        </div>
      )}

      {diaries.map((d) => {
        const dCmts = comments.filter((c) => c.diary_id === d.id);
        return (
          <DiaryCard key={d.id} diary={d} comments={dCmts}
            isOpen={openId === d.id}
            onToggle={() => setOpenId(openId === d.id ? null : d.id)}
            onEdit={() => { setEditingDiary(d); setShowModal(true); }} />
        );
      })}

      {showModal && (
        <DiaryModal memberId={memberId} painRecs={painRecs} editing={editingDiary}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefresh(); fetchComments(); }} />
      )}

      {showDictModal && <HwDictModal onClose={() => setShowDictModal(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────
// 일지 카드
// ─────────────────────────────────────────
function DiaryCard({ diary: d, comments, isOpen, onToggle, onEdit }: {
  diary: Diary; comments: Comment[]; isOpen: boolean; onToggle: () => void; onEdit: () => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtD(d.session_date)}</span>
            {d.notify_at && !d.notify_sent && <Tag bg="#EFF6FF" color="#3182F6">알림예약</Tag>}
            {d.pain_changes?.length > 0 && (() => {
              const cleared = d.pain_changes.filter(p => p.curr_nrs === 0 && p.prev_nrs > 0).length;
              const improved = d.pain_changes.filter(p => p.curr_nrs < p.prev_nrs && p.curr_nrs > 0).length;
              const worsened = d.pain_changes.filter(p => p.curr_nrs > p.prev_nrs).length;
              return (<>
                {cleared > 0 && <Tag bg="#F0FDF4" color="#16A34A">✨소멸 {cleared}</Tag>}
                {improved > 0 && <Tag bg="#EFF6FF" color="#3182F6">↓개선 {improved}</Tag>}
                {worsened > 0 && <Tag bg="#FEF2F2" color="#DC2626">↑악화 {worsened}</Tag>}
              </>);
            })()}
            {comments.length > 0 && <Tag bg="#FFFBEB" color="#92400E">💬 {comments.length}</Tag>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.equipment.map(e => <Tag key={e} bg="#F3F4F6" color="#6B7280">{e}</Tag>)}
            {d.homework && <Tag bg="#F5F3FF" color="#6D28D9">📝숙제</Tag>}
            {d.video_url && <Tag bg="#F0FDF4" color="#059669">🎬영상</Tag>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ padding: '5px 10px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#6B7280', cursor: 'pointer' }}>
            ✏️ 수정
          </button>
          <span style={{ color: '#C4C9D4', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▼</span>
        </div>
      </button>

      {isOpen && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {d.purpose && <InfoBlock label="운동 목적" value={d.purpose} />}
          {d.content && <InfoBlock label="수업 내용" value={d.content} />}
          {d.compensation && <AccentBlock label="⚠️ 주의사항" value={d.compensation} bg="#FFFBEB" border="#F59E0B" color="#78350F" labelColor="#92400E" />}
          {d.improvement && <AccentBlock label="🎉 잘한 점" value={d.improvement} bg="#F0FDF4" border="#22C55E" color="#14532D" labelColor="#166534" />}

          {d.pain_changes?.length > 0 && (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>📊 이번 수업 통증 변화</p>
              {d.pain_changes.map(p => {
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span>📝</span><p style={{ fontSize: 13, fontWeight: 700 }}>이번 주 숙제</p></div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.homework}</p>
            </div>
          )}
          {d.video_url && (
            <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span>🎬</span><p style={{ fontSize: 13, fontWeight: 700 }}>참고 영상</p></div>
              <a href={d.video_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, textDecoration: 'none', border: '1px solid #A7F3D0' }}>
                <span style={{ fontSize: 20 }}>▶</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{d.video_title || '영상 보기'}</p>
              </a>
            </div>
          )}
          {comments.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 10 }}>💬 회원 피드백</p>
              {comments.map(c => (
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

// ─────────────────────────────────────────
// 일지 작성/수정 모달 (AI 포함)
// ─────────────────────────────────────────
function DiaryModal({ memberId, painRecs, editing, onClose, onSaved }: {
  memberId: string; painRecs: PainRecord[]; editing: Diary | null; onClose: () => void; onSaved: () => void;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [sessionDate, setSessionDate] = useState(editing?.session_date ?? todayStr);
  const [equip, setEquip] = useState<string[]>(editing?.equipment ?? []);
  const [purpose, setPurpose] = useState(editing?.purpose ?? '');
  const [content, setContent] = useState(editing?.content ?? '');
  const [comp, setComp] = useState(editing?.compensation ?? '');
  const [improv, setImprov] = useState(editing?.improvement ?? '');
  const [homework, setHomework] = useState(editing?.homework ?? '');
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? '');
  const [videoTitle, setVideoTitle] = useState(editing?.video_title ?? '');
  const [saving, setSaving] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMatchedKw, setAiMatchedKw] = useState<string[]>([]);

  const latest = painRecs[painRecs.length - 1];
  const [painRows, setPainRows] = useState<PainRow[]>(() => {
    if (editing?.pain_changes?.length) {
      return editing.pain_changes.map(p => ({ id: 'r' + Math.random(), part: p.body_part, prev: p.prev_nrs, curr: p.curr_nrs }));
    }
    if (latest) return latest.body_parts.map(pt => ({ id: 'r' + Math.random(), part: pt, prev: latest.nrs_score, curr: latest.nrs_score }));
    return [{ id: 'r' + Math.random(), part: '', prev: 0, curr: 0 }];
  });

  const toggleEquip = (e: string) => setEquip(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  const addRow = () => setPainRows(prev => [...prev, { id: 'r' + Math.random(), part: '', prev: 0, curr: 0 }]);
  const removeRow = (id: string) => setPainRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id: string, patch: Partial<PainRow>) => setPainRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  // AI 자동 채우기
  async function runAI() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/parse-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json();
      if (data.error) { alert('AI 오류: ' + data.error); return; }

      if (data.equipment?.length) setEquip(data.equipment);
      if (data.purpose) setPurpose(data.purpose);
      if (data.content) setContent(data.content);
      if (data.compensation) setComp(data.compensation);
      if (data.improvement) setImprov(data.improvement);
      if (data.homework) setHomework(data.homework);
      if (data.video_url) setVideoUrl(data.video_url);
      if (data.video_title) setVideoTitle(data.video_title);
      if (data.matched_keywords?.length) setAiMatchedKw(data.matched_keywords);

      if (data.pain_changes?.length) {
        setPainRows(data.pain_changes.map((p: any) => ({ id: 'r' + Math.random(), part: p.body_part, prev: p.prev_nrs, curr: p.curr_nrs })));
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function save(withNotify: boolean) {
    if (!content.trim()) { alert('수업 내용을 입력해주세요'); return; }
    setSaving(true);
    const diaryData = {
      session_date: sessionDate, equipment: equip,
      purpose: purpose.trim() || null, content: content.trim(),
      compensation: comp.trim() || null, improvement: improv.trim() || null,
      homework: homework.trim() || null,
      video_url: videoUrl.trim() || null, video_title: videoTitle.trim() || null,
      notify_at: withNotify ? nextDayAt10am() : null, notify_sent: false,
    };

    let diaryId: string;
    if (editing) {
      await supabase.from('diaries').update(diaryData).eq('id', editing.id);
      diaryId = editing.id;
      await supabase.from('diary_pain_changes').delete().eq('diary_id', editing.id);
    } else {
      const { data: diary, error } = await supabase.from('diaries').insert({ member_id: memberId, ...diaryData }).select().single();
      if (error || !diary) { alert('저장 실패: ' + error?.message); setSaving(false); return; }
      diaryId = diary.id;
    }

    const validRows = painRows.filter(r => r.part);
    if (validRows.length > 0) {
      await supabase.from('diary_pain_changes').insert(validRows.map(r => ({ diary_id: diaryId, body_part: r.part, prev_nrs: r.prev, curr_nrs: r.curr })));
    }

    setSaving(false);
    if (withNotify && !editing) setTimeout(() => alert('✅ 내일 오전 10시에 회원에게 알림이 발송됩니다.'), 100);
    onSaved();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{editing ? '✏️ 일지 수정' : '운동 일지 작성'}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* AI 입력 */}
          <div style={{ background: 'linear-gradient(135deg,#F5F3FF,#EFF6FF)', border: `1.5px solid ${aiLoading ? '#7C3AED' : '#DDD6FE'}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#5B21B6' }}>AI 한번에 입력</p>
              <span style={{ background: '#7C3AED', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>NEW</span>
            </div>
            <p style={{ fontSize: 12, color: '#6D28D9', marginBottom: 10, lineHeight: 1.6 }}>수업 내용을 자유롭게 적으면 AI가 자동으로 채워줘요!</p>
            <textarea
              value={aiText} onChange={e => setAiText(e.target.value)}
              rows={3} placeholder="예) 리포머로 고관절가동성 향상, 오른쪽 엉덩이 약함, 골반 틀어짐, 숙제 소머리자세"
              style={{ width: '100%', padding: '12px 14px', background: '#fff', border: '1.5px solid #DDD6FE', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
            {aiMatchedKw.length > 0 && (
              <p style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700, marginTop: 6 }}>
                ✅ 숙제 사전 매칭: {aiMatchedKw.map(k => `"${k}"`).join(', ')}
              </p>
            )}
            <button onClick={runAI} disabled={!aiText.trim() || aiLoading}
              style={{ width: '100%', marginTop: 10, padding: 12, background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', opacity: !aiText.trim() || aiLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {aiLoading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'inline-block' }} /><span>AI가 분석 중...</span></> : <><span>⬇️</span><span>아래 항목에 자동으로 채우기</span></>}
            </button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>

          {/* 날짜 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>📅 수업 날짜</label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* 기구 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>운동 기구</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {EQUIP.map(e => (
                <button key={e} onClick={() => toggleEquip(e)} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${equip.includes(e) ? '#3182F6' : '#E5E7EB'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: equip.includes(e) ? '#3182F6' : '#fff', color: equip.includes(e) ? '#fff' : '#374151' }}>{e}</button>
              ))}
            </div>
          </div>

          {/* 텍스트 필드 */}
          {([['운동 목적', purpose, setPurpose, '예) 고관절 가동성 향상', false],
            ['수업 내용 *', content, setContent, '오늘 진행한 운동 내용', true, 4],
            ['보상작용 / 주의점', comp, setComp, '관찰된 보상작용', true],
            ['잘한 점 🎉', improv, setImprov, '오늘 잘한 점', true]] as any[]).map(([label, val, setter, ph, isTA, rows]) => (
            <div key={label}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>{label}</label>
              {isTA
                ? <textarea value={val} onChange={(e: any) => setter(e.target.value)} placeholder={ph} rows={rows ?? 2} style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' as any }} />
                : <input value={val} onChange={(e: any) => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' as any }} />}
            </div>
          ))}

          {/* 통증 변화 */}
          <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>📊 통증 변화</p>
              <button onClick={addRow} style={{ padding: '5px 12px', background: '#EFF6FF', color: '#3182F6', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}>+ 부위 추가</button>
            </div>
            {painRows.map(row => <PainRowEditor key={row.id} row={row} onChange={patch => updateRow(row.id, patch)} onRemove={() => removeRow(row.id)} />)}
          </div>

          {/* 숙제 */}
          <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1px solid #BFDBFE', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span>📝</span>
              <p style={{ fontSize: 13, fontWeight: 700 }}>숙제 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(숙제 사전에서 자동 매칭)</span></p>
            </div>
            <textarea value={homework} onChange={e => setHomework(e.target.value)} rows={2} placeholder="AI가 자동으로 채워줘요" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* 영상 */}
          <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span>🎬</span>
              <p style={{ fontSize: 13, fontWeight: 700 }}>참고 영상 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(숙제 사전에서 자동 연결)</span></p>
            </div>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="AI가 자동으로 채워줘요" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="영상 제목" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', marginTop: 8, boxSizing: 'border-box' }} />
          </div>

          {/* 버튼 */}
          {editing ? (
            <button onClick={() => save(false)} disabled={saving} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '저장 중...' : '✅ 수정 완료'}
            </button>
          ) : (
            <>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '12px 16px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>🔔 발송 예약</p>
                <p style={{ fontSize: 12, color: '#3B82F6', marginTop: 3 }}>내일 오전 10시에 회원에게 일지 링크가 전송됩니다</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => save(false)} disabled={saving} style={{ flex: 1, padding: 14, background: '#F3F4F6', color: '#374151', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>저장</button>
                <button onClick={() => save(true)} disabled={saving} style={{ flex: 1, padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>📅 발송 예약</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 숙제 사전 모달
// ─────────────────────────────────────────
function HwDictModal({ onClose }: { onClose: () => void }) {
  const [dict, setDict] = useState<HwDict[]>([]);
  const [kw, setKw] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDict(); }, []);

  async function fetchDict() {
    const { data } = await supabase.from('homework_dict').select('*').order('created_at', { ascending: false });
    setDict(data ?? []);
  }

  async function addItem() {
    if (!kw.trim() || !desc.trim()) { alert('키워드와 설명을 입력해주세요'); return; }
    setSaving(true);
    await supabase.from('homework_dict').upsert({ keyword: kw.trim(), description: desc.trim(), video_url: url.trim() || null, video_title: title.trim() || null });
    setKw(''); setDesc(''); setUrl(''); setTitle('');
    await fetchDict();
    setSaving(false);
  }

  async function deleteItem(id: string) {
    if (!confirm('삭제할까요?')) return;
    await supabase.from('homework_dict').delete().eq('id', id);
    await fetchDict();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>📝 숙제 사전 관리</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>💡 키워드를 등록해두면 AI가 일지 작성 시 자동으로 감지해 숙제와 영상을 채워줘요!</p>
          </div>

          {/* 기존 목록 */}
          {dict.map(h => (
            <div key={h.id} style={{ background: '#F9FAFB', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 6 }}>🔑 {h.keyword}</p>
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: h.video_url ? 8 : 0, lineHeight: 1.6 }}>📝 {h.description}</p>
                  {h.video_url && (
                    <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '6px 10px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>🎬 {h.video_title || '영상 있음'}</p>
                    </div>
                  )}
                </div>
                <button onClick={() => deleteItem(h.id)} style={{ padding: '5px 10px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>삭제</button>
              </div>
            </div>
          ))}
          {dict.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>등록된 숙제가 없어요</p>}

          {/* 새 추가 폼 */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>+ 새 숙제 등록</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>🔑 키워드</label><input value={kw} onChange={e => setKw(e.target.value)} placeholder="예) 소머리자세" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>📝 숙제 설명 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(반말 끝맺음)</span></label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="예) 소머리자세로 상체 숙여서 엉덩이 스트레치 좌우 30초씩" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>🎬 영상 URL <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(선택)</span></label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/..." style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>영상 제목 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(선택)</span></label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="예) 소머리자세 영상" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} /></div>
              <button onClick={addItem} disabled={saving} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '저장 중...' : '숙제 사전에 추가하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 공통 컴포넌트
// ─────────────────────────────────────────
function Tag({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{children}</span>;
}
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (<div><p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 5 }}>{label}</p><p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</p></div>);
}
function AccentBlock({ label, value, bg, border, color, labelColor }: { label: string; value: string; bg: string; border: string; color: string; labelColor: string }) {
  return (<div style={{ background: bg, borderLeft: `3px solid ${border}`, borderRadius: '0 10px 10px 0', padding: '10px 14px' }}><p style={{ fontSize: 12, fontWeight: 700, color: labelColor, marginBottom: 4 }}>{label}</p><p style={{ fontSize: 13, color, lineHeight: 1.6 }}>{value}</p></div>);
}
function PainRowEditor({ row, onChange, onRemove }: { row: PainRow; onChange: (p: Partial<PainRow>) => void; onRemove: () => void }) {
  const prevColor = nc(row.prev); const currColor = nc(row.curr);
  const diff = row.prev - row.curr;
  let diffText = '→ 변화 없음', diffColor = '#9CA3AF';
  if (row.curr === 0 && row.prev > 0) { diffText = '✨ 통증 소멸!'; diffColor = '#10B981'; }
  else if (diff > 0) { diffText = `↓ ${diff}점 개선`; diffColor = '#3182F6'; }
  else if (diff < 0) { diffText = `↑ ${Math.abs(diff)}점 악화`; diffColor = '#EF4444'; }
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid #F3F4F6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <select value={row.part} onChange={e => onChange({ part: e.target.value })} style={{ flex: 1, padding: '8px 12px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13 }}>
          <option value="">통증 부위 선택</option>
          {BODY_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={onRemove} style={{ padding: '6px 11px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
      </div>
      {([['이전 NRS', row.prev, prevColor, (v: number) => onChange({ prev: v })],
        ['현재 NRS', row.curr, currColor, (v: number) => onChange({ curr: v })]] as any[]).map(([label, val, color, setter]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{label}</span><span style={{ fontSize: 13, fontWeight: 800, color }}>{val}</span></div>
          <input type="range" min={0} max={10} value={val} onChange={e => setter(Number(e.target.value))} style={{ width: '100%', accentColor: color }} />
        </div>
      ))}
      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: diffColor }}>{diffText}</div>
    </div>
  );
}
