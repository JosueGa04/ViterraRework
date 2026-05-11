import { Outlet } from "react-router";

/**
 * Contenedor de rutas `/admin/*`. La autenticación y la carga de datos viven en {@link AdminWorkspace}.
 */
export function AdminLayout() {
  return <Outlet />;
}
