"use client";

import { useState } from "react";
import lawdCodes from "@/data/lawd-codes.json";

interface SyncResult {
  succeeded: number;
  failed: number;
  results: { lawdCd: string; dealYmd: string; rowCount: number; error?: string }[];
}

/**
 * 실거래가 수집.
 *
 * 화면을 열 때마다 API 를 부르지 않는다. 여기서 지역과 기간을 고르고
 * 명시적으로 눌러야 국토부 서버에 요청이 나간다.
 */
export function RegionSyncPanel({ selectedLawdCodes }: { selectedLawdCodes: string[] }) {
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    if (selectedLawdCodes.length === 0) {
      setError("먼저 지역을 골라주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/molit/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawdCodes: selectedLawdCodes, months }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "수집하지 못했습니다.");
        return;
      }
      setResult(data);
    } catch {
      setError("요청이 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const codeToName = new Map(lawdCodes.regions.map((r) => [r.code, r.name]));

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">실거래가 수집</span>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-lg border border-line bg-background px-2 py-1 text-sm"
        >
          {[3, 6, 12, 24].map((m) => (
            <option key={m} value={m}>
              최근 {m}개월
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={sync}
          disabled={busy || selectedLawdCodes.length === 0}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? `수집 중… (${selectedLawdCodes.length}개 지역 × ${months}개월)` : "수집하기"}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-muted">
        지역 하나당 {months}번, 국토부 서버에 요청합니다. 매번 자동으로 부르지 않으니 원할 때만 누르세요.
      </p>

      {error && <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-2 text-sm">
          <p>
            수집 완료 — 성공 {result.succeeded}건
            {result.failed > 0 && <span className="text-danger"> · 실패 {result.failed}건</span>}
          </p>
          {result.failed > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {result.results
                .filter((r) => r.error)
                .slice(0, 5)
                .map((r) => (
                  <li key={`${r.lawdCd}-${r.dealYmd}`}>
                    {codeToName.get(r.lawdCd) ?? r.lawdCd} {r.dealYmd}: {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
