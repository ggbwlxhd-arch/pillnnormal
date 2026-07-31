'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Goal, PainRecord, Diary, calcR, rc, nc, nl, fmtD, curM } from '@/lib/utils';
import EditMemberModal from '@/components/admin/EditMemberModal';

type Memo = { id: string; member_id: string; content: string; created_at: string };

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const memberId = params.id;
  const [member, setMember] = useState<Member | null>(null);
  const [longGoals, setLongGoals] = useState<Goal[]>([]);
  const [monthGoals, setMonthGoals] = useState<Goal[]>([]);
  const [painRecs, setPainRecs] = useState<PainRecord[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'diary' | 'pain' | 'memo'>('goals');
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, [memberId]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: m }, { data: lg }, { data: mg }, { data: pr }, { data: d }, { data: mem }] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).single(),
      supabase.from('long_term_goals').select('*').eq('member_id', memberId).order('sort_order'),
      supabase.from('monthly_goals').select('*').eq('member_id', memberId).eq('month', curM()).order('sort_order'),
      supabase.from('pain_records').select('*').eq('member_id', memberId).order('recorded_at'),
      supabase.from('diaries').select('*, diary_pain_changes(*)').eq('member_id', memberId).order('session_date', { ascending: false }),
      supabase.from('member_memos').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    ]);
    setMember(m);
    setLongGoals(lg ?? []);
    setMonthGoals(mg ?? []);
    setPainRecs(pr ?? []);
    setDiaries(d ?? []);
    setMemos(mem ?? []);
    setLoading(false);
  }

  if (loading || !member) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #3182F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pw = member.is_pregnant && member.edd ? (() => {
    const lmp = new Date(new Date(member.edd).getTime() - 280 * 864e5);
    const t = new Date(); t.setHours(0, 0, 0, 0); lmp.setHours(0, 0, 0, 0);
    const d = Math.floor((t.getTime() - lmp.getTime()) / 864e5);
    return d < 0 ? null : { w: Math.floor(d / 7), d: d % 7 };
  })() : null;

  const sortedPain = [...painRecs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const latestPain = sortedPain[sortedPain.length - 1];
  const firstPain = sortedPain.find(p => p.is_first) ?? sortedPain[0];
  const lr = calcR(longGoals); const mr = calcR(monthGoals);

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/admin" style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none', color: '#374151' }}>←</a>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{member.name} 회원</span>
            {member.is_pregnant && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FCE7F3', color: '#BE185D' }}>임산부</span>}
          </div>
          <button onClick={() => setShowEdit(true)} style={{ padding: '7px 14px', background: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>✏️ 수정</button>
        </div>
      </header>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px' }}>

        {/* 특이사항 배너 */}
        {memos.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#FFF7ED,#FFFBEB)', border: '1.5px solid #FCD34D', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>특이사항 {memos.length}건 — 수업 전 확인!</p>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6, marginLeft: 'auto' }}>관리자 전용</span>
            </div>
            {memos.map(memo => (
              <div key={memo.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 6, borderLeft: '3px solid #F59E0B' }}>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{memo.content}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{new Date(memo.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            ))}
          </div>
        )}

        {/* 임산부 긴급연락처 */}
        {member.is_pregnant && (member.birth_hospital || member.guardian_tel) && (
          <div style={{ background: 'linear-gradient(135deg,#FFF1F2,#FFF5F5)', border: '1.5px solid #FECDD3', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#BE123C', marginBottom: 10 }}>🚨 긴급 분만 대비 정보</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {member.birth_hospital && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ fontSize: 16 }}>🏥</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>분만병원</p>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{member.birth_hospital}</p>
                  </div>
                  {member.birth_hospital_tel && (
                    <a href={`tel:${member.birth_hospital_tel}`} style={{ padding: '6px 12px', background: '#EFF6FF', color: '#3182F6', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>📞 전화</a>
                  )}
                </div>
              )}
              {member.guardian_tel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ fontSize: 16 }}>👨‍👩‍👧</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>보호자 연락처</p>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{member.guardian_tel}</p>
                  </div>
                  <a href={`tel:${member.guardian_tel}`} style={{ padding: '6px 12px', background: '#FDF2F8', color: '#BE185D', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>📞 전화</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 프로필 카드 */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: latestPain ? 14 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: member.is_pregnant ? '#EC4899' : '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24 }}>{member.name[0]}</div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{member.name}</h2>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>{member.phone || '연락처 없음'}</p>
                {member.notes && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{member.notes}</p>}
              </div>
            </div>
            {pw && (
              <div style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: 16, padding: '10px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#9D174D', marginBottom: 2 }}>현재</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#BE185D' }}>{pw.w}주</p>
                <p style={{ fontSize: 11, color: '#EC4899' }}>{pw.d}일차</p>
              </div>
            )}
          </div>
          {latestPain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#F9FAFB', borderRadius: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: nc(latestPain.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>{latestPain.nrs_score}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{nl(latestPain.nrs_score)} · {latestPain.body_parts.join(', ')}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(latestPain.recorded_at)}</p>
              </div>
              {firstPain && latestPain.nrs_score < firstPain.nrs_score && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>첫방문 대비</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>-{firstPain.nrs_score - latestPain.nrs_score}↓</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 18, padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 16 }}>
          {(['goals', 'diary', 'pain', 'memo'] as const).map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: 10, fontSize: 12, fontWeight: 700, borderRadius: 14, border: 'none', background: activeTab === tab ? '#3182F6' : 'transparent', color: activeTab === tab ? '#fff' : '#6B7280', cursor: 'pointer', transition: 'all .2s' }}>
              {['목표', '운동일지', '통증관리', '특이사항'][i]}
            </button>
          ))}
        </div>

        {/* 목표 탭 */}
        {activeTab === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { title: '🎯 장기 목표', goals: longGoals, table: 'long_term_goals', rate: lr },
              { title: '📅 이달의 목표', goals: monthGoals, table: 'monthly_goals', rate: mr },
            ].map(({ title, goals, table, rate }) => {
              const [newG, setNewG] = useState('');
              return (
                <div key={table} style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>{title}</p>
                    <span style={{ fontSize: 22, fontWeight: 800, color: rc(rate) }}>{rate}%</span>
                  </div>
                  <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ height: '100%', width: `${rate}%`, background: rc(rate), borderRadius: 4, transition: 'width .8s' }} />
                  </div>
                  {goals.map(g => (
                    <div key={g.id} onClick={async () => { await supabase.from(table).update({ is_completed: !g.is_completed }).eq('id', g.id); fetchAll(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${g.is_completed ? '#3182F6' : '#D1D5DB'}`, background: g.is_completed ? '#3182F6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                        {g.is_completed && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: 14, color: g.is_completed ? '#9CA3AF' : '#374151', textDecoration: g.is_completed ? 'line-through' : 'none' }}>{g.content}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <input value={newG} onChange={e => setNewG(e.target.value)} placeholder="새 목표 추가" onKeyDown={async e => { if (e.key === 'Enter' && newG.trim()) { await supabase.from(table).insert({ member_id: memberId, content: newG.trim(), ...(table === 'monthly_goals' ? { month: curM() } : {}) }); setNewG(''); fetchAll(); } }} style={{ flex: 1, padding: '10px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none' }} />
                    <button onClick={async () => { if (newG.trim()) { await supabase.from(table).insert({ member_id: memberId, content: newG.trim(), ...(table === 'monthly_goals' ? { month: curM() } : {}) }); setNewG(''); fetchAll(); } }} style={{ padding: '10px 16px', background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer' }}>추가</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 일지 탭 */}
        {activeTab === 'diary' && (
          <DiarySection memberId={memberId} diaries={diaries} painRecs={painRecs} onRefresh={fetchAll} />
        )}

        {/* 통증 탭 */}
        {activeTab === 'pain' && (
          <PainSection memberId={memberId} painRecs={painRecs} onRefresh={fetchAll} />
        )}

        {/* 특이사항 탭 */}
        {activeTab === 'memo' && (
          <MemoSection memberId={memberId} memos={memos} onRefresh={fetchAll} />
        )}
      </div>

      {showEdit && <EditMemberModal member={member} onClose={() => setShowEdit(false)} onSaved={fetchAll} />}
    </div>
  );
}

function MemoSection({ memberId, memos, onRefresh }: { memberId: string; memos: any[]; onRefresh: () => void }) {
  const [newMemo, setNewMemo] = useState('');
  const [saving, setSaving] = useState(false);

  async function addMemo() {
    if (!newMemo.trim()) return;
    setSaving(true);
    await supabase.from('member_memos').insert({ member_id: memberId, content: newMemo.trim() });
    setNewMemo(''); setSaving(false); onRefresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#FFF7ED', border: '1.5px solid #FCD34D', borderRadius: 14, padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>⚠️ 관리자 전용</p>
        <p style={{ fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>특이사항은 회원 공유 페이지에 표시되지 않아요.</p>
      </div>
      {memos.map(memo => (
        <div key={memo.id} style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{memo.content}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>{new Date(memo.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
            <button onClick={async () => { if (confirm('삭제할까요?')) { await supabase.from('member_memos').delete().eq('id', memo.id); onRefresh(); } }} style={{ padding: '5px 10px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>삭제</button>
          </div>
        </div>
      ))}
      {memos.length === 0 && <div style={{ background: '#fff', borderRadius: 16, padding: 30, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>등록된 특이사항이 없습니다</p></div>}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>새 특이사항 추가</label>
        <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} rows={3} placeholder="예) 오른쪽 무릎 반월판 수술 이력. 깊은 굴곡 주의!" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
        <button onClick={addMemo} disabled={saving || !newMemo.trim()} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 14, border: 'none', cursor: 'pointer', opacity: saving || !newMemo.trim() ? 0.6 : 1 }}>
          {saving ? '추가 중...' : '특이사항 추가'}
        </button>
      </div>
    </div>
  );
}

function DiarySection({ memberId, diaries, painRecs, onRefresh }: any) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  useEffect(() => { supabase.from('comments').select('*').eq('member_id', memberId).order('created_at').then(({ data }) => setComments(data ?? [])); }, [memberId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <a href={`/admin/members/${memberId}/diary/new`} style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>+</div>
        <div><p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>운동 일지 작성</p><p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>AI 자동채우기 · 숙제사전 · 날짜설정</p></div>
      </a>
      {diaries.map((d: any) => {
        const dCmts = comments.filter((c: any) => c.diary_id === d.id);
        const isOpen = openId === d.id;
        return (
          <div key={d.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <button onClick={() => setOpenId(isOpen ? null : d.id)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtD(d.session_date)}</span>
                  {d.notify_at && !d.notify_sent && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#3182F6' }}>알림예약</span>}
                  {dCmts.length > 0 && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FFFBEB', color: '#92400E' }}>💬 {dCmts.length}</span>}
                  {d.homework && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F5F3FF', color: '#6D28D9' }}>📝숙제</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {d.equipment?.map((e: string) => <span key={e} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#6B7280' }}>{e}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#C4C9D4', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▼</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {d.content && <div><p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 5 }}>수업 내용</p><p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.content}</p></div>}
                {d.compensation && <div style={{ background: '#FFFBEB', borderLeft: '3px solid #F59E0B', borderRadius: '0 10px 10px 0', padding: '10px 14px' }}><p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>⚠️ 주의사항</p><p style={{ fontSize: 13, color: '#78350F' }}>{d.compensation}</p></div>}
                {d.improvement && <div style={{ background: '#F0FDF4', borderLeft: '3px solid #22C55E', borderRadius: '0 10px 10px 0', padding: '10px 14px' }}><p style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>🎉 잘한 점</p><p style={{ fontSize: 13, color: '#14532D' }}>{d.improvement}</p></div>}
                {d.homework && <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1px solid #BFDBFE', borderRadius: 14, padding: 14 }}><p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📝 숙제</p><p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{d.homework}</p></div>}
                {d.video_url && <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 14, padding: 14 }}><a href={d.video_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}><span style={{ fontSize: 20 }}>▶</span><p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{d.video_title || '영상 보기'}</p></a></div>}
                {dCmts.length > 0 && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>💬 회원 피드백</p>
                    {dCmts.map((c: any) => (
                      <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, color: '#374151' }}>{c.body}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PainSection({ memberId, painRecs, onRefresh }: any) {
  const sorted = [...painRecs].sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const partMap: Record<string, any[]> = {};
  sorted.forEach((p: any) => p.body_parts?.forEach((pt: string) => { (partMap[pt] ??= []).push(p); }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>현재 통증 현황 (부위별)</p>
        {Object.keys(partMap).length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>통증 기록이 없습니다</p>}
        {Object.entries(partMap).map(([pt, history]) => {
          const first = history[0]; const latest = history[history.length - 1];
          const diff = first.nrs_score - latest.nrs_score;
          return (
            <div key={pt} style={{ background: '#F9FAFB', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: nc(latest.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>{latest.nrs_score}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pt}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : '#9CA3AF' }}>
                    {diff > 0 ? `첫방문 ${first.nrs_score}점 → -${diff}↓` : diff < 0 ? `악화 +${Math.abs(diff)}↑` : '유지'}
                  </span>
                </div>
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${latest.nrs_score * 10}%`, background: nc(latest.nrs_score), borderRadius: 3 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
