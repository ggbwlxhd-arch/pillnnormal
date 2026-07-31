'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Goal, PainRecord, calcR, rc, pregW, curM } from '@/lib/utils';
import MemberCard from '@/components/admin/MemberCard';
import AddMemberModal from '@/components/admin/AddMemberModal';

type Notice = { id: string; title: string; body: string; bg_color: string; text_color: string; image_url: string | null; is_active: boolean };

const BG_COLORS = ['#3182F6','#1D4ED8','#06B6D4','#EC4899','#BE185D','#F97316','#F59E0B','#FEF08A','#10B981','#065F46','#84CC16','#6D28D9','#A855F7','#EF4444','#7C3AED','#0F172A','#111827','#6B7280','#F9FAFB','linear-gradient(135deg,#3182F6,#6D28D9)','linear-gradient(135deg,#EC4899,#F97316)','linear-gradient(135deg,#10B981,#3182F6)','linear-gradient(135deg,#F59E0B,#EF4444)'];
const TXT_COLORS = ['#ffffff','#111827','#374151','#6B7280','#3182F6','#1D4ED8','#06B6D4','#EC4899','#BE185D','#F97316','#F59E0B','#92400E','#10B981','#065F46','#6D28D9','#A855F7','#EF4444','#854D0E'];
const COLOR_NAMES: Record<string, string> = {'#3182F6':'파랑','#1D4ED8':'진파랑','#06B6D4':'하늘','#EC4899':'핑크','#BE185D':'진핑크','#F97316':'주황','#F59E0B':'노랑','#FEF08A':'연노랑','#10B981':'초록','#065F46':'진초록','#84CC16':'연두','#6D28D9':'보라','#A855F7':'연보라','#EF4444':'빨강','#7C3AED':'인디고','#0F172A':'네이비','#111827':'검정','#6B7280':'회색','#F9FAFB':'흰색','#ffffff':'흰색','#374151':'진회색','#92400E':'갈색','#854D0E':'진노랑'};

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [longGoals, setLongGoals] = useState<Record<string, Goal[]>>({});
  const [monthGoals, setMonthGoals] = useState<Record<string, Goal[]>>({});
  const [painRecs, setPainRecs] = useState<Record<string, PainRecord[]>>({});
  const [comments, setComments] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFbPanel, setShowFbPanel] = useState(false);

  // 공지 등록 폼
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [nBg, setNBg] = useState('#3182F6');
  const [nTxt, setNTxt] = useState('#ffffff');
  const [nImg, setNImg] = useState('');
  const [nSaving, setNSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!showFbPanel) return;
    const handler = (e: MouseEvent) => {
      const panel = document.getElementById('fb-panel');
      const badge = document.getElementById('fb-badge');
      if (panel && !panel.contains(e.target as Node) && badge && !badge.contains(e.target as Node)) {
        setShowFbPanel(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showFbPanel]);

  async function fetchAll() {
    setLoading(true);
    const { data: m } = await supabase.from('members').select('*');
    const sorted = (m ?? []).sort((a: Member, b: Member) => a.name.localeCompare(b.name, 'ko'));
    setMembers(sorted);

    if (sorted.length > 0) {
      const ids = sorted.map((x: Member) => x.id);
      const [{ data: lg }, { data: mg }, { data: pr }, { data: cm }, { data: nts }] = await Promise.all([
        supabase.from('long_term_goals').select('*').in('member_id', ids).order('sort_order'),
        supabase.from('monthly_goals').select('*').in('member_id', ids).eq('month', curM()).order('sort_order'),
        supabase.from('pain_records').select('*').in('member_id', ids).order('recorded_at'),
        supabase.from('comments').select('*, diaries(session_date, member_id, members(name))').order('created_at', { ascending: false }),
        supabase.from('notices').select('*').order('sort_order').order('created_at', { ascending: false }),
      ]);
      const lgG: Record<string, Goal[]> = {};
      (lg ?? []).forEach((g: Goal) => { (lgG[g.member_id] ??= []).push(g); });
      setLongGoals(lgG);
      const mgG: Record<string, Goal[]> = {};
      (mg ?? []).forEach((g: Goal) => { (mgG[g.member_id] ??= []).push(g); });
      setMonthGoals(mgG);
      const prG: Record<string, PainRecord[]> = {};
      (pr ?? []).forEach((p: PainRecord) => { (prG[p.member_id] ??= []).push(p); });
      setPainRecs(prG);
      setComments(cm ?? []);
      setUnread((cm ?? []).filter((c: any) => !c.is_read).length);
      setNotices(nts ?? []);
    }
    setLoading(false);
  }

  async function markAllRead() {
    await supabase.from('comments').update({ is_read: true }).eq('is_read', false);
    setComments(prev => prev.map(c => ({ ...c, is_read: true })));
    setUnread(0);
  }

  async function markOneRead(id: string) {
    await supabase.from('comments').update({ is_read: true }).eq('id', id);
    setComments(prev => prev.map(c => c.id === id ? { ...c, is_read: true } : c));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function addNotice() {
    if (!nTitle.trim()) { alert('제목을 입력해주세요'); return; }
    setNSaving(true);
    const { data } = await supabase.from('notices').insert({ title: nTitle.trim(), body: nBody.trim() || null, bg_color: nBg, text_color: nTxt, image_url: nImg.trim() || null, is_active: true }).select().single();
    if (data) setNotices(prev => [data, ...prev]);
    setNTitle(''); setNBody(''); setNImg('');
    setNSaving(false);
  }

  async function toggleNotice(id: string) {
    const n = notices.find(x => x.id === id); if (!n) return;
    await supabase.from('notices').update({ is_active: !n.is_active }).eq('id', id);
    setNotices(prev => prev.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x));
  }

  async function deleteNotice(id: string) {
    if (!confirm('공지를 삭제할까요?')) return;
    await supabase.from('notices').delete().eq('id', id);
    setNotices(prev => prev.filter(x => x.id !== id));
  }

  const filtered = members.filter(m => !search || m.name.includes(search) || (m.phone || '').includes(search));

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: '#3182F6', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>P</div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>필라테스 센터</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* 피드백 뱃지 */}
            {unread > 0 && (
              <div style={{ position: 'relative' }}>
                <button id="fb-badge" onClick={() => setShowFbPanel(!showFbPanel)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#FFFBEB', borderRadius: 20, border: '1px solid #FDE68A', cursor: 'pointer' }}>
                  <span style={{ width: 8, height: 8, background: '#F59E0B', borderRadius: '50%', display: 'block' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>새 피드백 {unread}건</span>
                </button>
                {showFbPanel && (
                  <div id="fb-panel" style={{ position: 'fixed', top: 68, right: 16, width: 360, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,.18)', zIndex: 300, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
                      <p style={{ fontSize: 14, fontWeight: 800 }}>💬 회원 피드백</p>
                      <button onClick={markAllRead} style={{ padding: '4px 10px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#6B7280', cursor: 'pointer' }}>모두 읽음</button>
                    </div>
                    {comments.slice(0, 15).map((c: any) => {
                      const diary = c.diaries;
                      const memberName = diary?.members?.name;
                      const memberId = diary?.member_id;
                      return (
                        <button key={c.id} onClick={() => { markOneRead(c.id); setShowFbPanel(false); window.location.href = `/admin/members/${memberId}`; }} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', cursor: 'pointer', borderBottom: '1px solid #F9FAFB', width: '100%', background: c.is_read ? '#fff' : '#FFFBEB', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}>
                          {!c.is_read ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 5 }} /> : <div style={{ width: 8, flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 8, background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{memberName?.[0] ?? '?'}</div>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{memberName ?? '알 수 없음'}</span>
                              {!c.is_read && <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '2px 6px', borderRadius: 6, border: '1px solid #FDE68A' }}>NEW</span>}
                            </div>
                            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{c.body}</p>
                            {diary && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>📋 {new Date(diary.session_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 수업 일지</p>}
                          </div>
                          <span style={{ fontSize: 14, color: '#D1D5DB', flexShrink: 0 }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* 공지관리 버튼 */}
            <button onClick={() => setShowNotice(true)} style={{ padding: '7px 14px', background: '#F5F3FF', color: '#6D28D9', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>📢 공지관리</button>
            <button onClick={() => setShowAdd(true)} style={{ padding: '11px 20px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', background: '#3182F6', color: '#fff', cursor: 'pointer' }}>+ 회원 등록</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}><p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>전체 회원</p><p style={{ fontSize: 26, fontWeight: 800, color: '#3182F6' }}>{members.length}<span style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 2 }}>명</span></p></div>
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}><p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>임산부</p><p style={{ fontSize: 26, fontWeight: 800, color: '#EC4899' }}>{members.filter(m => m.is_pregnant).length}<span style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 2 }}>명</span></p></div>
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}><p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>새 피드백</p><p style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>{unread}<span style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 2 }}>건</span></p></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '10px 16px', marginBottom: 14 }}>
          <span>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="회원 이름 검색..." style={{ border: 'none', outline: 'none', fontSize: 14, flex: 1, background: 'transparent' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>×</button>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #3182F6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{search ? `"${search}" 검색 결과가 없어요` : '등록된 회원이 없어요'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(m => (
              <MemberCard key={m.id} member={m} longGoals={longGoals[m.id] ?? []} monthGoals={monthGoals[m.id] ?? []} painRecs={painRecs[m.id] ?? []} onRefresh={fetchAll} />
            ))}
          </div>
        )}
      </div>

      {/* 공지 관리 모달 */}
      {showNotice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>📢 공지 관리</h2>
              <button onClick={() => setShowNotice(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>💡 <strong>이름님</strong> → 해당 회원 이름으로 자동 변환돼요!<br />예) "이름님 안녕하세요!" → "지혜님 안녕하세요!"</p>
              </div>

              {/* 등록된 공지 목록 */}
              {notices.map(n => (
                <div key={n.id} style={{ borderRadius: 14, overflow: 'hidden', border: `2px solid ${n.bg_color.startsWith('linear') ? '#E5E7EB' : n.bg_color}` }}>
                  <div style={{ background: n.bg_color, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: n.text_color }}>{n.title}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleNotice(n.id)} style={{ padding: '3px 9px', background: 'rgba(255,255,255,.2)', color: n.text_color, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{n.is_active ? '노출중' : '숨김'}</button>
                      <button onClick={() => deleteNotice(n.id)} style={{ padding: '3px 9px', background: 'rgba(255,0,0,.2)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
              {notices.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>등록된 공지가 없습니다</p>}

              {/* 새 공지 등록 */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>+ 새 공지 등록</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>공지 제목</label><input value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="예) 이름님 7월 이벤트 안내!" style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>공지 내용</label><textarea value={nBody} onChange={e => setNBody(e.target.value)} rows={4} placeholder="이름님 안녕하세요! 😊&#10;&#10;7월 이벤트 내용..." style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} /></div>

                  {/* 배경색 */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>배경색</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {BG_COLORS.map(c => (
                        <button key={c} title={COLOR_NAMES[c] || c} onClick={() => setNBg(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: nBg === c ? '3px solid #111827' : '2px solid #E5E7EB', cursor: 'pointer', flexShrink: 0, transform: nBg === c ? 'scale(1.15)' : 'none', transition: 'all .15s' }} />
                      ))}
                    </div>
                  </div>

                  {/* 글씨색 */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>글씨색</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {TXT_COLORS.map(c => (
                        <button key={c} title={COLOR_NAMES[c] || c} onClick={() => setNTxt(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: nTxt === c ? '3px solid #3182F6' : '1.5px solid #E5E7EB', cursor: 'pointer', flexShrink: 0, transform: nTxt === c ? 'scale(1.15)' : 'none', transition: 'all .15s' }} />
                      ))}
                    </div>
                  </div>

                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>이미지 URL <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(선택)</span></label><input value={nImg} onChange={e => setNImg(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} /></div>

                  {/* 미리보기 */}
                  {nTitle && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>미리보기</label>
                      <div style={{ borderRadius: 14, overflow: 'hidden', background: nBg, cursor: 'pointer' }}>
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: nTxt }}>{nTitle}</p>
                          <span style={{ color: nTxt, opacity: .7 }}>›</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={addNotice} disabled={nSaving} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 14, border: 'none', cursor: 'pointer', opacity: nSaving ? 0.6 : 1 }}>
                    {nSaving ? '등록 중...' : '공지 등록하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSaved={fetchAll} />}
    </div>
  );
}
