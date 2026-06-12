'use client';

import Link from 'next/link';
import { Member, Goal, PainRecord, calcR, rc, pregW, nc } from '@/lib/utils';

export default function MemberCard({
  member, longGoals, monthGoals, painRecs,
}: {
  member: Member;
  longGoals: Goal[];
  monthGoals: Goal[];
  painRecs: PainRecord[];
}) {
  const lr = calcR(longGoals);
  const mr = calcR(monthGoals);
  const pw = member.is_pregnant && member.edd ? pregW(member.edd) : null;
  const lp = painRecs[painRecs.length - 1];
  const fsp = painRecs.find((p) => p.is_first) ?? painRecs[0];

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/diary/${member.share_token}`
    : '';

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    alert('링크가 복사되었습니다!');
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: member.is_pregnant ? '#EC4899' : '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 19, flexShrink: 0 }}>
            {member.name[0]}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{member.name}</span>
              {member.is_pregnant && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FCE7F3', color: '#BE185D' }}>임산부</span>}
              {lp && fsp && lp.nrs_score < fsp.nrs_score && (
                <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#16A34A' }}>
                  ↓{fsp.nrs_score - lp.nrs_score}점 개선
                </span>
              )}
              <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#3182F6' }}>
                {member.notify_channel === 'kakao' ? '💬 카카오' : '📱 문자'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{member.phone || ''}</span>
              {pw && <span style={{ fontSize: 12, fontWeight: 600, color: '#EC4899' }}>· {pw.lbl}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>장기 <span style={{ fontWeight: 800, color: rc(lr) }}>{lr}%</span></div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>이달 <span style={{ fontWeight: 800, color: rc(mr) }}>{mr}%</span></div>
          </div>
          <div style={{ position: 'relative', width: 50, height: 50 }}>
            <svg viewBox="0 0 36 36" width={50} height={50} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={18} cy={18} r={14} fill="none" stroke="#F3F4F6" strokeWidth={3.5} />
              <circle cx={18} cy={18} r={14} fill="none" stroke={rc(mr)} strokeWidth={3.5} strokeDasharray={`${mr * 0.88} 88`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#374151' }}>{mr}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
        <Link href={`/admin/members/${member.id}`} style={{ flex: 1, textAlign: 'center', padding: 11, background: '#3182F6', color: '#fff', borderRadius: 14, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          📋 일지 관리
        </Link>
        <button onClick={copyLink} style={{ flex: 1, padding: 11, background: '#F3F4F6', color: '#374151', borderRadius: 14, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          🔗 링크 복사
        </button>
      </div>
    </div>
  );
}
