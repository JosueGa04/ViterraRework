import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DashboardTrendRow = { month: string; leads: number; conversiones: number };
export type DashboardSourceRow = { name: string; value: number };

type Props = {
  trendData: DashboardTrendRow[];
  sourceData: DashboardSourceRow[];
};

export function AdminDashboardCharts({ trendData, sourceData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.08)] ring-1 ring-black/[0.02]">
        <div className="mb-6">
          <h3 className="font-heading text-base text-brand-navy" style={{ fontWeight: 600 }}>
            Tendencia de Leads
          </h3>
          <p className="mt-1 text-sm text-slate-500" style={{ fontWeight: 500 }}>
            Últimos 6 meses
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorLeadsElegant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#141c2e" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#141c2e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConversionElegant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7f1d1d" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#7f1d1d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: "12px", fontWeight: 500 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px", fontWeight: 500 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontFamily: '"Poppins", system-ui, sans-serif',
                fontSize: "13px",
                fontWeight: 500,
              }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#141c2e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLeadsElegant)"
              name="Leads"
            />
            <Area
              type="monotone"
              dataKey="conversiones"
              stroke="#7f1d1d"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorConversionElegant)"
              name="Conversiones"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.08)] ring-1 ring-black/[0.02]">
        <div className="mb-6">
          <h3 className="font-heading text-base text-brand-navy" style={{ fontWeight: 600 }}>
            Fuentes de Adquisición
          </h3>
          <p className="mt-1 text-sm text-slate-500" style={{ fontWeight: 500 }}>
            Canales de origen
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sourceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "12px", fontWeight: 500 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px", fontWeight: 500 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontFamily: '"Poppins", system-ui, sans-serif',
                fontSize: "13px",
                fontWeight: 500,
              }}
            />
            <Bar dataKey="value" fill="#141c2e" radius={[6, 6, 0, 0]} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
