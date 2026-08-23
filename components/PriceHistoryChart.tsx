"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatManwon, formatManwonShort } from "@/lib/money";

export interface PricePoint {
  at: string;
  priceManwon: number;
  note: string | null;
  recordedBy: string | null;
}

/**
 * 호가 변동 그래프.
 * 기록이 하나뿐이면 선이 그려지지 않으므로 표로 대신한다.
 */
export function PriceHistoryChart({ points }: { points: PricePoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">가격 기록이 없습니다.</p>;
  }

  const data = points.map((point) => ({
    ...point,
    label: new Date(point.at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
  }));

  return (
    <div className="space-y-3">
      {points.length >= 2 && (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--border)" />
              <YAxis
                tickFormatter={(value: number) => formatManwonShort(value)}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                stroke="var(--border)"
                width={52}
                domain={["dataMin - 1000", "dataMax + 1000"]}
              />
              <Tooltip
                formatter={(value) => [formatManwon(Number(value)), "호가"]}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="stepAfter"
                dataKey="priceManwon"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <ul className="space-y-1 text-sm">
        {[...points].reverse().map((point, index) => (
          <li key={`${point.at}-${index}`} className="flex flex-wrap items-baseline gap-2">
            <span className="tabular w-24 shrink-0 text-xs text-muted">
              {new Date(point.at).toLocaleDateString("ko-KR")}
            </span>
            <span className="tabular font-medium">{formatManwon(point.priceManwon)}</span>
            {point.note && <span className="text-xs text-muted">{point.note}</span>}
            {point.recordedBy && <span className="text-xs text-muted">— {point.recordedBy}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
