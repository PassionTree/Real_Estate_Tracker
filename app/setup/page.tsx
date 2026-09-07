/**
 * SESSION_SECRET 이 없으면 서명을 검증할 수 없어 인증 자체가 성립하지 않는다.
 * 조용히 통과시키는 대신 무엇을 설정해야 하는지 알려준다.
 */
export default function SetupPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">설정이 필요합니다</h1>
        <p className="mt-2 text-sm text-muted">
          <code className="rounded bg-background px-1">.env.example</code> 을{" "}
          <code className="rounded bg-background px-1">.env</code> 로 복사한 뒤 아래 두 값을 채우고
          서버를 다시 시작하세요.
        </p>

        <pre className="mt-4 overflow-x-auto rounded-lg bg-background p-4 text-sm">
          <code>{`SHARED_PASSWORD=원하는_비밀번호
SESSION_SECRET=$(openssl rand -hex 32)`}</code>
        </pre>

        <p className="mt-4 text-sm text-muted">
          <strong className="text-foreground">SESSION_SECRET</strong> 은 로그인 쿠키를 서명하는 키입니다.
          이 값이 없으면 위조된 쿠키를 걸러낼 수 없어, 앱이 로그인을 통과시키는 대신 이 화면을 보여줍니다.
        </p>
      </div>
    </main>
  );
}
