"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parse } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND } from "@/lib/brand";

export interface MonthlyChartPoint {
  month: string;
  checkouts: number;
  returns: number;
}

interface MonthlyChartProps {
  data: MonthlyChartPoint[];
}

function formatMonthLabel(month: string): string {
  try {
    const date = parse(month, "yyyy-MM", new Date());
    return format(date, "MMM");
  } catch {
    return month;
  }
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label ? formatMonthLabel(label) : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="capitalize text-muted-foreground">
            {entry.dataKey}:
          </span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const [range, setRange] = useState("6");

  const chartData = useMemo(() => {
    const sliced = range === "3" ? data.slice(-3) : data.slice(-6);
    return sliced.map((point) => ({
      ...point,
      label: formatMonthLabel(point.month),
    }));
  }, [data, range]);

  return (
    <Card className="border-border/60 shadow-sm lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            Checkouts & Returns Overview
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly lending activity
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Last 6 Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Last 6 Months</SelectItem>
            <SelectItem value="3">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="checkoutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.primaryColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={BRAND.primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.successColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={BRAND.successColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={12}
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="checkouts"
                stroke={BRAND.primaryColor}
                strokeWidth={2}
                fill="url(#checkoutGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="returns"
                stroke={BRAND.successColor}
                strokeWidth={2}
                fill="url(#returnGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: BRAND.primaryColor }}
            />
            <span className="text-muted-foreground">Checkouts</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: BRAND.successColor }}
            />
            <span className="text-muted-foreground">Returns</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
