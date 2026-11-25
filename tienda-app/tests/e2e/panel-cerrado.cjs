/* e2e del modo demostración de PRODUCCIÓN: build sin Supabase y sin NEXT_PUBLIC_TIENDA_PANEL_DEMO.
 * El panel queda cerrado y el enlace «Administrar tienda» oculto; la tienda sigue funcionando.
 * Uso: BASE=http://localhost:3300 node tests/e2e/panel-cerrado.cjs */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3300").replace(/\/$/, "");
const T = `${BASE}/tienda`;
let ok = 0;
const fallos = [];
const verificar = (cond, msg) => (cond ? (ok++, console.log(`✓ ${msg}`)) : (fallos.push(msg), console.log(`✗ ${msg}`)));

function chrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const raiz = path.join(os.homedir(), ".cache/ms-playwright");
  const dirs = fs.existsSync(raiz) ? fs.readdirSync(raiz).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const d of dirs) {
    const p = path.join(raiz, d, "chrome-linux64/chrome");
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No encontré Chrome. Define CHROME=/ruta/al/chrome");
}

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  try {
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");
    verificar((await p.$$("[data-grilla] [data-producto]")).length === 20, "la tienda de demostración sigue funcionando (20 ítems)");
    verificar((await p.$$("[data-enlace-admin]")).length === 0, "sin enlace «Administrar tienda» en encabezado ni pie");
    verificar(!(await p.evaluate(() => document.body.innerText)).includes("Administrar tienda"), "el texto «Administrar tienda» no aparece");

    for (const r of ["/admin", "/admin/productos", "/admin/pedidos"]) {
      await p.goto(`${T}${r}`, { waitUntil: "networkidle0" });
      await p.waitForSelector("[data-panel-cerrado]");
      const t = await p.evaluate(() => document.body.innerText);
      verificar(t.includes("Panel no disponible") && t.includes("requiere la base de datos") && !t.includes("Entrar al modo demostración") && !(await p.$("form")), `${r}: panel cerrado, sin acceso al modo demostración`);
    }
    // Aunque alguien fuerce la sesión de demostración en su navegador, el panel sigue cerrado
    await p.evaluate(() => sessionStorage.setItem("sotec-tienda-admin", "1"));
    await p.goto(`${T}/admin`, { waitUntil: "networkidle0" });
    verificar(!!(await p.$("[data-panel-cerrado]")) && !(await p.$("nav[aria-label='Panel']")), "con la sesión de demostración forzada el panel sigue cerrado");
    await p.click("[data-panel-cerrado] a");
    await p.waitForFunction(() => location.pathname === "/tienda");
    verificar(true, "«Volver a la tienda» desde el panel cerrado");
    verificar(errores.length === 0, `sin errores en consola (${errores.slice(0, 3).join(" | ") || "ok"})`);
  } catch (e) {
    fallos.push(`error: ${e.message}`);
    console.log(`✗ error: ${e.stack}`);
  } finally {
    await b.close();
  }
  console.log(`\n${ok} correctas, ${fallos.length} fallos`);
  process.exit(fallos.length ? 1 : 0);
})();
