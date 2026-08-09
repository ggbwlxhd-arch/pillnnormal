'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Member, Goal, PainRecord, Diary, Comment, nc, fmtD, curM, calcR, rc, pregW } from '@/lib/utils';

interface Notice {
  id: string;
  title: string;
  content: string | null;
  bg_color: string;
  text_color: string;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [openNotice, setOpenNotice] = useState<Notice | null>(null);
  const [longGoals, setLongGoals] = useState<Goal[]>([]);
  const [monthGoals, setMonthGoals] = useState<Goal[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [painRecs, setPainRecs] = useState<PainRecord[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const lastSent = useRef<number>(0);

  const loadAll = useCallback(async () => {
    const { data: m } = await supabase.from('members').select('*').eq('share_token', token).single();
    if (!m) { setNotFound(true); return; }
    setMember(m);

    // ===== v6: 공지 배너 (전체 공지 + 이 회원 대상 공지) =====
    const { data: n } = await supabase
      .from('notices')
      .select('id, title, content, bg_color, text_color')
      .eq('is_active', true)
      .or(`member_id.is.null,member_id.eq.${m.id}`)
      .order('created_at', { ascending: false });
    setNotices(n ?? []);

    const [lg, mg, d, p, c] = await Promise.all([
      supabase.from('long_term_goals').select('*').eq('member_id', m.id).order('sort_order'),
      supabase.from('monthly_goals').select('*').eq('member_id', m.id).eq('month', curM()).order('sort_order'),
      supabase.from('diaries').select('*, pain_changes:diary_pain_changes(*)').eq('member_id', m.id).order('session_date', { ascending: false }),
      supabase.from('pain_records').select('*').eq('member_id', m.id).order('recorded_at'),
      supabase.from('comments').select('*').eq('member_id', m.id).order('created_at'),
    ]);
    setLongGoals(lg.data ?? []);
    setMonthGoals(mg.data ?? []);
    setDiaries(d.data ?? []);
    setPainRecs(p.data ?? []);
    setComments(c.data ?? []);
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sendComment = async (diaryId: string) => {
    const text = (commentInput[diaryId] || '').trim();
    if (!text || !member) return;
    // 3초 중복 방지
    if (Date.now() - lastSent.current < 3000) return;
    lastSent.current = Date.now();
    setSending(diaryId);
    const { error } = await supabase.from('comments').insert({
      member_id: member.id,
      diary_id: diaryId,
      body: text,
      is_read: false,
    });
    setSending(null);
    if (error) { alert('전송 실패: ' + error.message); return; }
    setCommentInput((prev) => ({ ...prev, [diaryId]: '' }));
    loadAll();
  };

  if (notFound) return <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>페이지를 찾을 수 없습니다</div>;
  if (!member) return <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>불러오는 중...</div>;

  const pw = member.is_pregnant && member.edd ? pregW(member.edd) : null;
  const sub = (text: string) => text.replace(/이름님/g, `${member.name}님`);
  const lr = calcR(longGoals);
  const mr = calcR(monthGoals);
  const latestByPart: Record<string, PainRecord> = {};
  painRecs.forEach((p) => p.body_parts.forEach((pt) => { latestByPart[pt] = p; }));

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '14px 16px 60px', background: '#F2F4F6', minHeight: '100vh' }}>

      {/* ===== v6: 공지 배너 ===== */}
      {notices.map((n) => (
        <button
          key={n.id}
          onClick={() => setOpenNotice(n)}
          style={{ display: 'block', width: '100%', border: 'none', borderRadius: 16, padding: '13px 16px', fontSize: 13, fontWeight: 700, textAlign: 'left', cursor: 'pointer', marginBottom: 8, background: n.bg_color, color: n.text_color, boxShadow: '0 1px 3px rgba(0,0,0,.06)', lineHeight: 1.5 }}>
          📢 {sub(n.title)}
        </button>
      ))}

      {/* 공지 팝업 */}
      {openNotice && (
        <div onClick={() => setOpenNotice(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20, backdropFilter: 'blur(2px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            <div style={{ padding: '15px 18px', fontSize: 14, fontWeight: 700, background: openNotice.bg_color, color: openNotice.text_color, lineHeight: 1.5 }}>
              📢 {sub(openNotice.title)}
            </div>
            <div style={{ padding: 18, fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#374151' }}>
              {openNotice.content ? sub(openNotice.content) : '자세한 내용은 센터로 문의해주세요.'}
            </div>
            <button onClick={() => setOpenNotice(null)} style={{ display: 'block', width: '100%', border: 'none', borderTop: '1px solid #F3F4F6', background: '#fff', padding: 14, fontSize: 14, fontWeight: 700, color: '#3182F6', cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 14px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{member.name}님의 운동 기록</h1>
        {member.is_pregnant && pw && (
          <span style={{ fontSize: 12, background: '#FCE7F3', color: '#BE185D', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>🤰 {pw.lbl}</span>
        )}
      </div>

      {/* 목표 달성률 */}
      {(longGoals.length > 0 || monthGoals.length > 0) && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎯 목표</p>
          {([['장기 목표', longGoals, lr], ['이달의 목표', monthGoals, mr]] as const).map(([label, goals, rate]) => goals.length > 0 && (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: rc(rate) }}>{rate}%</span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${rate}%`, background: rc(rate), borderRadius: 4, transition: 'width .8s' }} />
              </div>
              {goals.map((g) => (
                <p key={g.id} style={{ fontSize: 13, color: g.is_done ? '#9CA3AF' : '#374151', textDecoration: g.is_done ? 'line-through' : 'none', padding: '3px 0' }}>
                  {g.is_done ? '✅' : '⬜'} {g.title}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 통증 현황 */}
      {Object.keys(latestByPart).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 통증 현황</p>
          {Object.entries(latestByPart).map(([pt, r]) => (
            <div key={pt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: nc(r.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{r.nrs_score}</div>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{pt}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtD(r.recorded_at)} 기준</span>
            </div>
          ))}
        </div>
      )}

      {/* 운동일지 */}
      <p style={{ fontSize: 15, fontWeight: 800, margin: '18px 0 10px' }}>📝 운동일지</p>
      {diaries.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>아직 작성된 일지가 없습니다</p>
        </div>
      )}
      {diaries.map((d) => {
        const dCmts = comments.filter((c) => c.diary_id === d.id);
        const isOpen = openId === d.id;
        return (
          <div key={d.id} id={`diary-${d.id}`} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <button onClick={() => setOpenId(isOpen ? null : d.id)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{fmtD(d.session_date)}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(d.equipment ?? []).map((e) => <span key={e} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#6B7280' }}>{e}</span>)}
                  {d.homework && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F5F3FF', color: '#6D28D9' }}>📝숙제</span>}
                  {d.video_url && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#059669' }}>🎬영상</span>}
                </div>
              </div>
              <span style={{ color: '#C4C9D4', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▼</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {d.purpose && (
                  <div><p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 5 }}>운동 목적</p><p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.purpose}</p></div>
                )}
                {d.content && (
                  <div><p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 5 }}>수업 내용</p><p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.content}</p></div>
                )}
                {d.improvement && (
                  <div style={{ background: '#F0FDF4', borderLeft: '3px solid #22C55E', borderRadius: '0 10px 10px 0', padding: '10px 14px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>🎉 잘한 점</p>
                    <p style={{ fontSize: 13, color: '#14532D', lineHeight: 1.6 }}>{d.improvement}</p>
                  </div>
                )}

                {(d.pain_changes ?? []).length > 0 && (
                  <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '12px 16px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>📊 이번 수업 통증 변화</p>
                    {d.pain_changes.map((p) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.body_part}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: nc(p.prev_nrs) }}>{p.prev_nrs}</span>
                        <span style={{ color: '#D1D5DB', fontSize: 11 }}>→</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: nc(p.curr_nrs) }}>{p.curr_nrs}</span>
                      </div>
                    ))}
                  </div>
                )}

                {d.homework && (
                  <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1px solid #BFDBFE', borderRadius: 16, padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📝 이번 주 숙제</p>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.homework}</p>
                  </div>
                )}
                {d.video_url && (
                  <a href={d.video_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F0FDF4', borderRadius: 12, textDecoration: 'none', border: '1px solid #A7F3D0' }}>
                    <span style={{ fontSize: 20 }}>▶</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{d.video_title || '참고 영상 보기'}</p>
                  </a>
                )}

                {/* 피드백 */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>💬 피드백</p>
                  {dCmts.map((c) => (
                    <div key={c.id} style={{ background: '#FFFBEB', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={commentInput[d.id] || ''}
                      onChange={(e) => setCommentInput((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && sendComment(d.id)}
                      placeholder="선생님께 피드백을 남겨주세요"
                      style={{ flex: 1, padding: '11px 13px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', background: '#F9FAFB' }}
                    />
                    <button onClick={() => sendComment(d.id)} disabled={sending === d.id}
                      style={{ padding: '11px 16px', borderRadius: 12, border: 'none', background: '#3182F6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: sending === d.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {sending === d.id ? <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'inline-block' }} /> : '전송'}
                    </button>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
