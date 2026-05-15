import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { Property } from "../PropertyCard";
import type { Development } from "../../data/developments";
import type { User } from "../../contexts/AuthContext";

// Registrar fuentes si se desea usar un estilo diferente, por ahora usaremos Helvetica (por defecto)
// Font.register({ family: 'Roboto', src: 'https://... ' });

const styles = StyleSheet.create({
  page: {
    paddingTop: 130,
    paddingBottom: 70,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    position: "absolute",
    top: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogoContainer: {
    backgroundColor: "#000000",
    padding: 0,
    marginRight: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogo: {
    height: 80,
  },
  headerCompanyInfo: {
    fontSize: 9,
    color: "#0f172a",
    lineHeight: 1.3,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  agentName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  agentEmail: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 6,
  },
  agentBadge: {
    backgroundColor: "#e11d48",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  agentBadgeText: {
    fontSize: 7,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  headerRef: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#64748b",
  },
  pageNumber: {
    position: "absolute",
    right: 40,
    bottom: 30,
    fontSize: 10,
    color: "#94a3b8",
  },
  mainImage: {
    width: "100%",
    height: 350,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 20,
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 24,
    color: "#C8102E",
    fontFamily: "Helvetica-Bold",
  },
  priceSuffix: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 6,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 25,
  },
  featureBadge: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 12,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 10,
  },
  description: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#475569",
    textAlign: "left",
  },
  descriptionContainer: {
    marginTop: 5,
  },
  descriptionHeader: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#475569",
    textAlign: "left",
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 10,
  },
  bulletPoint: {
    width: 15,
    fontSize: 11,
    color: "#475569",
    lineHeight: 1.6,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
    lineHeight: 1.6,
    textAlign: "left",
  },
  galleryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },
  galleryImageWrapper: {
    width: "48%",
    height: 180,
    marginBottom: 15,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 4,
  },
});

const renderDescription = (text: string) => {
  return text.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("*")) {
      return (
        <View key={index} style={styles.bulletRow}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>{trimmed.substring(1).trim()}</Text>
        </View>
      );
    }

    if (trimmed.endsWith(":")) {
      return (
        <Text key={index} style={styles.descriptionHeader}>
          {trimmed}
        </Text>
      );
    }

    return (
      <Text key={index} style={styles.descriptionText}>
        {trimmed}
      </Text>
    );
  });
};

function stripHtml(html: string | undefined): string {
  if (!html) return "Sin descripción disponible.";
  // Reemplazar <br> o <p> con saltos de línea, luego remover el resto de tags
  let text = html.replace(/<br\s*[\/]?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<[^>]+>/g, "");
  // Remover múltiples espacios o saltos de línea vacíos
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.replace(/&nbsp;/g, " ");
  // Formatear asteriscos como viñetas en nuevas líneas si no lo están
  text = text.replace(/([^\n])\s*\*/g, "$1\n*");
  return text.trim();
}

interface FichaTecnicaPdfProps {
  data: Property | Development;
  type: "property" | "development";
  includeLogo: boolean;
  user?: User | null;
}

export function FichaTecnicaPdf({ data, type, includeLogo, user }: FichaTecnicaPdfProps) {
  const isDev = type === "development";
  const p = data as any;

  const title = isDev ? p.name : (p.publicationTitle || p.title);
  const location = isDev ? (p.colony || p.location) : p.location;
  const price = isDev ? p.priceRange : `$${p.price?.toLocaleString()}`;
  const descriptionRaw = isDev ? p.description : (p.richDescription || p.description);
  const descriptionText = stripHtml(descriptionRaw);
  const image = p.image;
  const reference = p.referenceCode || (isDev ? p.tokkoId : undefined);

  const features: string[] = [];
  if (!isDev) {
    if (p.bedrooms) features.push(`${p.bedrooms} Recámaras`);
    if (p.bathrooms) features.push(`${p.bathrooms} Baños`);
    if (p.area) features.push(`${p.area} m²`);
  } else {
    if (p.status) features.push(`Estado: ${p.status}`);
    if (p.units) features.push(`${p.units} Unidades`);
    if (p.deliveryDate) features.push(`Entrega: ${p.deliveryDate}`);
  }

  const gallery = isDev ? p.images : p.galleryImages;
  const hasGallery = Array.isArray(gallery) && gallery.length > 0;

  // React-pdf can use origin
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const logoUrl = `${baseUrl}/images/branding/viterra-logo-icon-red-alpha.png`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header en todas las páginas */}
        <View style={styles.header} fixed>
          {includeLogo ? (
            <>
              <View style={styles.headerLeft}>
                <View style={styles.headerLogoContainer}>
                  <Image src={logoUrl} style={styles.headerLogo} />
                </View>
                <View>
                  <Text style={styles.headerCompanyInfo}>Conmutador: 33 3629-7122</Text>
                  <Text style={styles.headerCompanyInfo}>WhatsApp: 33 3199-1774</Text>
                  <Text style={styles.headerCompanyInfo}>publicidadviterra@gmail.com</Text>
                  <Text style={styles.headerCompanyInfo}>Av. Terranova No. 1455, Col. Providencia</Text>
                  <Text style={styles.headerCompanyInfo}>Guadalajara, Jalisco</Text>
                </View>
              </View>
              {user && (
                <View style={styles.headerRight}>
                  <Text style={styles.agentName}>{user.name}</Text>
                  <Text style={styles.agentEmail}>{user.email}</Text>
                  <View style={styles.agentBadge}>
                    <Text style={styles.agentBadgeText}>AGENTE A CARGO</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.headerTitle}>Ficha Técnica</Text>
              <View style={styles.headerRight}>
                <Text style={styles.headerSubtitle}>{isDev ? "Desarrollo" : "Propiedad"}</Text>
                {reference && <Text style={styles.headerRef}>Ref: {reference}</Text>}
              </View>
            </>
          )}
        </View>

        {/* Portada e Información Principal */}
        {image && <Image src={image} style={styles.mainImage} />}

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.location}>{location}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{price}</Text>
            {!isDev && p.status === "alquiler" && <Text style={styles.priceSuffix}>/ mes</Text>}
          </View>
        </View>

        {features.length > 0 && (
          <View style={styles.featuresContainer}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureBadge}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Descripción (forzamos salto de página para que no quede huérfano) */}
        <View break>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <View style={styles.descriptionContainer}>
            {renderDescription(descriptionText)}
          </View>
        </View>

        {/* Galería de imágenes (salto automático) */}
        {hasGallery && (
          <View break={false} style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Galería de Imágenes</Text>
            <View style={styles.galleryContainer}>
              {gallery.map((img: string, i: number) => {
                // Para no mostrar la principal otra vez si está duplicada
                if (img === image) return null;
                return (
                  <View key={i} style={styles.galleryImageWrapper}>
                    <Image src={img} style={styles.galleryImage} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer y Número de página */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {includeLogo ? "Viterra Real Estate" : "Generado automáticamente"}
          </Text>
        </View>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
