/**
 * Smoke tests locales (requiere `npm run dev` en otra terminal).
 * Ejecutar: node scripts/smoke-test.mjs
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

const routes = ["/", "/contacto", "/renta", "/venta", "/login", "/nosotros"];

async function check(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const ok = res.ok && res.headers.get("content-type")?.includes("text/html");
  console.log(ok ? "✅" : "❌", path, res.status);
  return ok;
}

async function main() {
  console.log(`Smoke test → ${BASE}\n`);
  let passed = 0;
  for (const path of routes) {
    if (await check(path)) passed += 1;
  }
  console.log(`\n${passed}/${routes.length} rutas públicas OK`);
  process.exit(passed === routes.length ? 0 : 1);
}

main().catch((e) => {
  console.error("¿Está corriendo npm run dev?", e.message);
  process.exit(1);
});
