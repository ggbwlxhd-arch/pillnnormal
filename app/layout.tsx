export const metadata = {
  title: '필라테스 센터 관리',
  description: '회원 맞춤형 운동일지 관리 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
