"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Summary {
  dryRun: boolean;
  total: number;
  willCreate: number;
  willUpdate: number;
  willSkip: number;
  failed: { rowNumber: number; errors: string[] }[];
  unknownHeaders: string[];
}

export function ImportForm() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("skip");

  async function send(dryRun: boolean) {
    if (!file) {
      setError("CSV 파일을 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    if (dryRun) body.set("dryRun", "1");

    try {
      const response = await fetch("/api/import", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "가져오지 못했습니다.");
        return;
      }
      setSummary(data);
      if (!dryRun) router.refresh();
    } catch {
      setError("요청이 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-muted">CSV 파일</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setSummary(null);
            }}
            className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-muted">
            엑셀에서 저장한 파일(EUC-KR)도 읽습니다.
          </span>
        </label>

        <label className="block">
          <span className="text-xs text-muted">이미 있는 매물은</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="skip">건너뛰기</option>
            <option value="overwrite">덮어쓰기</option>
            <option value="append">새로 추가</option>
          </select>
          <span className="mt-1 block text-xs text-muted">
            링크가 같으면 같은 매물로 봅니다. 링크가 없으면 별칭 + 단지명으로 판단합니다.
          </span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => send(true)}
          disabled={busy}
          className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-50"
        >
          미리보기
        </button>
        <button
          type="button"
          onClick={() => send(false)}
          disabled={busy || !summary?.dryRun}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          title={summary?.dryRun ? undefined : "먼저 미리보기를 해보세요"}
        >
          가져오기
        </button>
      </div>

      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {summary && (
        <div className="rounded-lg border border-line p-3 text-sm">
          <p className="font-medium">
            {summary.dryRun ? "미리보기" : "가져왔습니다"} — 전체 {summary.total}행
          </p>
          <ul className="mt-2 space-y-0.5 text-muted">
            <li>새로 추가: {summary.willCreate}건</li>
            {summary.willUpdate > 0 && <li>덮어쓰기: {summary.willUpdate}건</li>}
            {summary.willSkip > 0 && <li>건너뜀: {summary.willSkip}건</li>}
          </ul>

          {summary.unknownHeaders.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              모르는 열은 무시했습니다: {summary.unknownHeaders.join(", ")}
            </p>
          )}

          {summary.failed.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-danger">
                읽지 못한 행 {summary.failed.length}개 — 나머지는 정상 처리됩니다
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {summary.failed.slice(0, 10).map((row) => (
                  <li key={row.rowNumber}>
                    {row.rowNumber}행: {row.errors.join(", ")}
                  </li>
                ))}
                {summary.failed.length > 10 && <li>… 외 {summary.failed.length - 10}개</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
