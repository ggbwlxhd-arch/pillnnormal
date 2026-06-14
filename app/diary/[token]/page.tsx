'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Member, Goal, PainRecord, Diary, Comment, calcR, rc, pregW, nc, nl, fmtD, curM } from '@/lib/utils';

export default function MemberSharePage() {
  const { token } = useParams<{ token: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [longGoals, setLongGoals] = useState<Goal[]>([]);
  const [monthGoals, setMonthGoals] = useState<Goal[]>([]);
  const [painRecs, setPainRecs] = useState<PainRecord[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<'diary' | 'goals' | 'pain'>('diary');
  const [openId, setOpenId] = useState<string | null>(null);
  const [cmtInputs, setCmtInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { if (token) fetchAll(); }, [token]);

  async function fetchAll() {
    setLoading(true);
    // share_token으로 회원 조회 (RLS: anon_read_own_member 정책)
    const { data: m } = await supabase
      .from('members').select('*').eq('share_token', token).single();

    if (!m) { setNotFound(true); setLoading(false); return; }
    setMember(m);

    const [{ data: lg }, { data: mg }, { data: pr }, { data: di }, { data: cm }] = await Promise.all([
      supabase.from('long_term_goals').select('*').eq('member_id', m.id).order('sort_order'),
      supabase.from('monthly_goals').select('*').eq('member_id', m.id).eq('month', curM()).order('sort_order'),
      supabase.from('pain_records').select('*').eq('member_id', m.id).order('recorded_at'),
      supabase.from('diaries').select('*, diary_pain_changes(*)').eq('member_id', m.id).order('session_date', { ascending: false }),
      supabase.from('comments').select('*').eq('member_id', m.id).order('created_at'),
    ]);

    setLongGoals(lg ?? []);
    setMonthGoals(mg ?? []);
    setPainRecs(pr ?? []);
    setDiaries((di ?? []).map((d: any) => ({ ...d, pain_changes: d.diary_pain_changes })));
    setComments(cm ?? []);
    setLoading(false);
  }

  async function submitComment(diaryId: string) {
    if (!member) return;
    const body = cmtInputs[diaryId]?.trim();
    if (!body) return;
    await supabase.from('comments').insert({ diary_id: diaryId, member_id: member.id, body, is_read: false });
    setCmtInputs((p) => ({ ...p, [diaryId]: '' }));
    fetchAll();
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #3182F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>링크를 찾을 수 없습니다</p>
      <p style={{ fontSize: 14, color: '#9CA3AF' }}>선생님께 올바른 링크를 요청해주세요</p>
    </div>
  );

  if (!member) return null;

  const lr = calcR(longGoals);
  const mr = calcR(monthGoals);
  const pw = member.is_pregnant && member.edd ? pregW(member.edd) : null;
  const lat = painRecs[painRecs.length - 1];
  const fst = painRecs.find((p) => p.is_first) ?? painRecs[0];

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background: '#fff', padding: '20px 20px 0', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: '#3182F6' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>필라테스 운동일지</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 10 }}>{member.name}님의 운동일지</h1>

        {pw && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: 20, marginBottom: 12 }}>
            <span>🤰</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#BE185D' }}>{pw.lbl}</span>
          </div>
        )}

        {/* 이중 달성률 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>🎯 장기목표</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: rc(lr) }}>{lr}%</span>
            </div>
            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${lr}%`, background: rc(lr), borderRadius: 3 }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>📅 이달목표</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: rc(mr) }}>{mr}%</span>
            </div>
            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${mr}%`, background: rc(mr), borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 3, background: '#F3F4F6', borderRadius: 16, padding: 4, marginBottom: 0 }}>
          {(['diary', 'goals', 'pain'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: 9, fontSize: 13, fontWeight: 700, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#3182F6' : '#6B7280',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
            }}>
              {t === 'diary' ? '운동일지' : t === 'goals' ? '목표' : '통증현황'}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px' }}>

        {/* 운동일지 탭 */}
        {tab === 'diary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diaries.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>아직 작성된 일지가 없어요</p>
              </div>
            )}
            {diaries.map((d) => {
              const dCmts = comments.filter((c) => c.diary_id === d.id);
              const isOpen = openId === d.id;
              return (
                <div key={d.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <button onClick={() => setOpenId(isOpen ? null : d.id)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtD(d.session_date)} 수업</span>
                        {d.homework && <Tag bg="#F5F3FF" color="#6D28D9">📝숙제</Tag>}
                        {d.video_url && <Tag bg="#F0FDF4" color="#059669">🎬영상</Tag>}
                        {dCmts.length > 0 && <Tag bg="#FFFBEB" color="#92400E">💬{dCmts.length}</Tag>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {d.equipment.map((e) => <Tag key={e} bg="#F3F4F6" color="#6B7280">{e}</Tag>)}
                      </div>
                    </div>
                    <span style={{ color: '#C4C9D4', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▼</span>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {d.purpose && <InfoBlock label="오늘의 운동 목적" value={d.purpose} />}
                      {d.content && <InfoBlock label="수업 내용" value={d.content} />}
                      {d.compensation && <AccentBlock label="⚠️ 주의사항" value={d.compensation} bg="#FFFBEB" border="#F59E0B" color="#78350F" labelColor="#92400E" />}
                      {d.improvement && <AccentBlock label="🎉 오늘 잘한 점" value={d.improvement} bg="#F0FDF4" border="#22C55E" color="#14532D" labelColor="#166534" />}

                      {/* 통증 변화 */}
                      {d.pain_changes && d.pain_changes.length > 0 && (
                        <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '12px 16px' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>📊 이번 수업 통증 변화</p>
                          {d.pain_changes.map((p: any) => {
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

                      {/* 숙제 */}
                      {d.homework && (
                        <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1px solid #BFDBFE', borderRadius: 16, padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 16 }}>📝</span>
                            <p style={{ fontSize: 13, fontWeight: 700 }}>이번 주 숙제</p>
                          </div>
                          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.homework}</p>
                        </div>
                      )}

                      {/* 영상 */}
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
                              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>탭하여 영상 보기</p>
                            </div>
                          </a>
                        </div>
                      )}

                      {/* 피드백 */}
                      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>💬 피드백 남기기</p>
                        {dCmts.map((c) => (
                          <div key={c.id} style={{ background: '#F9FAFB', borderRadius: 12, padding: '11px 14px', marginBottom: 8 }}>
                            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{c.body}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <textarea
                            value={cmtInputs[d.id] || ''}
                            onChange={(e) => setCmtInputs((p) => ({ ...p, [d.id]: e.target.value }))}
                            placeholder="오늘 수업 어떠셨나요? 😊"
                            rows={2}
                            style={{ flex: 1, padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none' }}
                          />
                          <button onClick={() => submitComment(d.id)} style={{ padding: '0 16px', background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 14, border: 'none', cursor: 'pointer', alignSelf: 'flex-end', height: 44 }}>
                            전송
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 목표 탭 */}
        {tab === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fst && lat && lat.nrs_score < fst.nrs_score && (
              <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '1px solid #86EFAC', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 36 }}>🎉</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>많이 좋아지고 있어요!</p>
                  <p style={{ fontSize: 13, color: '#16A34A', marginTop: 4, lineHeight: 1.5 }}>
                    첫 방문 NRS <strong>{fst.nrs_score}점</strong>에서 현재 <strong>{lat.nrs_score}점</strong>으로<br />
                    <strong>{fst.nrs_score - lat.nrs_score}점이나 개선</strong>됐어요 👏
                  </p>
                </div>
              </div>
            )}
            <GoalViewCard title="🎯 장기 목표" rate={lr} goals={longGoals} doneIcon="🏆" />
            <GoalViewCard title="📅 이달의 목표" rate={mr} goals={monthGoals} doneIcon="✅" subtitle={`${curM().replace('-', '년 ')}월`} />
          </div>
        )}

        {/* 통증 탭 */}
        {tab === 'pain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {painRecs.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>통증 기록이 없어요</p>
              </div>
            ) : (
              <>
                {fst && lat && lat.nrs_score < fst.nrs_score && (
                  <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '1px solid #86EFAC', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 36 }}>🎉</span>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>많이 좋아지고 있어요!</p>
                      <p style={{ fontSize: 13, color: '#16A34A', marginTop: 4, lineHeight: 1.5 }}>
                        첫 방문 <strong>{fst.nrs_score}점</strong> → 현재 <strong>{lat.nrs_score}점</strong><br />
                        <strong>{fst.nrs_score - lat.nrs_score}점 개선</strong> 👏
                      </p>
                    </div>
                  </div>
                )}
                <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>부위별 현황</p>
                  {(() => {
                    const partMap: Record<string, PainRecord> = {};
                    painRecs.forEach((p) => p.body_parts.forEach((pt) => { partMap[pt] = p; }));
                    return Object.entries(partMap).map(([pt, rec]) => {
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
                                {diff > 0 ? `-${diff}점 개선 ↓` : diff < 0 ? `+${Math.abs(diff)}점 악화` : '유지'}
                              </span>
                            </div>
                            <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${rec.nrs_score * 10}%`, background: nc(rec.nrs_score), borderRadius: 3 }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{nl(rec.nrs_score)}</span>
                              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(rec.recorded_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                {painRecs.length > 1 && (
                  <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>NRS 변화 그래프</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>막대에 마우스를 올리면 상세 정보가 표시됩니다</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                      {painRecs.slice(-12).map((r, i, arr) => {
                        const h = r.nrs_score === 0 ? 4 : Math.round((r.nrs_score / 10) * 56) + 4;
                        return (
                          <div key={r.id} title={`${fmtD(r.recorded_at)}: NRS ${r.nrs_score}점`}
                            style={{ flex: 1, background: nc(r.nrs_score), height: h, borderRadius: '4px 4px 0 0', opacity: i === arr.length - 1 ? 1 : 0.7, cursor: 'help' }} />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(painRecs[Math.max(0, painRecs.length - 12)].recorded_at)}</span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>← 시간 흐름 →</span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(painRecs[painRecs.length - 1].recorded_at)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
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
function GoalViewCard({ title, subtitle, rate, goals, doneIcon }: { title: string; subtitle?: string; rate: number; goals: Goal[]; doneIcon: string }) {
  const color = rc(rate);
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{subtitle}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{rate}%</span>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>{goals.filter((g) => g.is_done).length}/{goals.length}</p>
        </div>
      </div>
      <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${rate}%`, background: color, borderRadius: 5 }} />
      </div>
      {goals.map((g) => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, border: g.is_done ? 'none' : '2px solid #D1D5DB', background: g.is_done ? '#3182F6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {g.is_done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
          </div>
          <span style={{ flex: 1, fontSize: 14, color: g.is_done ? '#9CA3AF' : '#374151', textDecoration: g.is_done ? 'line-through' : 'none' }}>{g.title}</span>
          {g.is_done && <span>{doneIcon}</span>}
        </div>
      ))}
      {goals.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>목표가 없습니다</p>}
    </div>
  );
}
