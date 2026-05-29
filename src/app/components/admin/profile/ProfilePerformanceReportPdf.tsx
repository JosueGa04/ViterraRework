import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { User } from "../../../contexts/AuthContext";
import { roleLabelEs } from "../../../lib/leadsAccess";
import type { ProfileReportSheet } from "../../../lib/profileReportExport";

const C = {
  navy: "#0f1c2e",
  navySoft: "#1a2942",
  red: "#c41e3a",
  redSoft: "#fef2f4",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate900: "#0f172a",
  white: "#ffffff",
  emerald: "#059669",
  emeraldBg: "#ecfdf5",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.slate700,
    backgroundColor: C.white,
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 36,
  },
  coverPage: {
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    backgroundColor: C.slate50,
  },
  coverHero: {
    backgroundColor: C.navy,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 36,
  },
  coverHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  coverLogoBox: {
    backgroundColor: C.white,
    borderRadius: 6,
    padding: 6,
    marginRight: 14,
  },
  coverLogo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  coverBrandBlock: {
    flex: 1,
  },
  coverBrand: {
    fontSize: 8,
    color: C.red,
    letterSpacing: 2,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 10,
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  coverDateChip: {
    backgroundColor: C.navySoft,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#2d3f5c",
    alignItems: "flex-end",
    maxWidth: 180,
  },
  coverDateLabel: {
    fontSize: 7,
    color: C.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  coverDateValue: {
    fontSize: 8,
    color: C.white,
    textAlign: "right",
    lineHeight: 1.35,
  },
  coverBody: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },
  userCard: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 14,
    marginBottom: 18,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  userName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 8,
    color: C.slate500,
    lineHeight: 1.45,
  },
  roleBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: C.redSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  roleBadgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.red,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  kpiCard: {
    width: "31.5%",
    marginRight: "2%",
    marginBottom: 8,
    backgroundColor: C.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 10,
    minHeight: 58,
  },
  kpiCardWide: {
    width: "48%",
    backgroundColor: C.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 10,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 7,
    color: C.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  kpiValueSm: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  callout: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
  },
  calloutText: {
    fontSize: 8,
    color: "#92400e",
    lineHeight: 1.45,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
  },
  fixedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  fixedHeaderAccent: {
    width: 3,
    height: 22,
    backgroundColor: C.red,
    borderRadius: 2,
    marginRight: 10,
  },
  fixedHeaderTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  fixedHeaderSub: {
    fontSize: 7,
    color: C.slate400,
    marginTop: 1,
  },
  fixedHeaderRight: {
    fontSize: 7,
    color: C.slate400,
    textAlign: "right",
  },
  fixedFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    backgroundColor: C.slate50,
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  footerMuted: {
    fontSize: 7,
    color: C.slate400,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.slate200,
    overflow: "hidden",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.slate50,
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: C.red,
    borderRadius: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  kvRowAlt: {
    backgroundColor: C.slate50,
  },
  kvKey: {
    width: "42%",
    fontSize: 8,
    color: C.slate500,
  },
  kvVal: {
    flex: 1,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.slate900,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeadCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  tableRowAlt: {
    backgroundColor: C.slate50,
  },
  tableCell: {
    fontSize: 8,
    color: C.slate700,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  deltaUp: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.emerald,
  },
  deltaDown: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.red,
  },
  deltaNeutral: {
    fontSize: 8,
    color: C.slate400,
  },
  emptyBox: {
    padding: 14,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 8,
    color: C.slate400,
    fontStyle: "italic",
  },
  twoCol: {
    flexDirection: "row",
  },
  colHalf: {
    flex: 1,
    marginRight: 10,
  },
  colHalfLast: {
    flex: 1,
    marginRight: 0,
  },
});

type Props = {
  user: User;
  generatedAt: string;
  rangeLabel: string;
  sheets: ProfileReportSheet[];
};

function findSheet(sheets: ProfileReportSheet[], name: string): ProfileReportSheet | undefined {
  return sheets.find((s) => s.name === name);
}

function sheetToMap(sheet: ProfileReportSheet | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!sheet) return m;
  for (const row of sheet.rows) {
    m.set(String(row[0]), String(row[1] ?? "—"));
  }
  return m;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseDelta(raw: string): "up" | "down" | "neutral" {
  if (raw === "—" || raw === "") return "neutral";
  if (raw.startsWith("+")) return "up";
  if (raw.startsWith("-")) return "down";
  return "neutral";
}

function PageChrome({
  userName,
  rangeLabel,
  children,
  style,
}: {
  userName: string;
  rangeLabel: string;
  children: React.ReactNode;
  style?: Style;
}) {
  return (
    <Page size="A4" style={[styles.page, style ?? {}]}>
      <View style={styles.fixedHeader} fixed>
        <View style={styles.fixedHeaderLeft}>
          <View style={styles.fixedHeaderAccent} />
          <View>
            <Text style={styles.fixedHeaderTitle}>Reporte de rendimiento</Text>
            <Text style={styles.fixedHeaderSub}>
              {userName} · {rangeLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.fixedHeaderRight}>Viterra CRM</Text>
      </View>

      {children}

      <View style={styles.fixedFooter} fixed>
        <Text style={styles.footerBrand}>Viterra Real Estate</Text>
        <Text style={styles.footerMuted}>Documento confidencial · Uso interno</Text>
        <Text
          style={styles.footerMuted}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard} wrap={false}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function KvTable({ sheet }: { sheet: ProfileReportSheet }) {
  if (sheet.rows.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Sin datos</Text>
      </View>
    );
  }
  return (
    <View>
      {sheet.rows.map((row, i) => (
        <View key={i} style={[styles.kvRow, i % 2 === 1 ? styles.kvRowAlt : {}]}>
          <Text style={styles.kvKey}>{String(row[0])}</Text>
          <Text style={styles.kvVal}>{String(row[1] ?? "—")}</Text>
        </View>
      ))}
    </View>
  );
}

function colFlex(count: number, index: number): Style {
  if (count <= 2) return { flex: 1 };
  if (index === 0) return { flex: 2 };
  return { flex: 1 };
}

function DataTable({
  sheet,
  boldFirstCol,
  deltaColIndex,
}: {
  sheet: ProfileReportSheet;
  boldFirstCol?: boolean;
  deltaColIndex?: number;
}) {
  if (sheet.rows.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Sin datos en esta sección</Text>
      </View>
    );
  }

  const colCount = sheet.headers.length;

  return (
    <View>
      <View style={styles.tableHead}>
        {sheet.headers.map((h, i) => (
          <Text key={h} style={[styles.tableHeadCell, colFlex(colCount, i)]}>
            {h}
          </Text>
        ))}
      </View>
      {sheet.rows.slice(0, 24).map((row, ri) => (
        <View key={ri} style={[styles.tableRow, ri % 2 === 1 ? styles.tableRowAlt : {}]}>
          {row.map((cell, ci) => {
            const val = String(cell ?? "—");
            const isDelta = deltaColIndex === ci;
            const deltaKind = isDelta ? parseDelta(val) : null;
            return (
              <Text
                key={ci}
                style={[
                  colFlex(colCount, ci),
                  boldFirstCol && ci === 0 ? styles.tableCellBold : styles.tableCell,
                  deltaKind === "up" ? styles.deltaUp : {},
                  deltaKind === "down" ? styles.deltaDown : {},
                  deltaKind === "neutral" && isDelta ? styles.deltaNeutral : {},
                ]}
              >
                {val}
              </Text>
            );
          })}
        </View>
      ))}
      {sheet.rows.length > 24 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            + {sheet.rows.length - 24} filas más en el archivo Excel
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ProfilePerformanceReportPdf({ user, generatedAt, rangeLabel, sheets }: Props) {
  const role = roleLabelEs(user.role);
  const resumen = findSheet(sheets, "Resumen");
  const resumenMap = sheetToMap(resumen);
  const comparacion = findSheet(sheets, "Comparación mes");
  const equipos = findSheet(sheets, "Equipos");
  const pipeline = findSheet(sheets, "Pipeline etapas");
  const embudo = findSheet(sheets, "Embudo");
  const origenes = findSheet(sheets, "Origen leads");
  const tendencia = findSheet(sheets, "Tendencia 6 meses");
  const metas = findSheet(sheets, "Metas KPI");
  const prioridades = findSheet(sheets, "Prioridades");
  const citas = findSheet(sheets, "Próximas citas");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const logoUrl = `${baseUrl}/images/branding/viterra-logo-icon-red-alpha.png`;

  const kpiCards = [
    { label: "Pipeline activo", value: resumenMap.get("Pipeline activo (leads abiertos)") ?? "0" },
    { label: "Nuevos leads", value: resumenMap.get("Nuevos leads (mes)") ?? "0" },
    { label: "Cierres (mes)", value: resumenMap.get("Cierres (mes)") ?? "0" },
    { label: "Conversión", value: `${resumenMap.get("Conversión (%)") ?? "0"}%` },
    { label: "Sin seguimiento", value: resumenMap.get("Sin seguimiento (+7 días)") ?? "0" },
    { label: "Citas (mes)", value: resumenMap.get("Citas (mes)") ?? "0" },
  ];

  const pipelineValue = resumenMap.get("Valor estimado del pipeline") ?? "—";
  const pipelineNote = resumenMap.get("Nota pipeline") ?? "";

  const hasMetas = (metas?.rows.length ?? 0) > 0;
  const hasPrioridades = (prioridades?.rows.length ?? 0) > 0;
  const hasCitas = (citas?.rows.length ?? 0) > 0;
  const hasFollowUp = hasMetas || hasPrioridades || hasCitas;

  return (
    <Document title={`Reporte de rendimiento — ${user.name}`} author="Viterra CRM">
      {/* Portada */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHero}>
          <View style={styles.coverHeroRow}>
            <View style={{ flexDirection: "row", flex: 1 }}>
              <View style={styles.coverLogoBox}>
                <Image src={logoUrl} style={styles.coverLogo} />
              </View>
              <View style={styles.coverBrandBlock}>
                <Text style={styles.coverBrand}>VITERRA CRM</Text>
                <Text style={styles.coverTitle}>Reporte de rendimiento</Text>
                <Text style={styles.coverSubtitle}>
                  Análisis personal de pipeline, conversión y actividad comercial.
                </Text>
              </View>
            </View>
            <View style={styles.coverDateChip}>
              <Text style={styles.coverDateLabel}>Período</Text>
              <Text style={styles.coverDateValue}>{rangeLabel}</Text>
              <Text style={[styles.coverDateLabel, { marginTop: 6 }]}>Generado</Text>
              <Text style={styles.coverDateValue}>{generatedAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.coverBody}>
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initials(user.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userMeta}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.kpiLabel, { marginBottom: 8 }]}>Indicadores clave del período</Text>
          <View style={styles.kpiGrid}>
            {kpiCards.map((k) => (
              <View key={k.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.kpiCardWide}>
            <Text style={styles.kpiLabel}>Valor estimado del pipeline</Text>
            <Text style={styles.kpiValueSm}>{pipelineValue}</Text>
          </View>

          {pipelineNote ? (
            <View style={styles.callout}>
              <Text style={styles.calloutText}>{pipelineNote}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.fixedFooter} fixed>
          <Text style={styles.footerBrand}>Viterra Real Estate</Text>
          <Text style={styles.footerMuted}>Documento confidencial · Uso interno</Text>
          <Text
            style={styles.footerMuted}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>

      {/* Comparación + equipos */}
      <PageChrome userName={user.name} rangeLabel={rangeLabel}>
        {comparacion ? (
          <SectionCard title="Comparación mensual">
            <DataTable sheet={comparacion} boldFirstCol deltaColIndex={3} />
          </SectionCard>
        ) : null}

        {equipos ? (
          <SectionCard title="Equipos y grupos">
            <DataTable sheet={equipos} boldFirstCol />
          </SectionCard>
        ) : null}

        {resumen ? (
          <SectionCard title="Detalle de métricas">
            <KvTable sheet={resumen} />
          </SectionCard>
        ) : null}
      </PageChrome>

      {/* Pipeline + embudo + orígenes */}
      <PageChrome userName={user.name} rangeLabel={rangeLabel}>
        <View style={styles.twoCol}>
          {pipeline ? (
            <View style={styles.colHalf}>
              <SectionCard title="Pipeline por etapa">
                <DataTable sheet={pipeline} boldFirstCol />
              </SectionCard>
            </View>
          ) : null}
          {origenes ? (
            <View style={styles.colHalfLast}>
              <SectionCard title="Origen de leads">
                <DataTable sheet={origenes} boldFirstCol />
              </SectionCard>
            </View>
          ) : null}
        </View>

        {embudo ? (
          <SectionCard title="Embudo de conversión">
            <DataTable sheet={embudo} boldFirstCol />
          </SectionCard>
        ) : null}
      </PageChrome>

      {/* Tendencia */}
      {tendencia && tendencia.rows.length > 0 ? (
        <PageChrome userName={user.name} rangeLabel={rangeLabel}>
          <SectionCard title="Tendencia — últimos 6 meses">
            <DataTable sheet={tendencia} boldFirstCol />
          </SectionCard>
        </PageChrome>
      ) : null}

      {/* Seguimiento: metas, prioridades, citas */}
      {hasFollowUp ? (
        <PageChrome userName={user.name} rangeLabel={rangeLabel}>
          {hasMetas && metas ? (
            <SectionCard title="Metas KPI">
              <DataTable sheet={metas} boldFirstCol />
            </SectionCard>
          ) : null}

          {hasPrioridades && prioridades ? (
            <SectionCard title="Leads prioritarios">
              <DataTable sheet={prioridades} boldFirstCol />
            </SectionCard>
          ) : null}

          {hasCitas && citas ? (
            <SectionCard title="Próximas citas">
              <DataTable sheet={citas} boldFirstCol />
            </SectionCard>
          ) : null}
        </PageChrome>
      ) : null}
    </Document>
  );
}
