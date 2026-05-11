import { createBrowserRouter, Navigate } from "react-router";
import type { ComponentType } from "react";
import { RootLayout } from "./RootLayout";
import { AdminLayout } from "./pages/admin/AdminLayout";

const lazyPage = (loader: () => Promise<{ [key: string]: unknown }>, exportName: string) => async () => {
  const mod = await loader();
  const Component = mod[exportName];
  if (!Component) {
    throw new Error(`No se encontró export "${exportName}" en módulo de ruta.`);
  }
  return { Component: Component as ComponentType };
};

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        lazy: lazyPage(() => import("./pages/HomePage"), "HomePage"),
      },
      {
        path: "/renta",
        lazy: lazyPage(() => import("./pages/RentPage"), "RentPage"),
      },
      {
        path: "/venta",
        lazy: lazyPage(() => import("./pages/SalePage"), "SalePage"),
      },
      {
        path: "/servicios",
        lazy: lazyPage(() => import("./pages/ServicesPage"), "ServicesPage"),
      },
      {
        path: "/propiedades/mapa",
        lazy: lazyPage(() => import("./pages/MapSearchPage"), "MapSearchPage"),
      },
      {
        path: "/propiedades",
        lazy: lazyPage(() => import("./pages/PropertiesRedirectPage"), "PropertiesRedirectPage"),
      },
      {
        path: "/propiedades/:id",
        lazy: lazyPage(() => import("./pages/PropertyDetailPage"), "PropertyDetailPage"),
      },
      {
        path: "/desarrollos",
        lazy: lazyPage(() => import("./pages/DevelopmentsPage"), "DevelopmentsPage"),
      },
      {
        path: "/desarrollos/:id",
        lazy: lazyPage(() => import("./pages/DevelopmentDetailPage"), "DevelopmentDetailPage"),
      },
      {
        path: "/nosotros",
        lazy: lazyPage(() => import("./pages/AboutPage"), "AboutPage"),
      },
      {
        path: "/contacto",
        lazy: lazyPage(() => import("./pages/ContactPage"), "ContactPage"),
      },
      {
        path: "/login",
        lazy: lazyPage(() => import("./pages/LoginPage"), "LoginPage"),
      },
      {
        path: "/admin/cambiar-contrasena",
        lazy: lazyPage(() => import("./pages/FirstLoginChangePasswordPage"), "FirstLoginChangePasswordPage"),
      },
      {
        path: "/admin",
        /** Contenedor mínimo: eager para que al refrescar no espere un chunk vacío antes del workspace. */
        Component: AdminLayout,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          {
            path: "*",
            lazy: lazyPage(() => import("./pages/admin/AdminWorkspace"), "AdminWorkspace"),
          },
        ],
      },
      {
        path: "*",
        lazy: lazyPage(() => import("./pages/NotFoundPage"), "NotFoundPage"),
      },
    ],
  },
]);
