/* e2e de la tienda contra un servidor ya levantado (BASE=http://localhost:3300 por defecto).
 * CAPTURAS=<carpeta> guarda capturas de la portada y la ficha a 390 y 1366 px. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3300").replace(/\/$/, "");
const T = `${BASE}/tienda`;
const CAPTURAS = process.env.CAPTURAS || "";
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
const wa = async (p) => {
  const u = await p.evaluate(() => sessionStorage.getItem("__wa"));
  return u ? new URL(u) : null;
};

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  const errores = [];
  const fallidas = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  p.on("response", (r) => r.status() >= 400 && fallidas.push(`${r.status()} ${r.url()}`));
  // WhatsApp: window.open no abre nada, guarda la URL
  await p.evaluateOnNewDocument(() => {
    window.open = (u) => {
      sessionStorage.setItem("__wa", String(u));
      return { opener: null };
    };
  });

  try {
    // ── 1. Portada
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");
    const n = await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.length);
    verificar(n === 13, `catálogo completo con 13 productos (${n})`);
    verificar((await p.title()).includes("SOTEC"), "título con SOTEC");
    const rotas = await p.$$eval("img", (xs) => xs.filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src));
    verificar(rotas.length === 0, `imágenes cargan bajo /tienda (${rotas.join(", ") || "ok"})`);
    verificar(!!(await p.$("header a[href='https://sotecse.com']")), "enlace de vuelta a sotecse.com");
    verificar(!!(await p.$("[data-beneficios]")) && (await texto(p)).includes("Garantía SOTEC") && (await texto(p)).includes("Asesoría técnica sin costo"), "franja de beneficios");
    const circulos = await p.$$eval("[data-cat-circulo] svg", (xs) => xs.length);
    verificar(circulos === 6, `6 categorías con ícono circular (${circulos})`);
    const filas = await p.$$eval("[data-fila]", (xs) => xs.map((x) => x.getAttribute("data-fila")));
    verificar(filas[0] === "destacados" && filas.includes("cat-solar") && filas.includes("cat-cctv"), `carruseles por categoría (${filas.join(", ")})`);
    verificar(!(await texto(p)).match(/cuotas|env[ií]o gratis/i), "sin cuotas ni envío gratis");

    // Enlaces al panel
    const hrefAdmin = await p.$$eval("[data-enlace-admin]", (xs) => xs.map((x) => `${x.getAttribute("data-enlace-admin")}:${x.getAttribute("href")}`));
    verificar(hrefAdmin.includes("encabezado:/tienda/admin") && hrefAdmin.includes("pie:/tienda/admin"), `«Administrar tienda» en encabezado y pie (${hrefAdmin.join(", ")})`);

    // ── 2. Carrusel de banners
    const slides = await p.$$eval("[data-banner]", (xs) => xs.map((x) => `${x.getAttribute("data-banner")}:${x.getAttribute("aria-hidden")}`));
    verificar(slides.length === 3 && slides[0] === "ban-solar:false", `3 banners, el primero visible (${slides.join(", ")})`);
    verificar(!!(await p.$("[data-pausa]")), "botón para pausar el carrusel");
    await p.click("[data-banner-siguiente]");
    await sleep(700);
    verificar((await p.$eval("[data-banner='ban-cctv']", (x) => x.getAttribute("aria-hidden"))) === "false", "«siguiente» muestra el banner de CCTV");
    await p.focus("[data-banner-siguiente]");
    await p.keyboard.press("ArrowRight");
    await sleep(700);
    verificar((await p.$eval("[data-banner='ban-alarma']", (x) => x.getAttribute("aria-hidden"))) === "false", "flecha → del teclado avanza el carrusel");
    const tabsOcultos = await p.$$eval("[data-banner][aria-hidden='true'] [data-boton-banner]", (xs) => xs.every((x) => x.tabIndex === -1));
    verificar(tabsOcultos, "botones de banners ocultos fuera del orden de tabulación");
    await p.click("[data-banner='ban-alarma'] [data-boton-banner]");
    await p.waitForFunction(() => location.pathname === "/tienda/producto/prd-alarma-kit");
    verificar(true, "el botón del banner lleva al producto");

    // ── 3. Cotizar un solo producto desde la ficha
    await p.waitForSelector("[data-precio-ficha]");
    const galeria = await p.$$eval("[data-galeria] [aria-label^='Ver foto']", (xs) => xs.length);
    verificar(galeria === 2, `galería con miniaturas (${galeria})`);
    await p.click("[aria-label='Cantidad'] button[aria-label='Más']");
    await p.evaluate(() => sessionStorage.removeItem("__wa"));
    await p.click("[data-cotizar]");
    let u = await wa(p);
    let t = u?.searchParams.get("text") || "";
    verificar(u?.searchParams.get("phone") === "573104696060" && t.includes("*Kit de alarma inalámbrica para hogar*") && t.includes("Cantidad: 2 · Precio unitario: $ 1.250.000 · Subtotal: $ 2.500.000"), "«Cotizar ahora» envía solo ese producto con cantidad y subtotal");
    verificar(t.includes("https://sotecse.com/tienda/producto/prd-alarma-kit") && !t.includes("Mis datos"), "mensaje con el enlace del producto, sin pasar por el carrito");
    verificar((await p.$eval("[data-contador]", (e) => e.textContent)) === "0", "cotizar no toca el carrito");
    await p.click("[data-agregar-ficha]");
    await p.waitForFunction(() => document.querySelector("[data-agregar-ficha]")?.textContent.includes("Agregado"));
    verificar((await p.$eval("[data-contador]", (e) => e.textContent)) === "2", "«Agregar al carrito» en la ficha con cantidad 2");

    // ── 4. Filtro y búsqueda
    await p.goto(`${T}/?categoria=cat-cctv#catalogo`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");
    const cctv = await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.map((x) => x.getAttribute("data-producto")));
    verificar(cctv.length === 3 && cctv.every((id) => ["prd-camara-domo", "prd-camara-ptz", "prd-nvr-8"].includes(id)), `filtro CCTV deja 3 productos (${cctv.join(",")})`);
    await p.type("#buscar-escritorio", "ptz");
    await p.keyboard.press("Enter");
    await p.waitForFunction(() => location.search.includes("q=ptz"));
    await p.waitForFunction(() => document.querySelectorAll("[data-grilla] [data-producto]").length === 1);
    verificar(true, "buscador del encabezado filtra el catálogo («ptz» → 1)");
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");

    // ── 5. Agregar desde la tarjeta con feedback
    await p.click("[data-grilla] [data-producto='prd-camara-domo'] [data-agregar]");
    await p.waitForFunction(() => document.querySelector("[data-grilla] [data-producto='prd-camara-domo'] [data-agregar]")?.textContent.includes("¡Agregado!"));
    verificar(true, "tarjeta muestra «¡Agregado!»");
    await p.click("[data-grilla] [data-producto='prd-camara-ptz'] [data-agregar]");
    await sleep(200);
    verificar((await p.$eval("[data-contador]", (e) => e.textContent)) === "4", "contador del carrito = 4 (2 kit + domo + PTZ)");
    const etiquetas = await p.$eval("[data-grilla] [data-producto='prd-camara-ptz']", (x) => x.textContent);
    verificar(etiquetas.includes("Precio a cotizar"), "etiqueta «Precio a cotizar»");
    verificar((await p.$eval("[data-grilla] [data-producto='prd-panel-550']", (x) => x.textContent)).includes("Más vendido"), "etiqueta «Más vendido»");
    verificar((await p.$eval("[data-grilla] [data-producto='prd-bateria-5kwh']", (x) => x.textContent)).includes("Nuevo"), "etiqueta «Nuevo»");

    // ── 6. Carrito lateral (drawer)
    await p.click("[data-abrir-carrito]");
    await p.waitForSelector("[data-carrito-lateral]");
    verificar(await p.evaluate(() => document.activeElement?.hasAttribute("data-cerrar-carrito")), "drawer abre con el foco en «Cerrar»");
    verificar((await p.$$("[data-item-lateral]")).length === 3, "drawer con 3 productos");
    for (let k = 0; k < 25; k++) await p.keyboard.press("Tab");
    verificar(await p.evaluate(() => !!document.activeElement?.closest("[data-carrito-lateral]")), "Tab mantiene el foco dentro del drawer");
    await p.keyboard.down("Shift");
    for (let k = 0; k < 25; k++) await p.keyboard.press("Tab");
    await p.keyboard.up("Shift");
    verificar(await p.evaluate(() => !!document.activeElement?.closest("[data-carrito-lateral]")), "Shift+Tab mantiene el foco dentro del drawer");
    await p.keyboard.press("Escape");
    await sleep(200);
    verificar(!(await p.$("[data-carrito-lateral]")) && (await p.evaluate(() => document.activeElement?.hasAttribute("data-abrir-carrito"))), "Escape cierra y el foco vuelve al botón del carrito");
    await p.click("[data-abrir-carrito]");
    await p.waitForSelector("[data-item-lateral='prd-camara-domo']");
    await p.click("[data-item-lateral='prd-camara-domo'] button[aria-label='Más']");
    await sleep(200);
    const totalLat = await p.$eval("[data-total-lateral]", (e) => e.textContent);
    verificar(totalLat === "$ 3.140.000", `drawer: cambiar cantidad actualiza el total (${totalLat})`);
    await p.click("[data-ir-formulario]");
    await p.waitForFunction(() => location.pathname === "/tienda/carrito" && location.hash === "#datos");
    await p.waitForFunction(() => document.activeElement?.id === "nombre", { timeout: 5000 }).catch(() => null);
    verificar(await p.evaluate(() => document.activeElement?.id === "nombre"), "«Enviar pedido por WhatsApp» lleva al formulario con el foco en Nombre");

    // ── 7. Página /carrito y envío del pedido
    verificar((await p.$$("[data-item]")).length === 3, "/carrito sigue disponible con los 3 productos");
    const total = await p.$eval("[data-total]", (e) => e.textContent);
    verificar(total === "$ 3.140.000", `total $ 3.140.000 (${total})`);
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await sleep(300);
    verificar((await texto(p)).includes("Escribe tu nombre completo"), "valida campos obligatorios");
    await p.type("#nombre", "Cliente Ficticio de Prueba");
    await p.type("#celular", "300 123 4567");
    await p.type("#ciudad", "Cartagena");
    await p.type("#nota", "Instalación en oficina");
    await p.evaluate(() => sessionStorage.removeItem("__wa"));
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await p.waitForSelector("[data-pedido-enviado]", { timeout: 10000 });
    const codigo = await p.$eval("[data-codigo]", (e) => e.textContent);
    u = await wa(p);
    t = u?.searchParams.get("text") || "";
    verificar(u && u.origin + u.pathname === "https://api.whatsapp.com/send" && u.searchParams.get("phone") === "573104696060", "pedido abre api.whatsapp.com al 573104696060");
    verificar(t.includes(`*Pedido ${codigo}*`) && t.includes("Cantidad: 2 · Precio unitario: $ 320.000 · Subtotal: $ 640.000") && t.includes("Kit de alarma inalámbrica para hogar"), `mensaje del pedido ${codigo} con el detalle`);
    verificar(t.includes("*Total: $ 3.140.000* (+ 1 producto a cotizar)") && t.includes("Nombre: Cliente Ficticio de Prueba"), "mensaje con total y datos del cliente");
    verificar((await p.$eval("[data-contador]", (e) => e.textContent)) === "0", "carrito queda vacío");

    // ── 8. Panel: enlace, producto con foto, banner, ícono, pedido
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.click("[data-enlace-admin='encabezado']");
    await p.waitForFunction(() => location.pathname === "/tienda/admin");
    verificar(!!(await p.waitForSelector("[data-aviso-demo]")), "el enlace del encabezado abre el panel (con aviso de demostración)");
    await clicTexto(p, "Entrar al modo demostración");
    await p.waitForFunction(() => document.querySelector("h1")?.textContent === "Resumen");
    verificar((await texto(p)).includes(codigo), "el resumen muestra el pedido nuevo");

    await p.goto(`${T}/admin/productos/editar`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-editor-producto] #nombre");
    await p.type("#nombre", "Reflector solar LED de prueba");
    await p.select("#categoria", "cat-solar");
    await p.type("#precio", "185.000");
    await p.type("#descripcion", "Reflector para exteriores con panel incluido.");
    await (await p.$("[data-subir-fotos]")).uploadFile(path.join(__dirname, "../../public/img/logo-sotec.png"));
    await p.waitForSelector("[data-foto] img", { timeout: 15000 });
    const foto = await p.$eval("[data-foto] img", (i) => i.src);
    verificar(/^data:image\/(webp|jpeg);base64,/.test(foto), `foto comprimida (${Math.round(foto.length / 1024)} KB base64)`);
    await clicTexto(p, "«Nuevo»", "label");
    await clicTexto(p, "Guardar producto");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos");

    await p.goto(`${T}/admin/banners`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-admin-banner]");
    verificar((await p.$$("[data-admin-banner]")).length === 3, "sección Banners con los 3 de ejemplo");
    await p.click("[data-nuevo-banner]");
    await p.type("#b-titulo", "Promoción de prueba");
    await p.type("#b-texto", "Banner creado desde el panel");
    await (await p.$("[data-subir='escritorio']")).uploadFile(path.join(__dirname, "../../public/img/categorias/techo-solar.webp"));
    await p.waitForSelector("[data-vista='escritorio']", { timeout: 15000 });
    await p.select("#b-enlace", "/?categoria=cat-solar");
    await p.focus("#b-orden");
    await p.keyboard.down("Control");
    await p.keyboard.press("A");
    await p.keyboard.up("Control");
    await p.keyboard.type("0");
    verificar((await p.$eval("#b-orden", (x) => x.value)) === "0", "orden del banner = 0");
    await clicTexto(p, "Guardar banner");
    await p.waitForFunction(() => document.querySelectorAll("[data-admin-banner]").length === 4);
    verificar(true, "banner nuevo guardado");

    await p.goto(`${T}/admin/categorias`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-admin-categoria='cat-redes'] [data-icono]");
    await p.select("[data-admin-categoria='cat-redes'] [data-icono]", "wifi");
    await p.click("[data-admin-categoria='cat-redes'] button[aria-label^='Guardar']");
    await p.waitForFunction(() => document.body.innerText.includes("Guardado."));

    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-banner]");
    const primero = await p.$eval("[data-banner]", (x) => x.textContent);
    verificar(primero.includes("Promoción de prueba"), "el banner nuevo aparece primero en el carrusel");
    const card = await p.evaluate(() => [...document.querySelectorAll("[data-grilla] [data-producto]")].find((a) => a.textContent.includes("Reflector solar LED de prueba"))?.textContent || "");
    verificar(card.includes("$ 185.000") && card.includes("Nuevo"), "producto nuevo en el catálogo con precio y etiqueta «Nuevo»");
    const icono = await p.$eval("[data-cat-circulo='cat-redes'] svg", (s) => s.getAttribute("class"));
    verificar(/lucide-wifi/.test(icono || ""), `ícono de categoría elegido en el panel (${icono})`);

    await p.goto(`${T}/admin/pedidos`, { waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-pedido='${codigo}']`);
    await p.click(`[data-pedido='${codigo}'] summary`);
    await p.select(`[data-pedido='${codigo}'] [data-cambiar-estado]`, "vendido");
    await p.waitForFunction((c) => document.querySelector(`[data-pedido='${c}'] [data-estado]`)?.textContent === "Vendido", {}, codigo);
    await p.reload({ waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-pedido='${codigo}']`);
    verificar((await p.$eval(`[data-pedido='${codigo}'] [data-estado]`, (e) => e.textContent)) === "Vendido", "estado «Vendido» persiste al recargar");

    // Enlace del pie
    await p.goto(`${T}/carrito`, { waitUntil: "networkidle0" });
    await p.click("[data-enlace-admin='pie']");
    await p.waitForFunction(() => location.pathname === "/tienda/admin");
    verificar(true, "el enlace del pie lleva al panel");

    // ── 9. Responsive: 6 anchos sin scroll horizontal
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-agregar]");
    await p.click("[data-grilla] [data-producto='prd-kit-solar-3kw'] [data-agregar]");
    const anchos = [360, 390, 768, 1024, 1366, 1920];
    const rutas = ["", "/producto/prd-panel-550", "/carrito", "/admin", "/admin/banners", "/admin/productos/editar"];
    for (const w of anchos) {
      await p.setViewport({ width: w, height: 900, isMobile: w < 768, hasTouch: w < 768 });
      const malas = [];
      for (const r of rutas) {
        await p.goto(`${T}${r}`, { waitUntil: "networkidle0" });
        await sleep(250);
        const sw = await p.evaluate(() => document.documentElement.scrollWidth);
        if (sw > w) malas.push(`${r || "/"}=${sw}`);
      }
      verificar(malas.length === 0, `${w}px sin scroll horizontal en ${rutas.length} vistas${malas.length ? ` (${malas.join(", ")})` : ""}`);
    }
    // Banner: el texto no choca con las flechas; beneficios compactos en móvil
    for (const w of [640, 768, 1024, 1366, 1920]) {
      await p.setViewport({ width: w, height: 900 });
      await p.goto(T, { waitUntil: "networkidle0" });
      await p.waitForSelector("[data-banner] [data-texto-banner]");
      const g = await p.evaluate(() => {
        const s = document.querySelector("[data-banner][aria-hidden='false']");
        const t = s.querySelector("[data-texto-banner]").getBoundingClientRect();
        const a = document.querySelector("[data-banner-anterior]").getBoundingClientRect();
        const n = document.querySelector("[data-banner-siguiente]").getBoundingClientRect();
        return { textoIzq: Math.round(t.left), textoDer: Math.round(t.right), flechaIzq: Math.round(a.right), flechaDer: Math.round(n.left) };
      });
      verificar(g.textoIzq >= g.flechaIzq + 8 && g.textoDer <= g.flechaDer - 8, `${w}px: texto del banner libre de las flechas (${JSON.stringify(g)})`);
    }
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-beneficios]");
    const altoBen = await p.$eval("[data-beneficios]", (x) => Math.round(x.getBoundingClientRect().height));
    verificar(altoBen <= 260, `390px: beneficios compactos en 2×2 (${altoBen}px de alto)`);

    // Drawer y barra inferior en móvil
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(`${T}/producto/prd-panel-550`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-barra-movil]");
    const barra = await p.$eval("[data-barra-movil]", (x) => { const r = x.getBoundingClientRect(); return { abajo: Math.round(r.bottom), visible: getComputedStyle(x).display !== "none" }; });
    verificar(barra.visible && barra.abajo === 844, `móvil: barra inferior fija con los botones (${JSON.stringify(barra)})`);
    await p.click("[data-agregar-barra]");
    await p.click("[data-abrir-carrito]");
    await p.waitForSelector("[data-carrito-lateral]");
    const anchoDrawer = await p.$eval("[data-carrito-lateral]", (x) => Math.round(x.getBoundingClientRect().width));
    verificar(anchoDrawer === 390 && (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, `móvil: drawer a todo el ancho (${anchoDrawer})`);
    await p.keyboard.press("Escape");
    await p.setViewport({ width: 768, height: 1024 });
    await p.click("[data-abrir-carrito]");
    await p.waitForSelector("[data-carrito-lateral]");
    const anchoTablet = await p.$eval("[data-carrito-lateral]", (x) => Math.round(x.getBoundingClientRect().width));
    verificar(anchoTablet === 448, `tablet: drawer lateral de 448 px (${anchoTablet})`);
    await p.keyboard.press("Escape");

    // Honeypot
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(`${T}/carrito`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-item]");
    await p.evaluate(() => (document.getElementById("sitio_web").value = "http://spam"));
    await p.type("#nombre", "Bot Ficticio");
    await p.type("#celular", "3009999999");
    await p.type("#ciudad", "Bogotá");
    await p.evaluate(() => sessionStorage.removeItem("__wa"));
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await p.waitForSelector("[data-pedido-enviado]");
    verificar((await p.evaluate(() => sessionStorage.getItem("__wa"))) === null, "honeypot: no abre WhatsApp ni guarda pedido");

    // Reducir movimiento: el carrusel no avanza solo
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-banner]");
    verificar(!(await p.$("[data-pausa]")), "con «reducir movimiento» el carrusel no rota solo (sin botón de pausa)");
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

    // Manifest
    const man = await p.evaluate(async () => {
      const href = document.querySelector("link[rel=manifest]")?.getAttribute("href");
      const r = await fetch(href);
      return { href, status: r.status, start: (await r.json()).start_url };
    });
    verificar(man.href === "/tienda/manifest.webmanifest" && man.status === 200 && man.start === "/tienda", "manifest enlazado bajo /tienda");

    // ── Capturas
    if (CAPTURAS) {
      fs.mkdirSync(CAPTURAS, { recursive: true });
      // Contexto limpio: las capturas muestran el catálogo de ejemplo, no los datos de la prueba
      const ctx = await b.createBrowserContext();
      const p2 = await ctx.newPage();
      for (const w of [390, 1366]) {
        const alto = w < 768 ? 844 : 768;
        await p2.setViewport({ width: w, height: alto, isMobile: w < 768, hasTouch: w < 768 });
        await p2.goto(T, { waitUntil: "networkidle0" });
        await p2.waitForSelector("[data-grilla] [data-producto]");
        await sleep(600);
        await p2.screenshot({ path: path.join(CAPTURAS, `portada-${w}-arriba.png`) });
        await p2.evaluate((y) => window.scrollTo(0, y), alto);
        await sleep(900);
        await p2.screenshot({ path: path.join(CAPTURAS, `portada-${w}-abajo.png`) });
      }
      await ctx.close();
      console.log(`capturas en ${CAPTURAS}`);
    }

    verificar(errores.length === 0, `sin errores en consola (${errores.slice(0, 3).join(" | ") || "ok"})`);
    verificar(fallidas.length === 0, `sin respuestas 4xx/5xx (${fallidas.slice(0, 3).join(" | ") || "ok"})`);
  } catch (e) {
    fallos.push(`error: ${e.message}`);
    console.log(`✗ error: ${e.stack}`);
  } finally {
    await b.close();
  }
  console.log(`\n${ok} correctas, ${fallos.length} fallos`);
  process.exit(fallos.length ? 1 : 0);
})();
