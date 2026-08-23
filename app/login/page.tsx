import { configuredUsers } from "@/lib/session";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const failed = params.error === "1";
  const from = typeof params.from === "string" ? params.from : "";
  const users = configuredUsers();

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">부동산 트래커</h1>
        <p className="mt-1 text-sm text-muted">관심 매물, 자금 계획, 부동산 정책을 한 곳에서</p>

        <form
          action="/api/auth/login"
          method="post"
          className="mt-8 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <input type="hidden" name="from" value={from} />

          {users.length > 0 && (
            <label className="block">
              <span className="text-sm font-medium">누구인가요?</span>
              <select
                name="name"
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2"
              >
                {users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">
                메모와 별점에 누가 남긴 것인지 표시됩니다.
              </span>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium">공유 비밀번호</span>
            <input
              type="password"
              name="password"
              autoFocus
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2"
            />
          </label>

          {failed && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              비밀번호가 맞지 않습니다.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-3 py-2.5 font-medium text-white"
          >
            들어가기
          </button>
        </form>
      </div>
    </main>
  );
}
