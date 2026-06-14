"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const COLORS = [
  BRAND.primaryColor,
  BRAND.successColor,
  BRAND.warningColor,
  BRAND.dangerColor,
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  BRAND.neutralColor,
];

interface CategoryChartProps {
  data: Array<{ category: string; count: number }>;
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { category: string; count: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
      <p className="text-sm font-medium">{item.category}</p>
      <p className="text-sm text-muted-foreground">{item.count} books</p>
    </div>
  );
}

export function CategoryChart({ data }: CategoryChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const topCategories = data.slice(0, 6);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Categories</CardTitle>
        <p className="text-sm text-muted-foreground">Collection breakdown</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative h-[220px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topCategories}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {topCategories.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{total.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">Total Books</span>
            </div>
          </div>

          <ul className="w-full flex-1 space-y-3 pt-2">
            {topCategories.map((item, index) => {
              const percent = total > 0 ? (item.count / total) * 100 : 0;

              return (
                <li key={item.category} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {item.category}
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all")}
                        style={{
                          width: `${percent}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
