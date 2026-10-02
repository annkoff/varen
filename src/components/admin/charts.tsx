"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Validated for the dark surface #131312 (dataviz validator: CVD ΔE 27, contrast ≥ 3:1). */
const SERIES_1 = "#c98500";
const SERIES_2 = "#3987e5";
const GRID = "rgba(237,233,225,0.08)";
const AXIS = "#8f8b83";

export interface SeriesPoint {
  label: string;
  visits: number;
  visitors: number;
  leads: number;
  cta: number;
}

const tooltipStyle = {
  contentStyle: { background: "#1b1b19", border: "1px solid rgba(237,233,225,0.22)", borderRadius: 0, fontSize: 12, color: "#ede9e1" },
  labelStyle: { color: "#9a958b", marginBottom: 4 },
  itemStyle: { color: "#ede9e1", padding: 0 },
  cursor: { stroke: "rgba(237,233,225,0.3)", strokeWidth: 1 },
};

const axisProps = { stroke: AXIS, tick: { fill: AXIS, fontSize: 11 }, tickLine: false, axisLine: { stroke: GRID } } as const;

export function TrafficChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="График визитов и уникальных посетителей">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip {...tooltipStyle} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#ede9e1", paddingTop: 8 }} />
          <Line type="monotone" dataKey="visits" name="Визиты" stroke={SERIES_1} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#131312", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="visitors" name="Уникальные посетители" stroke={SERIES_2} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#131312", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SingleBarChart({ data, dataKey, name }: { data: SeriesPoint[]; dataKey: "leads" | "cta"; name: string }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`График: ${name}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(237,233,225,0.05)" }} />
          <Bar dataKey={dataKey} name={name} fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
