/* e2e de la tienda en MODO SUPABASE contra un Supabase real (local con `supabase start` o un
 * proyecto de pruebas) y un build de la app con NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.
 * Preparar con `bash scripts/probar-supabase.sh` (aplica la migración, carga las categorías base y
 * crea los usuarios de prueba). Variables:
 *   BASE                 servidor de la app (http://localhost:3300)
 *   SUPABASE_URL         API de Supabase (http://127.0.0.1:54321)
 *   SUPABASE_ANON_KEY    clave pública anon
 *   ADMIN_CORREO / ADMIN_CLAVE   usuario con rol admin
 *   OTRO_CORREO / OTRO_CLAVE     usuario SIN rol admin
 *   MAILPIT_URL          (opcional) buzón de prueba del Supabase local para recuperar la contraseña
 * Recorre: login real, CRUD de marcas/categorías/productos/servicios/banners con imágenes en
 * Storage, pedido anónimo por RPC, y que anon / no-admin no lean pedidos ni escriban catálogo. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3300").replace(/\/$/, "");
const T = `${BASE}/tienda`;
const SB = (process.env.SUPABASE_URL || "http://127.0.0.1:54321").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "";
const ADMIN = { correo: process.env.ADMIN_CORREO || "", clave: process.env.ADMIN_CLAVE || "" };
const OTRO = { correo: process.env.OTRO_CORREO || "", clave: process.env.OTRO_CLAVE || "" };
const MAILPIT = (process.env.MAILPIT_URL || "").replace(/\/$/, ""); // opcional: prueba «¿Olvidaste tu contraseña?»
if (!ANON || !ADMIN.correo || !ADMIN.clave || !OTRO.correo || !OTRO.clave) {
  console.error("Faltan SUPABASE_ANON_KEY, ADMIN_CORREO/ADMIN_CLAVE u OTRO_CORREO/OTRO_CLAVE (ver scripts/probar-supabase.sh)");
  process.exit(2);
}
const IMG = (n) => path.join(__dirname, "../../public/img/categorias", n);
const SUFIJO = Date.now().toString(36).slice(-5);
let ok = 0;
const fallos = [];
const verificar = (cond, msg) => (cond ? (ok++, console.log(`✓ ${msg}`)) : (fallos.push(msg), console.log(`✗ ${msg}`)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// ── API de Supabase directa (lo que haría un atacante con la clave pública)
async function api(ruta, { metodo = "GET", token = ANON, cuerpo, tipo = "application/json", extra = {} } = {}) {
  const r = await fetch(`${SB}${ruta}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, ...(cuerpo !== undefined ? { "Content-Type": tipo } : {}), ...extra },
    body: cuerpo === undefined ? undefined : typeof cuerpo === "string" || cuerpo instanceof Uint8Array ? cuerpo : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    /* no JSON */
  }
  return { status: r.status, json, texto };
}
async function tokenDe(u) {
  const r = await api("/auth/v1/token?grant_type=password", { metodo: "POST", cuerpo: { email: u.correo, password: u.clave } });
  if (!r.json?.access_token) throw new Error(`No pude iniciar sesión como ${u.correo}: ${r.status}`);
  return { token: r.json.access_token, id: r.json.user.id };
}

async function clicTexto(p, texto, sel = "button, a") {
  const h = await p.waitForFunction(
    (t, s) => [...document.querySelectorAll(s)].find((e) => e.textContent.replace(/\s+/g, " ").trim().includes(t) && e.offsetParent !== null),
    { timeout: 10000 },
    texto,
    sel,
  );
  await h.asElement().click();
}
const texto = (p) => p.evaluate(() => document.body.innerText);
const esperarTexto = (p, t, timeout = 10000) => p.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, t);

/** Verifica que una URL de imagen sea de Storage, pública, y del tipo comprimido. */
async function imagenEnStorage(url) {
  if (!url || !url.startsWith(`${SB}/storage/v1/object/public/productos/`)) return { ok: false, motivo: `URL fuera de Storage: ${url}` };
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  const tipo = r.headers.get("content-type") || "";
  return { ok: r.status === 200 && /image\/(webp|jpeg)/.test(tipo) && buf.length > 0 && buf.length <= 350 * 1024, motivo: `${r.status} ${tipo} ${buf.length} B` };
}

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  const errores = [];
  const fallidas = [];
  const vigilar = (pg) => {
    pg.on("pageerror", (e) => errores.push(e.message));
    pg.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    pg.on("response", (r) => r.status() >= 400 && fallidas.push(`${r.status()} ${r.request().method()} ${r.url()}`));
  };
  vigilar(p);
  const espera = { esperados: [] };
  /** Respuestas 4xx esperadas (login fallido) no cuentan como error. */
  const quitarEsperadas = () => {
    for (let i = fallidas.length - 1; i >= 0; i--) if (espera.esperados.some((re) => re.test(fallidas[i]))) fallidas.splice(i, 1);
  };

  const marca = `Marca E2E ${SUFIJO}`;
  const categoria = `Categoría E2E ${SUFIJO}`;
  const producto = `Router E2E ${SUFIJO}`;
  const servicio = `Instalación E2E ${SUFIJO}`;
  const banner = `Banner E2E ${SUFIJO}`;
  const promo = `Promo E2E ${SUFIJO}`;

  try {
    // ── 0. Seguridad por API (clave anon, sin navegador)
    const pedAnon = await api("/rest/v1/pedidos?select=*");
    verificar(pedAnon.status === 200 && Array.isArray(pedAnon.json) && pedAnon.json.length === 0, `anon: GET pedidos devuelve [] (RLS) (${pedAnon.status})`);
    const insAnon = await api("/rest/v1/productos", { metodo: "POST", cuerpo: { id: "prd-hack", nombre: "Hackeado", categoria_id: "cat-redes" } });
    verificar(insAnon.status === 401 || insAnon.status === 403, `anon: no crea productos (${insAnon.status})`);
    const catAnon = await api("/rest/v1/categorias?id=eq.cat-redes", { metodo: "PATCH", cuerpo: { nombre: "Hackeada" }, extra: { Prefer: "return=representation" } });
    verificar(catAnon.status === 401 || (Array.isArray(catAnon.json) && catAnon.json.length === 0), `anon: PATCH a categorías no cambia nada (${catAnon.status})`);
    const banAnon = await api("/rest/v1/banners", { metodo: "POST", cuerpo: { id: "ban-hack", imagen: "/x.webp" } });
    verificar(banAnon.status === 401 || banAnon.status === 403, `anon: no crea banners (${banAnon.status})`);
    const cfgAnon = await api("/rest/v1/configuracion?id=eq.1", { metodo: "PATCH", cuerpo: { whatsapp_hogar: "570000000000" }, extra: { Prefer: "return=representation" } });
    verificar(cfgAnon.status === 401 || (Array.isArray(cfgAnon.json) && cfgAnon.json.length === 0), `anon: no cambia el WhatsApp de la configuración (${cfgAnon.status})`);
    const subAnon = await api("/storage/v1/object/productos/hack.webp", { metodo: "POST", cuerpo: new Uint8Array([1, 2, 3]), tipo: "image/webp" });
    verificar(subAnon.status >= 400, `anon: no sube imágenes a Storage (${subAnon.status})`);
    const registro = await api("/auth/v1/signup", { metodo: "POST", cuerpo: { email: `intruso-${SUFIJO}@ejemplo.test`, password: "ClaveLarga123!" } });
    verificar(registro.status >= 400, `registro público de usuarios deshabilitado (${registro.status})`);

    // Usuario sin rol admin (sesión real)
    const otro = await tokenDe(OTRO);
    const pedOtro = await api("/rest/v1/pedidos?select=*", { token: otro.token });
    verificar(Array.isArray(pedOtro.json) && pedOtro.json.length === 0, "no-admin: no ve pedidos");
    const insOtro = await api("/rest/v1/marcas", { metodo: "POST", token: otro.token, cuerpo: { id: "mar-hack", nombre: "Hack" } });
    verificar(insOtro.status === 401 || insOtro.status === 403, `no-admin: no crea marcas (${insOtro.status})`);
    const ascenso = await api(`/rest/v1/perfiles?id=eq.${otro.id}`, { metodo: "PATCH", token: otro.token, cuerpo: { rol: "admin" }, extra: { Prefer: "return=representation" } });
    const perfilOtro = await api(`/rest/v1/perfiles?id=eq.${otro.id}&select=rol`, { token: otro.token });
    verificar(Array.isArray(ascenso.json) && ascenso.json.length === 0 && perfilOtro.json?.[0]?.rol === "ninguno", "no-admin: no se asciende a admin");
    const subOtro = await api("/storage/v1/object/productos/hack-otro.webp", { metodo: "POST", token: otro.token, cuerpo: new Uint8Array([1, 2, 3]), tipo: "image/webp" });
    verificar(subOtro.status >= 400, `no-admin: no sube imágenes (${subOtro.status})`);

    // ── 1. Panel: acceso
    await p.goto(`${T}/admin`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#correo");
    verificar(!(await p.$("[data-aviso-demo]")) && !(await texto(p)).includes("modo demostración"), "login real (sin aviso de demostración)");
    espera.esperados.push(/400 POST .*\/auth\/v1\/token/);
    await p.type("#correo", ADMIN.correo);
    await p.type("#clave", "clave-incorrecta-123");
    await clicTexto(p, "Entrar", "button[type=submit]");
    await esperarTexto(p, "Correo o contraseña incorrectos.");
    verificar(true, "contraseña incorrecta: «Correo o contraseña incorrectos.»");
    await p.$eval("#correo", (x) => (x.value = ""));
    await p.type("#correo", OTRO.correo);
    await p.$eval("#clave", (x) => (x.value = ""));
    await p.type("#clave", OTRO.clave);
    await clicTexto(p, "Entrar", "button[type=submit]");
    await esperarTexto(p, "Tu usuario no tiene permiso de administrador.");
    verificar(!(await p.$("nav[aria-label='Panel']")), "usuario sin rol admin: rechazado y sin panel");
    await p.reload({ waitUntil: "networkidle0" });
    await p.waitForSelector("#correo");
    verificar(!(await p.$("nav[aria-label='Panel']")), "tras recargar, el no-admin sigue fuera (se cerró su sesión)");

    await p.type("#correo", ADMIN.correo);
    await p.type("#clave", ADMIN.clave);
    await clicTexto(p, "Entrar", "button[type=submit]");
    await p.waitForFunction(() => document.querySelector("h1")?.textContent === "Resumen", { timeout: 15000 });
    verificar((await texto(p)).includes(ADMIN.correo), "admin entra al panel (Resumen con su correo)");
    await p.reload({ waitUntil: "networkidle0" });
    await p.waitForFunction(() => document.querySelector("h1")?.textContent === "Resumen", { timeout: 15000 });
    verificar(true, "la sesión del admin sobrevive a recargar la página");

    // ── 2. Marca con logo (Storage)
    await p.goto(`${T}/admin/marcas`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#nueva-marca");
    await p.type("#nueva-marca", marca);
    await clicTexto(p, "Agregar", "button[type=submit]");
    await esperarTexto(p, `Marca «${marca}» creada.`);
    const idMarca = await p.evaluate((n) => [...document.querySelectorAll("[data-admin-marca]")].find((x) => x.querySelector("input").value === n)?.getAttribute("data-admin-marca"), marca);
    verificar(!!idMarca, `marca creada (${idMarca})`);
    await (await p.$(`[data-subir='marca-${idMarca}']`)).uploadFile(IMG("cableado-switch.webp"));
    await p.waitForSelector(`[data-vista='marca-${idMarca}']`, { timeout: 15000 });
    await p.click(`[data-admin-marca='${idMarca}'] button[aria-label^='Guardar']`);
    await esperarTexto(p, "Guardado.");
    const filaMarca = await api(`/rest/v1/marcas?id=eq.${idMarca}&select=logo`);
    const logo = await imagenEnStorage(filaMarca.json?.[0]?.logo);
    verificar(logo.ok, `logo de la marca subido a Storage y guardado en la base (${logo.motivo})`);

    // ── 3. Categoría con foto
    await p.goto(`${T}/admin/categorias`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#nueva");
    const catsAntes = (await p.$$("[data-admin-categoria]")).length;
    const base = ["cat-computo", "cat-servidores", "cat-redes", "cat-seguridad", "cat-solar", "cat-automatizacion", "cat-impresion", "cat-servicios"];
    const hay = await p.$$eval("[data-admin-categoria]", (xs) => xs.map((x) => x.getAttribute("data-admin-categoria")));
    verificar(base.every((id) => hay.includes(id)), `las 8 categorías base de la migración 0002 están cargadas (${catsAntes} en total)`);
    await p.type("#nueva", categoria);
    await clicTexto(p, "Agregar", "button[type=submit]");
    await p.waitForFunction((n) => document.querySelectorAll("[data-admin-categoria]").length === n, {}, catsAntes + 1);
    const idCat = await p.evaluate((n) => [...document.querySelectorAll("[data-admin-categoria]")].find((x) => x.querySelector("input[id^='n-']").value === n)?.getAttribute("data-admin-categoria"), categoria);
    await (await p.$(`[data-subir='cat-${idCat}']`)).uploadFile(IMG("panel-solar-casa.webp"));
    await p.waitForSelector(`[data-vista='cat-${idCat}']`, { timeout: 15000 });
    await p.click(`[data-admin-categoria='${idCat}'] button[aria-label^='Guardar']`);
    await esperarTexto(p, "Guardado.");
    const filaCat = await api(`/rest/v1/categorias?id=eq.${idCat}&select=imagen,activa`);
    const fotoCat = await imagenEnStorage(filaCat.json?.[0]?.imagen);
    verificar(fotoCat.ok, `categoría nueva con foto en Storage (${fotoCat.motivo})`);

    // ── 4. Producto con oferta, marca y 2 fotos
    await p.goto(`${T}/admin/productos/editar`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#anterior");
    await p.type("#nombre", producto);
    await p.select("#categoria", idCat);
    await p.select("#marca", idMarca);
    await p.type("#precio", "100.000");
    await p.type("#anterior", "150.000");
    await p.type("#descripcion", "Producto creado por la prueba e2e en modo Supabase.");
    const subir = await p.$("[data-subir-fotos]");
    await subir.uploadFile(IMG("cableado-switch.webp"), IMG("techo-solar.webp"));
    await p.waitForFunction(() => document.querySelectorAll("[data-foto] img").length === 2, { timeout: 20000 });
    await clicTexto(p, "Guardar", "button[type=submit]");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos", { timeout: 15000 });
    const filaProd = await api(`/rest/v1/productos?nombre=eq.${encodeURIComponent(producto)}&select=*`);
    const prod = filaProd.json?.[0];
    verificar(prod && Number(prod.precio) === 100000 && Number(prod.precio_anterior) === 150000 && prod.marca_id === idMarca && prod.categoria_id === idCat, "producto guardado en la base con oferta, marca y categoría");
    const fotos = await Promise.all((prod?.imagenes ?? []).map(imagenEnStorage));
    verificar(fotos.length === 2 && fotos.every((f) => f.ok), `2 fotos comprimidas en Storage (${fotos.map((f) => f.motivo).join(" | ")})`);
    const idProd = prod?.id;

    // Servicio
    await p.goto(`${T}/admin/productos/editar?tipo=servicio`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#modalidad");
    await p.type("#nombre", servicio);
    await p.select("#categoria", idCat);
    await p.type("#precio", "250.000");
    await p.type("#modalidad", "Visita técnica");
    await p.type("#incluye", "Visita\nInstalación\nConfiguración");
    await p.click("[data-segmento-editor='empresa']"); // queda solo hogar
    await clicTexto(p, "Guardar", "button[type=submit]");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos", { timeout: 15000 });
    const filaSrv = (await api(`/rest/v1/productos?nombre=eq.${encodeURIComponent(servicio)}&select=*`)).json?.[0];
    verificar(filaSrv?.tipo === "servicio" && filaSrv.modalidad === "Visita técnica" && JSON.stringify(filaSrv.segmentos) === '["hogar"]', "servicio guardado (tipo, modalidad, solo hogar)");
    const idSrv = filaSrv?.id;

    // ── 5. Banner del carrusel y promoción con imagen
    await p.goto(`${T}/admin/banners`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-nuevo-banner]");
    await p.click("[data-nuevo-banner]");
    await p.type("#b-titulo", banner);
    await p.type("#b-texto", "Texto del banner de prueba");
    await p.type("#b-boton", "Ver categoría");
    await (await p.$("[data-subir='escritorio']")).uploadFile(IMG("techo-solar.webp"));
    await p.waitForSelector("[data-vista='escritorio']", { timeout: 15000 });
    await p.select("#b-enlace", `/?categoria=${idCat}`).catch(() => p.select("#b-enlace", "/?tipo=servicio"));
    await clicTexto(p, "Guardar banner");
    await p.waitForFunction((t) => [...document.querySelectorAll("[data-admin-banner]")].some((x) => x.textContent.includes(t)), { timeout: 15000 }, banner);
    await p.waitForSelector("[data-nueva-promo]");
    await p.click("[data-nueva-promo]");
    await p.type("#b-titulo", promo);
    await (await p.$("[data-subir='escritorio']")).uploadFile(IMG("cableado-switch.webp"));
    await p.waitForSelector("[data-vista='escritorio']", { timeout: 15000 });
    await p.select("#b-enlace", "/?tipo=servicio");
    await clicTexto(p, "Guardar banner");
    await p.waitForFunction((t) => [...document.querySelectorAll("[data-admin-banner]")].some((x) => x.textContent.includes(t)), { timeout: 15000 }, promo);
    const filasBan = (await api(`/rest/v1/banners?select=*&titulo=in.(${encodeURIComponent(`"${banner}","${promo}"`)})`)).json ?? [];
    const imgsBan = await Promise.all(filasBan.map((x) => imagenEnStorage(x.imagen)));
    verificar(filasBan.length === 2 && filasBan.some((x) => x.ubicacion === "promo") && imgsBan.every((x) => x.ok), `banner y promoción guardados con imagen en Storage (${filasBan.length})`);

    // ── 6. Configuración: se lee de la base (no se cambian los números)
    await p.goto(`${T}/admin/configuracion`, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => /^[0-9]{10,15}$/.test(document.querySelector("#wa-hogar")?.value || ""));
    const cfgBase = (await api("/rest/v1/configuracion?select=*")).json?.[0];
    const waHogar = await p.$eval("#wa-hogar", (x) => x.value);
    verificar(waHogar === cfgBase?.whatsapp_hogar, `configuración leída de la base (hogar ${waHogar})`);

    // ── 7. Visitante anónimo (contexto limpio): ve todo y hace un pedido
    const ctx = await b.createBrowserContext();
    const v = await ctx.newPage();
    vigilar(v);
    await v.evaluateOnNewDocument(() => {
      window.open = (u) => {
        sessionStorage.setItem("__wa", String(u));
        return { opener: null };
      };
    });
    await v.setViewport({ width: 1366, height: 900 });
    await v.goto(T, { waitUntil: "networkidle0" });
    await v.waitForSelector(`[data-grilla] [data-producto='${idProd}']`, { timeout: 15000 });
    const tarjeta = await v.$eval(`[data-grilla] [data-producto='${idProd}']`, (x) => x.textContent);
    verificar(tarjeta.includes("Oferta -33 %") && tarjeta.includes("$ 150.000") && tarjeta.includes("$ 100.000"), "la tienda pública muestra el producto nuevo como oferta -33 %");
    await v.$eval(`[data-grilla] [data-producto='${idProd}'] img`, (i) => i.scrollIntoView({ block: "center" }));
    await v
      .waitForFunction((id) => { const i = document.querySelector(`[data-grilla] [data-producto='${id}'] img`); return i?.complete && i.naturalWidth > 0; }, { timeout: 10000 }, idProd)
      .catch(() => null);
    const imgOk = await v.$eval(`[data-grilla] [data-producto='${idProd}'] img`, (i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 }));
    verificar(imgOk.ok && imgOk.src.startsWith(`${SB}/storage/v1/object/public/productos/`), "la foto del producto carga desde Storage");
    verificar((await v.$$eval("[data-marca]", (xs) => xs.map((x) => x.getAttribute("data-marca")))).includes(idMarca), "la marca nueva sale en la franja");
    verificar(!!(await v.$(`[data-cat-tarjeta='${idCat}']`)), "la categoría nueva sale en la cinta");
    verificar((await v.$$eval("[data-banner]", (xs) => xs.map((x) => x.textContent))).some((t) => t.includes(banner)), "el banner nuevo sale en el carrusel");
    verificar((await v.$$eval("[data-promo]", (xs) => xs.map((x) => x.textContent))).some((t) => t.includes(promo)), "la promoción nueva sale bajo el carrusel");
    verificar((await v.$$("[data-enlace-admin]")).length === 2, "con Supabase el enlace «Administrar tienda» está visible (encabezado y pie)");

    await v.goto(`${T}/producto/${idSrv}`, { waitUntil: "networkidle0" });
    await v.waitForSelector("[data-incluye]");
    verificar((await v.$$eval("[data-incluye] li", (xs) => xs.length)) === 3, "ficha del servicio con «Qué incluye» desde la base");
    await v.click("[data-agregar-ficha]");
    await v.goto(`${T}/producto/${idProd}`, { waitUntil: "networkidle0" });
    await v.waitForSelector("[data-agregar-ficha]");
    await v.click("[aria-label='Cantidad'] button[aria-label='Más']");
    await v.click("[data-agregar-ficha]");
    await sleep(300);
    await v.goto(`${T}/carrito`, { waitUntil: "networkidle0" });
    await v.waitForSelector("[data-item]");
    await v.type("#nombre", "Cliente Supabase E2E");
    await v.type("#celular", `301${String(Date.now()).slice(-7)}`);
    await v.type("#ciudad", "Cartagena");
    await v.click("label:has([data-segmento-form='hogar'])");
    await clicTexto(v, "Enviar pedido por WhatsApp");
    await v.waitForSelector("[data-pedido-enviado]", { timeout: 15000 });
    const codigo = await v.$eval("[data-codigo]", (e) => e.textContent);
    const u = new URL(await v.evaluate(() => sessionStorage.getItem("__wa")));
    const msj = u.searchParams.get("text") || "";
    verificar(/^T-[A-Z0-9]{6}$/.test(codigo), `pedido anónimo creado por RPC con código ${codigo}`);
    verificar(u.searchParams.get("phone") === cfgBase?.whatsapp_hogar && msj.includes(`*Pedido ${codigo}*`) && msj.includes("*Total productos: $ 200.000*") && msj.includes(servicio), "WhatsApp de hogar con el código, total recalculado y el servicio");
    const pedVisitante = await v.evaluate(async (sb, anon) => (await fetch(`${sb}/rest/v1/pedidos?select=codigo`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } })).json(), SB, ANON);
    verificar(Array.isArray(pedVisitante) && pedVisitante.length === 0, "el visitante no puede leer pedidos (ni el suyo)");

    // RPC con precio manipulado y producto inexistente: la base recalcula
    const rpc = await api("/rest/v1/rpc/crear_pedido", {
      metodo: "POST",
      cuerpo: { p_cliente: { nombre: "Cliente API", celular: `302${String(Date.now()).slice(-7)}`, ciudad: "Cartagena", segmento: "empresa" }, p_items: [{ producto_id: idProd, cantidad: 3, precio: 1 }, { producto_id: "no-existe", cantidad: 1 }] },
    });
    verificar(rpc.status === 200 && Number(rpc.json?.total) === 300000 && rpc.json?.items?.length === 1, `RPC crear_pedido ignora el precio enviado (${rpc.json?.total})`);
    await ctx.close();

    // ── 8. Admin: pedidos y estado
    await p.goto(`${T}/admin/pedidos`, { waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-pedido='${codigo}']`, { timeout: 15000 });
    verificar((await p.$eval(`[data-pedido='${codigo}'] [data-segmento-pedido]`, (x) => x.textContent)) === "Hogar", "el admin ve el pedido con su segmento");
    await p.click(`[data-pedido='${codigo}'] summary`);
    await p.select(`[data-pedido='${codigo}'] [data-cambiar-estado]`, "contactado");
    await p.waitForFunction((c) => document.querySelector(`[data-pedido='${c}'] [data-estado]`)?.textContent === "Contactado", {}, codigo);
    const adm = await tokenDe(ADMIN);
    const estado = (await api(`/rest/v1/pedidos?codigo=eq.${codigo}&select=estado,total`, { token: adm.token })).json?.[0];
    verificar(estado?.estado === "contactado" && Number(estado.total) === 200000, "estado «Contactado» guardado en la base");

    // ── 9. Editar precio y ver el cambio en la tienda
    await p.goto(`${T}/admin/productos/editar?id=${idProd}`, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => (document.querySelector("#precio")?.value || "") !== "");
    await p.$eval("#anterior", (x) => x.focus());
    await p.keyboard.down("Control");
    await p.keyboard.press("A");
    await p.keyboard.up("Control");
    await p.keyboard.press("Backspace");
    await clicTexto(p, "Guardar", "button[type=submit]");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos", { timeout: 15000 });
    const sinOferta = (await api(`/rest/v1/productos?id=eq.${idProd}&select=precio_anterior,imagenes`)).json?.[0];
    verificar(sinOferta && sinOferta.precio_anterior === null && sinOferta.imagenes.length === 2, "editar: quitar la oferta conserva las fotos");

    // ── 10. Borrar todo lo creado (y sus imágenes de Storage)
    const urlsCreadas = [
      filaMarca.json?.[0]?.logo,
      filaCat.json?.[0]?.imagen,
      ...(sinOferta?.imagenes ?? []),
      ...filasBan.map((x) => x.imagen),
    ].filter(Boolean);
    p.on("dialog", (d) => void d.accept());
    await p.goto(`${T}/admin/productos`, { waitUntil: "networkidle0" });
    for (const id of [idProd, idSrv]) {
      await p.waitForSelector(`[data-admin-producto='${id}']`);
      await p.click(`[data-admin-producto='${id}'] button[aria-label^='Eliminar']`);
      await p.waitForFunction((x) => !document.querySelector(`[data-admin-producto='${x}']`), {}, id);
    }
    await p.goto(`${T}/admin/banners`, { waitUntil: "networkidle0" });
    for (const t of [banner, promo]) {
      const id = await p.waitForFunction((x) => [...document.querySelectorAll("[data-admin-banner]")].find((e) => e.textContent.includes(x))?.getAttribute("data-admin-banner"), {}, t).then((h) => h.jsonValue());
      await p.click(`[data-admin-banner='${id}'] button[aria-label^='Eliminar']`);
      await p.waitForFunction((x) => !document.querySelector(`[data-admin-banner='${x}']`), {}, id);
    }
    await p.goto(`${T}/admin/marcas`, { waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-admin-marca='${idMarca}']`);
    await p.click(`[data-admin-marca='${idMarca}'] button[aria-label^='Eliminar']`);
    await p.waitForFunction((x) => !document.querySelector(`[data-admin-marca='${x}']`), {}, idMarca);
    await p.goto(`${T}/admin/categorias`, { waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-admin-categoria='${idCat}']`);
    await p.click(`[data-admin-categoria='${idCat}'] button[aria-label^='Eliminar']`);
    await p.waitForFunction((x) => !document.querySelector(`[data-admin-categoria='${x}']`), {}, idCat);
    const restos = await Promise.all([
      api(`/rest/v1/productos?id=in.(${idProd},${idSrv})&select=id`, { token: adm.token }),
      api(`/rest/v1/marcas?id=eq.${idMarca}&select=id`, { token: adm.token }),
      api(`/rest/v1/categorias?id=eq.${idCat}&select=id`, { token: adm.token }),
      api(`/rest/v1/banners?titulo=like.*E2E%20${SUFIJO}*&select=id`, { token: adm.token }),
    ]);
    verificar(restos.every((r) => Array.isArray(r.json) && r.json.length === 0), "eliminar producto, servicio, banners, marca y categoría (quedan 0 en la base)");
    const estados = await Promise.all(urlsCreadas.map(async (x) => (await fetch(x)).status));
    verificar(urlsCreadas.length === 6 && estados.every((s) => s === 400 || s === 404), `al eliminar, sus ${urlsCreadas.length} imágenes se borran de Storage (${estados.join(",")})`);

    // ── 11. Salir
    await p.goto(`${T}/admin`, { waitUntil: "networkidle0" });
    await clicTexto(p, "Salir");
    await p.waitForSelector("#correo");
    await p.goto(`${T}/admin/pedidos`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#correo");
    verificar(!(await p.$("[data-pedido]")), "tras «Salir» el panel vuelve a pedir usuario");

    // ── 12. «¿Olvidaste tu contraseña?» con el correo real del Supabase local (Mailpit)
    if (MAILPIT) {
      const nueva = `Nueva-${SUFIJO}-Clave9`;
      await p.goto(`${T}/admin`, { waitUntil: "networkidle0" });
      await p.waitForSelector("[data-olvide-clave]");
      await p.click("[data-olvide-clave]");
      await p.waitForSelector("[data-form-recuperar] #correo");
      const desde = Date.now();
      await p.type("[data-form-recuperar] #correo", ADMIN.correo);
      await clicTexto(p, "Enviar enlace", "button[type=submit]");
      await p.waitForSelector("[data-recuperar-enviado]", { timeout: 15000 });
      let correo = null;
      for (let i = 0; i < 30 && !correo; i++) {
        const lista = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${ADMIN.correo}`)}`)).json();
        correo = (lista.messages || []).find((m) => new Date(m.Created).getTime() >= desde - 2000) || null;
        if (!correo) await sleep(500);
      }
      const html = correo ? (await (await fetch(`${MAILPIT}/api/v1/message/${correo.ID}`)).json()).HTML : "";
      const enlace = (html.match(/href="([^"]+)"/) || [])[1]?.replace(/&amp;/g, "&");
      verificar(!!correo && correo.Subject.includes("Tienda SOTEC") && html.includes("Crear una contraseña nueva") && !!enlace, `correo de recuperación en español (${correo?.Subject})`);
      await p.goto(enlace, { waitUntil: "networkidle0" });
      await p.waitForSelector("[data-form-clave]", { timeout: 15000 });
      verificar((await p.evaluate(() => location.pathname)) === "/tienda/admin/clave", "el enlace del correo abre /tienda/admin/clave con sesión");
      await p.type("#nueva", nueva);
      await p.type("#repetir", nueva);
      await clicTexto(p, "Cambiar contraseña", "button[type=submit]");
      await esperarTexto(p, "Contraseña actualizada.");
      await clicTexto(p, "Salir");
      await p.waitForSelector("#correo");
      await p.type("#correo", ADMIN.correo);
      await p.type("#clave", nueva);
      await clicTexto(p, "Entrar", "button[type=submit]");
      // (vuelve a la página donde estaba: /admin/clave)
      await p.waitForSelector("nav[aria-label='Panel']", { timeout: 15000 });
      verificar(true, "entra con la contraseña nueva");
      // Dejarla como estaba (para volver a correr la prueba), desde el menú «Contraseña»
      await clicTexto(p, "Contraseña", "nav a");
      await p.waitForSelector("[data-form-clave]");
      await p.type("#nueva", ADMIN.clave);
      await p.type("#repetir", ADMIN.clave);
      await clicTexto(p, "Cambiar contraseña", "button[type=submit]");
      await esperarTexto(p, "Contraseña actualizada.");
      verificar(!!(await tokenDe(ADMIN)).token, "cambiar la contraseña desde el panel (menú «Contraseña»)");
    }

    quitarEsperadas();
    // (el 400 del intento con contraseña incorrecta es esperado)
    const inesperados = errores.filter((e) => !/status of 400/.test(e));
    verificar(inesperados.length === 0 && errores.length <= 1, `sin errores en consola (${inesperados.slice(0, 3).join(" | ") || "ok"})`);
    verificar(fallidas.length === 0, `sin respuestas 4xx/5xx inesperadas (${fallidas.slice(0, 3).join(" | ") || "ok"})`);
  } catch (e) {
    fallos.push(`error: ${e.message}`);
    console.log(`✗ error: ${e.stack}`);
  } finally {
    await b.close();
  }
  console.log(`\n${ok} correctas, ${fallos.length} fallos`);
  process.exit(fallos.length ? 1 : 0);
})();
