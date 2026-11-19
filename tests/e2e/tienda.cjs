/* e2e de la tienda contra un servidor ya levantado (BASE=http://localhost:3300 por defecto).
 * CAPTURAS=<carpeta> guarda capturas de viewport de la portada y de la ficha de un servicio. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3300").replace(/\/$/, "");
const T = `${BASE}/tienda`;
const CAPTURAS = process.env.CAPTURAS || "";
const WA_HOGAR = "573001110000";
const WA_EMPRESA = "573002220000";
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
const limpiarWa = (p) => p.evaluate(() => sessionStorage.removeItem("__wa"));
const contador = (p) => p.$eval("[data-contador]", (e) => e.textContent);
const ids = (p, sel) => p.$$eval(sel, (xs) => xs.map((x) => x.getAttribute("data-producto")));
async function escribirNumero(p, sel, valor) {
  await p.focus(sel);
  await p.keyboard.down("Control");
  await p.keyboard.press("A");
  await p.keyboard.up("Control");
  await p.keyboard.type(valor);
}

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  const errores = [];
  const fallidas = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  p.on("response", (r) => r.status() >= 400 && fallidas.push(`${r.status()} ${r.url()}`));
  await p.evaluateOnNewDocument(() => {
    window.open = (u) => {
      sessionStorage.setItem("__wa", String(u));
      return { opener: null };
    };
  });

  try {
    // Números distintos por segmento (lo demás sale de la semilla)
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.evaluate((h, e) => localStorage.setItem("sotec-tienda-v2", JSON.stringify({ config: { whatsappHogar: h, whatsappEmpresa: e } })), WA_HOGAR, WA_EMPRESA);
    await p.reload({ waitUntil: "networkidle0" });

    // ── 1. Portada
    await p.waitForSelector("[data-grilla] [data-producto]");
    const n = (await ids(p, "[data-grilla] [data-producto]")).length;
    verificar(n === 20, `catálogo de ejemplo con 20 productos y servicios (${n})`);
    const tipos = await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.filter((x) => x.dataset.tipo === "servicio").length);
    verificar(tipos === 6, `6 servicios en el catálogo (${tipos})`);
    verificar(!!(await p.$("[data-barra-contacto]")) && (await p.$eval("[data-barra-contacto]", (x) => getComputedStyle(x).display !== "none")) && (await texto(p)).includes("¿Necesitas ayuda? Escríbenos por WhatsApp"), "barra superior de contacto en escritorio");
    verificar(!(await texto(p)).match(/cuotas|env[ií]o gratis/i), "sin cuotas ni envío gratis");
    const tarjetasCat = await p.$$eval("[data-cat-tarjeta]", (xs) => xs.length);
    const conIcono = await p.$$eval("[data-cat-tarjeta] [data-cat-icono]", (xs) => xs.length);
    verificar(tarjetasCat === 8 && conIcono === 2, `8 categorías como tarjetas; sin foto muestran el ícono (${conIcono})`);
    // Cinta de categorías
    const tx = () => p.$eval("[data-cinta-pista]", (x) => new DOMMatrix(getComputedStyle(x).transform).m41);
    verificar((await p.$eval("[data-cinta]", (x) => x.dataset.cinta)) === "animada", "la cinta de categorías se anima (no caben en el ancho)");
    const copia = await p.$eval("[data-cinta-copia]", (x) => ({ hidden: x.getAttribute("aria-hidden"), inert: x.hasAttribute("inert"), tabs: [...x.querySelectorAll("a")].every((a) => a.tabIndex === -1) }));
    verificar(copia.hidden === "true" && copia.inert && copia.tabs, "la copia del bucle es aria-hidden, inert y sin tabulación");
    verificar(await p.$eval("[data-cinta]", (x) => getComputedStyle(x).maskImage.includes("gradient") || getComputedStyle(x).webkitMaskImage.includes("gradient")), "bordes con desvanecido (mask-image)");
    await p.mouse.move(5, 5);
    const t0 = await tx();
    await sleep(1200);
    const t1 = await tx();
    verificar(t1 < t0 - 5, `la cinta se mueve a la izquierda (${Math.round(t0)} → ${Math.round(t1)})`);
    const quieta = async () => {
      const a = await tx();
      await sleep(700);
      return Math.abs((await tx()) - a) < 0.5;
    };
    await p.hover("[data-cinta] [data-cat-tarjeta='cat-solar']");
    await sleep(150);
    verificar(await quieta(), "se pausa con el mouse encima");
    await p.mouse.move(5, 5);
    await p.focus("[data-cinta] [data-cat-tarjeta='cat-redes']");
    await sleep(150);
    verificar(await quieta(), "se pausa al enfocar con el teclado");
    await p.evaluate(() => document.activeElement.blur());
    await sleep(300);
    verificar(!(await quieta()), "se reanuda al quitar el foco");
    await p.focus("[data-pausa-categorias]");
    await p.keyboard.press("Enter");
    await sleep(150);
    verificar((await p.$eval("[data-pausa-categorias]", (x) => x.getAttribute("aria-pressed"))) === "true" && (await quieta()), "botón «Pausar» (teclado) la detiene");
    await p.keyboard.press("Enter");
    await sleep(150);
    verificar((await p.$eval("[data-pausa-categorias]", (x) => x.getAttribute("aria-label"))).startsWith("Pausar") && !(await quieta()), "botón «Reanudar» la vuelve a mover");
    await p.evaluate(() => document.activeElement.blur());

    const filas = await p.$$eval("[data-fila]", (xs) => xs.map((x) => x.getAttribute("data-fila")));
    verificar(filas.join() === "ofertas,destacados,servicios,cat-computo,cat-redes,cat-seguridad,cat-servicios", `7 carruseles: solo los que tienen 3+ ítems (${filas.join(", ")})`);
    verificar(!filas.includes("cat-impresion") && !!(await p.$("[data-cinta] [data-cat-tarjeta='cat-impresion']")) && (await ids(p, "[data-grilla] [data-producto]")).includes("ej-impresora"), "«Impresión y periféricos» (1 ítem) no tiene carrusel pero sigue en la cinta y el catálogo");
    const hrefAdmin = await p.$$eval("[data-enlace-admin]", (xs) => xs.map((x) => `${x.getAttribute("data-enlace-admin")}:${x.getAttribute("href")}`));
    verificar(hrefAdmin.includes("encabezado:/tienda/admin") && hrefAdmin.includes("pie:/tienda/admin"), "«Administrar tienda» en encabezado y pie");
    const sinFoto = await p.$$eval("[data-grilla] [data-producto='ej-portatil-14'] [data-sin-foto] svg", (xs) => xs.length);
    verificar(sinFoto === 1, "producto sin foto muestra el ícono de su categoría (sin texto en imagen)");

    // ── 2. Oferta y etiquetas
    const oferta = await p.$eval("[data-grilla] [data-producto='ej-portatil-14']", (x) => ({ t: x.textContent, ant: x.querySelector("[data-precio-anterior]")?.textContent, tag: x.querySelector("s")?.tagName }));
    verificar(oferta.t.includes("Oferta -12 %") && oferta.ant.includes("$ 3.290.000") && oferta.tag === "S" && oferta.t.includes("$ 2.890.000"), "oferta: «Oferta -12 %», precio anterior tachado y precio actual");
    const srv = await p.$eval("[data-grilla] [data-producto='ej-srv-mantenimiento']", (x) => x.textContent);
    verificar(srv.includes("Servicio") && srv.includes("Desde$ 120.000") && srv.includes("Por equipo") && srv.includes("Solicitar"), "tarjeta de servicio: etiqueta, «Desde», modalidad y «Solicitar»");
    verificar((await p.$eval("[data-grilla] [data-producto='ej-srv-mant-cctv']", (x) => x.textContent)).includes("A cotizar"), "servicio sin precio: «A cotizar»");

    // ── 3. Carrusel y promociones
    const slides = await p.$$eval("[data-banner]", (xs) => xs.length);
    verificar(slides === 3, `carrusel con 3 banners (${slides})`);
    await p.evaluate(() => window.scrollTo(0, 0));
    await sleep(200);
    // (el carrusel pudo avanzar solo durante las pruebas anteriores: ir directo al banner 2)
    await p.click("[data-carrusel-banners] button[aria-label='Ir al banner 2']");
    await p.waitForFunction(() => document.querySelector("[data-banner='ej-ban-seguridad']")?.getAttribute("aria-hidden") === "false");
    await p.click("[data-banner-siguiente]");
    await p.waitForFunction(() => document.querySelector("[data-banner='ej-ban-redes']")?.getAttribute("aria-hidden") === "false");
    verificar(true, "flecha «siguiente» del carrusel");
    await p.click("[data-carrusel-banners] button[aria-label='Ir al banner 2']");
    await sleep(700);
    await p.click("[data-banner='ej-ban-seguridad'] [data-boton-banner]");
    await p.waitForFunction(() => location.search.includes("categoria=cat-seguridad"));
    await p.waitForFunction(() => document.querySelectorAll("[data-grilla] [data-producto]").length === 4);
    verificar(true, "banner «Ver seguridad» filtra la categoría (4)");
    await p.goto(T, { waitUntil: "networkidle0" });
    const promos = await p.$$eval("[data-promo]", (xs) => xs.map((x) => x.getAttribute("data-promo")));
    verificar(promos.length === 3, `3 promociones bajo el carrusel (${promos.join(", ")})`);
    await p.click("[data-promo='ej-promo-cctv']");
    await p.waitForFunction(() => location.pathname === "/tienda/producto/ej-kit-cctv");
    verificar(true, "la promoción lleva al producto");

    // ── 4. Segmento, tipo y marca
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.click("[data-segmento='empresa']");
    await p.waitForFunction(() => location.search.includes("segmento=empresa"));
    await sleep(400);
    const empresa = await ids(p, "[data-grilla] [data-producto]");
    verificar(empresa.length > 0 && !empresa.includes("ej-kit-alarma") && empresa.includes("ej-servidor-rack") && empresa.includes("ej-panel-550"), `«Para empresas» filtra el catálogo (${empresa.length})`);
    const filaSeg = await ids(p, "[data-fila='cat-seguridad'] [data-producto]");
    verificar(filaSeg.length === 3 && !filaSeg.includes("ej-kit-alarma"), `los carruseles también respetan el segmento (${filaSeg.join(",")})`);
    await p.click("[data-segmento='todo']");
    await p.waitForFunction(() => !location.search.includes("segmento"));
    await p.waitForSelector("[data-filtro='tipo-servicio']");
    await p.click("[data-filtro='tipo-servicio']");
    await p.waitForFunction(() => location.search.includes("tipo=servicio"));
    await sleep(300);
    verificar(await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.length === 6 && xs.every((x) => x.dataset.tipo === "servicio")), "filtro «Servicios» deja solo servicios (6)");
    await p.click("[data-quitar-filtros]");
    await sleep(300);
    const marcas = await p.$$eval("[data-marca]", (xs) => xs.map((x) => x.textContent));
    verificar(marcas.length === 4 && marcas.every((m) => m.startsWith("Ejemplo")), `franja de marcas de ejemplo (${marcas.join(", ")})`);
    await p.click("[data-marca='mar-alfa']");
    await p.waitForFunction(() => location.search.includes("marca=mar-alfa"));
    await sleep(300);
    verificar((await ids(p, "[data-grilla] [data-producto]")).join() === "ej-portatil-14,ej-nas-4,ej-kit-cctv", "la marca filtra el catálogo (3)");

    // ── 5. Ficha de un servicio
    await p.goto(`${T}/producto/ej-srv-mantenimiento`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-incluye]");
    const ficha = await texto(p);
    verificar(ficha.includes("Qué incluye") && (await p.$$eval("[data-incluye] li", (xs) => xs.length)) === 4 && ficha.includes("Por equipo") && ficha.includes("Desde"), "ficha de servicio: qué incluye, modalidad y «Desde»");
    verificar((await p.$eval("[data-agregar-ficha]", (x) => x.textContent)).includes("Solicitar servicio"), "CTA «Solicitar servicio»");
    await limpiarWa(p);
    await p.click("[data-cotizar]");
    let u = await wa(p);
    let t = u?.searchParams.get("text") || "";
    verificar(u?.searchParams.get("phone") === WA_HOGAR && t.includes("este servicio") && t.includes("(Por equipo)") && t.includes("Precio: Desde $ 120.000") && !t.includes("Subtotal"), "cotizar un servicio: mensaje propio al WhatsApp de hogar");
    await p.click("[data-agregar-ficha]");
    await p.waitForFunction(() => document.querySelector("[data-agregar-ficha]")?.textContent.includes("Agregado"));
    verificar((await contador(p)) === "1", "«Solicitar servicio» lo agrega al carrito (cantidad 1)");

    // Cotizar un producto solo-empresa va al número de empresas
    await p.goto(`${T}/producto/ej-servidor-rack`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-cotizar]");
    await limpiarWa(p);
    await p.click("[data-cotizar]");
    u = await wa(p);
    verificar(u?.searchParams.get("phone") === WA_EMPRESA && (u.searchParams.get("text") || "").includes("este producto"), "cotizar un producto de empresas va al WhatsApp de empresas");

    // Producto de hogar desde la ficha con cantidad 2
    await p.goto(`${T}/producto/ej-kit-alarma`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-agregar-ficha]");
    await p.click("[aria-label='Cantidad'] button[aria-label='Más']");
    await p.click("[data-agregar-ficha]");
    await sleep(300);
    verificar((await contador(p)) === "3", "kit de alarma ×2 agregado desde la ficha");

    // ── 6. Agregar desde tarjetas
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-agregar]");
    await p.click("[data-grilla] [data-producto='ej-kit-cctv'] [data-agregar]");
    await p.waitForFunction(() => document.querySelector("[data-grilla] [data-producto='ej-kit-cctv'] [data-agregar]")?.textContent.includes("¡Agregado!"));
    await p.click("[data-grilla] [data-producto='ej-servidor-rack'] [data-agregar]");
    await sleep(200);
    verificar((await contador(p)) === "5", "tarjetas: «Agregar» con confirmación (contador 5)");

    // ── 7. Drawer
    await p.click("[data-abrir-carrito]");
    await p.waitForSelector("[data-carrito-lateral]");
    verificar(await p.evaluate(() => document.activeElement?.hasAttribute("data-cerrar-carrito")), "drawer abre con el foco en «Cerrar»");
    verificar((await p.$$("[data-item-lateral]")).length === 4, "drawer con 4 ítems");
    verificar((await p.$eval("[data-item-lateral='ej-srv-mantenimiento']", (x) => x.textContent)).includes("Servicio"), "drawer marca el servicio");
    for (let k = 0; k < 25; k++) await p.keyboard.press("Tab");
    verificar(await p.evaluate(() => !!document.activeElement?.closest("[data-carrito-lateral]")), "Tab mantiene el foco dentro del drawer");
    await p.keyboard.press("Escape");
    await sleep(200);
    verificar(!(await p.$("[data-carrito-lateral]")) && (await p.evaluate(() => document.activeElement?.hasAttribute("data-abrir-carrito"))), "Escape cierra y devuelve el foco");
    await p.click("[data-abrir-carrito]");
    await p.waitForSelector("[data-item-lateral='ej-kit-cctv']");
    await p.click("[data-item-lateral='ej-kit-cctv'] button[aria-label='Más']");
    await sleep(200);
    const totalLat = await p.$eval("[data-total-lateral]", (e) => e.textContent);
    verificar(totalLat === "$ 7.400.000", `total de productos sin servicios (${totalLat})`);
    await p.click("[data-ir-formulario]");
    await p.waitForFunction(() => location.pathname === "/tienda/carrito" && location.hash === "#datos");
    await p.waitForFunction(() => document.activeElement?.id === "nombre", { timeout: 5000 }).catch(() => null);
    verificar(await p.evaluate(() => document.activeElement?.id === "nombre"), "«Enviar pedido» lleva al formulario con el foco en Nombre");

    // ── 8. Pedido: segmento obligatorio y número de empresas
    verificar(!!(await p.$("#t-productos")) && !!(await p.$("#t-servicios")), "/carrito separa Productos y Servicios solicitados");
    await p.type("#nombre", "Cliente Ficticio de Prueba");
    await p.type("#celular", "300 123 4567");
    await p.type("#ciudad", "Cartagena");
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await sleep(300);
    verificar((await texto(p)).includes("Elige si es para hogar o empresa."), "pregunta obligatoria «¿Es para hogar o empresa?»");
    await p.click("label:has([data-segmento-form='empresa'])");
    await p.waitForSelector("#empresa");
    await p.type("#empresa", "Empresa Ficticia S.A.S.");
    await limpiarWa(p);
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await p.waitForSelector("[data-pedido-enviado]", { timeout: 10000 });
    const codigo = await p.$eval("[data-codigo]", (e) => e.textContent);
    u = await wa(p);
    t = u?.searchParams.get("text") || "";
    verificar(u?.searchParams.get("phone") === WA_EMPRESA, `pedido «Empresa» va al WhatsApp de empresas (${u?.searchParams.get("phone")})`);
    verificar(t.includes(`*Pedido ${codigo}*\nPara: Empresas`) && t.includes("Empresa: Empresa Ficticia S.A.S."), `mensaje con código ${codigo}, segmento y empresa`);
    const secProd = t.slice(t.indexOf("*Productos*"), t.indexOf("*Servicios solicitados*"));
    const secSrv = t.slice(t.indexOf("*Servicios solicitados*"), t.indexOf("*Mis datos*"));
    verificar(secProd.includes("Kit de alarma inalámbrica para hogar") && secProd.includes("Cantidad: 2 · Precio unitario: $ 2.450.000 · Subtotal: $ 4.900.000") && secProd.includes("Servidor en rack 1U") && !secProd.includes("Mantenimiento"), "sección Productos con su detalle");
    verificar(secSrv.includes("Mantenimiento preventivo de computadores (Por equipo)") && secSrv.includes("Precio: Desde $ 120.000"), "sección «Servicios solicitados» aparte");
    verificar(t.includes("*Total productos: $ 7.400.000* (+ 1 producto a cotizar)") && t.includes("Servicios: 1, se cotizan según el alcance."), "total solo de productos y nota de servicios");
    verificar((await contador(p)) === "0", "carrito queda vacío");

    // ── 9. Panel
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.click("[data-enlace-admin='encabezado']");
    await p.waitForFunction(() => location.pathname === "/tienda/admin");
    await p.waitForSelector("[data-aviso-demo]");
    await clicTexto(p, "Entrar al modo demostración");
    await p.waitForFunction(() => document.querySelector("h1")?.textContent === "Resumen");
    verificar((await texto(p)).includes(codigo), "el resumen muestra el pedido");

    await p.goto(`${T}/admin/productos`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-aviso-ejemplo]");
    verificar((await texto(p)).includes("Catálogo de ejemplo: reemplázalo desde el panel") && !!(await p.$("[data-borrar-ejemplo]")), "aviso «Catálogo de ejemplo» y botón para borrarlo");

    // Servicio nuevo
    await p.goto(`${T}/admin/productos/editar?tipo=servicio`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#modalidad");
    await p.type("#nombre", "Instalación de cámaras de prueba");
    await p.select("#categoria", "cat-servicios");
    await p.type("#precio", "250.000");
    await p.type("#modalidad", "Visita técnica");
    await p.type("#incluye", "Visita\nInstalación\nConfiguración");
    await p.click("[data-segmento-editor='hogar']");
    await clicTexto(p, "Guardar", "button[type=submit]");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos");
    verificar(true, "servicio nuevo guardado");

    // Producto con oferta: valida precio anterior
    await p.goto(`${T}/admin/productos/editar`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#anterior");
    await p.type("#nombre", "Router de prueba en oferta");
    await p.select("#categoria", "cat-redes");
    await p.type("#precio", "100.000");
    await p.type("#anterior", "90.000");
    await clicTexto(p, "Guardar", "button[type=submit]");
    await p.waitForFunction(() => document.body.innerText.includes("El precio anterior debe ser mayor"));
    verificar(true, "oferta inválida (anterior ≤ precio) se rechaza");
    await escribirNumero(p, "#anterior", "150.000");
    await sleep(150);
    verificar((await p.$eval("[data-pct]", (x) => x.textContent)).includes("Oferta -33 %"), "el editor calcula «-33 %»");
    await (await p.$("[data-subir-fotos]")).uploadFile(path.join(__dirname, "../../public/img/categorias/cableado-switch.webp"));
    await p.waitForSelector("[data-foto] img", { timeout: 15000 });
    await clicTexto(p, "Guardar", "button[type=submit]");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos");

    // Marca nueva
    await p.goto(`${T}/admin/marcas`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-admin-marca]");
    await p.type("#nueva-marca", "Marca Propia");
    await clicTexto(p, "Agregar", "button[type=submit]");
    await p.waitForFunction(() => document.querySelectorAll("[data-admin-marca]").length === 5);
    verificar(true, "marca nueva creada");

    // Promoción nueva primero
    await p.goto(`${T}/admin/banners`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-nueva-promo]");
    await p.click("[data-nueva-promo]");
    await p.type("#b-titulo", "Promo de prueba");
    await (await p.$("[data-subir='escritorio']")).uploadFile(path.join(__dirname, "../../public/img/categorias/techo-solar.webp"));
    await p.waitForSelector("[data-vista='escritorio']", { timeout: 15000 });
    await p.select("#b-enlace", "/?tipo=servicio");
    await escribirNumero(p, "#b-orden", "0");
    await clicTexto(p, "Guardar banner");
    await p.waitForFunction(() => document.querySelectorAll("[data-admin-banner]").length === 7);

    // Configuración con dos números
    await p.goto(`${T}/admin/configuracion`, { waitUntil: "networkidle0" });
    await p.waitForSelector("#wa-empresa");
    verificar((await p.$eval("#wa-hogar", (x) => x.value)) === WA_HOGAR && (await p.$eval("#wa-empresa", (x) => x.value)) === WA_EMPRESA, "configuración con WhatsApp de hogar y de empresas");

    // Todo visible en la tienda
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-promo]");
    verificar((await p.$eval("[data-promo]", (x) => x.textContent)).includes("Promo de prueba"), "la promoción nueva sale primero");
    verificar((await p.$$eval("[data-marca]", (xs) => xs.map((x) => x.textContent))).includes("Marca Propia"), "la marca nueva sale en la franja");
    const nuevoSrv = await p.evaluate(() => [...document.querySelectorAll("[data-grilla] [data-producto]")].find((a) => a.textContent.includes("Instalación de cámaras de prueba"))?.textContent || "");
    verificar(nuevoSrv.includes("Servicio") && nuevoSrv.includes("Desde$ 250.000") && nuevoSrv.includes("Visita técnica"), "el servicio nuevo sale con «Desde» y modalidad");
    const router = await p.evaluate(() => [...document.querySelectorAll("[data-grilla] [data-producto]")].find((a) => a.textContent.includes("Router de prueba en oferta"))?.textContent || "");
    verificar(router.includes("Oferta -33 %") && router.includes("$ 150.000") && router.includes("$ 100.000"), "el producto nuevo sale como oferta -33 %");

    // Pedidos
    await p.goto(`${T}/admin/pedidos`, { waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-pedido='${codigo}']`);
    verificar((await p.$eval(`[data-pedido='${codigo}'] [data-segmento-pedido]`, (x) => x.textContent)) === "Empresas", "el pedido muestra el segmento");
    await p.click(`[data-pedido='${codigo}'] summary`);
    await p.select(`[data-pedido='${codigo}'] [data-cambiar-estado]`, "vendido");
    await p.waitForFunction((c) => document.querySelector(`[data-pedido='${c}'] [data-estado]`)?.textContent === "Vendido", {}, codigo);
    verificar(true, "cambia el estado del pedido");

    // ── 10. Móvil: barra inferior, botón flotante, ficha
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-barra-inferior]");
    const barra = await p.$eval("[data-barra-inferior]", (x) => ({ abajo: Math.round(x.getBoundingClientRect().bottom), t: x.textContent }));
    verificar(barra.abajo === 844 && ["Inicio", "Categorías", "Carrito", "WhatsApp"].every((s) => barra.t.includes(s)), "móvil: barra inferior fija con Inicio, Categorías, Carrito y WhatsApp");
    verificar(await p.$eval("a[aria-label='Escríbenos por WhatsApp']", (x) => getComputedStyle(x).display === "none"), "móvil: el botón flotante se oculta (ya está en la barra)");
    verificar(await p.$eval("[data-barra-contacto]", (x) => getComputedStyle(x).display === "none"), "móvil: barra superior de contacto oculta");
    await p.click("[data-grilla] [data-producto='ej-panel-550'] [data-agregar]");
    await sleep(200);
    verificar((await p.$eval("[data-contador-barra]", (x) => x.textContent)) === "1", "contador en la barra inferior");
    await p.click("[data-barra-carrito]");
    await p.waitForSelector("[data-carrito-lateral]");
    verificar(true, "el carrito de la barra abre el drawer");
    await p.keyboard.press("Escape");
    await p.goto(`${T}/producto/ej-srv-diagnostico`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-barra-movil]");
    verificar(!(await p.$("[data-barra-inferior]")) && (await p.$eval("[data-barra-movil]", (x) => Math.round(x.getBoundingClientRect().bottom))) === 844, "ficha en móvil: solo la barra de compra (no choca con la navegación)");
    verificar((await p.$eval("[data-agregar-barra]", (x) => x.textContent)).includes("Solicitar servicio"), "barra de compra de un servicio: «Solicitar servicio»");

    // Reducir movimiento: la cinta queda quieta y se desplaza a mano
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-cinta]");
    const rm = await p.$eval("[data-cinta]", (x) => ({ modo: x.dataset.cinta, ox: getComputedStyle(x).overflowX, copia: !!x.querySelector("[data-cinta-copia]"), tr: getComputedStyle(x.querySelector("[data-cinta-pista]")).transform }));
    verificar(rm.modo === "quieta" && rm.ox === "auto" && !rm.copia && rm.tr === "none" && !(await p.$("[data-pausa-categorias]")), `con «reducir movimiento» la cinta no se anima y se desplaza a mano (${JSON.stringify(rm)})`);
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

    // Responsive: 6 anchos
    const rutas = ["", "/?tipo=servicio", "/producto/ej-srv-mantenimiento", "/producto/ej-portatil-14", "/carrito", "/admin/productos/editar?tipo=servicio", "/admin/marcas"];
    for (const w of [360, 390, 768, 1024, 1366, 1920]) {
      await p.setViewport({ width: w, height: 900, isMobile: w < 768, hasTouch: w < 768 });
      const malas = [];
      for (const r of rutas) {
        await p.goto(`${T}${r}`, { waitUntil: "networkidle0" });
        await sleep(200);
        const sw = await p.evaluate(() => document.documentElement.scrollWidth);
        if (sw > w) malas.push(`${r || "/"}=${sw}`);
      }
      verificar(malas.length === 0, `${w}px sin scroll horizontal en ${rutas.length} vistas${malas.length ? ` (${malas.join(", ")})` : ""}`);
    }
    // Banner sin choque con flechas
    for (const w of [768, 1366, 1920]) {
      await p.setViewport({ width: w, height: 900 });
      await p.goto(T, { waitUntil: "networkidle0" });
      await p.waitForSelector("[data-texto-banner]");
      const g = await p.evaluate(() => {
        const t = document.querySelector("[data-banner][aria-hidden='false'] [data-texto-banner]").getBoundingClientRect();
        return { ok: t.left >= document.querySelector("[data-banner-anterior]").getBoundingClientRect().right + 8 && t.right <= document.querySelector("[data-banner-siguiente]").getBoundingClientRect().left - 8 };
      });
      verificar(g.ok, `${w}px: texto del banner libre de las flechas`);
    }

    // Borrar catálogo de ejemplo
    await p.setViewport({ width: 1366, height: 900 });
    await p.goto(`${T}/admin/productos`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-borrar-ejemplo]");
    p.once("dialog", (d) => d.accept());
    await p.click("[data-borrar-ejemplo]");
    await p.waitForFunction(() => !document.querySelector("[data-aviso-ejemplo]"));
    const quedan = await p.$$eval("[data-admin-producto]", (xs) => xs.length);
    verificar(quedan === 2, `«Borrar catálogo de ejemplo» deja solo lo propio (${quedan})`);
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");
    verificar((await ids(p, "[data-grilla] [data-producto]")).length === 2 && (await p.$$("[data-cat-tarjeta]")).length === 8 && (await p.$$eval("[data-marca]", (xs) => xs.length)) === 1, "la tienda queda con lo propio, las 8 categorías y la marca propia");

    // Honeypot (el carrito perdió los ejemplos: se agrega un producto propio)
    await p.click("[data-grilla] [data-agregar]");
    await p.goto(`${T}/carrito`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-item]");
    await p.evaluate(() => (document.getElementById("sitio_web").value = "http://spam"));
    await limpiarWa(p);
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await p.waitForSelector("[data-pedido-enviado]");
    verificar((await p.evaluate(() => sessionStorage.getItem("__wa"))) === null, "honeypot: no abre WhatsApp ni guarda pedido");

    // Pocas categorías: la cinta no se anima y queda centrada
    await p.evaluate(() => {
      const e = JSON.parse(localStorage.getItem("sotec-tienda-v2"));
      e.categorias = e.categorias.map((c, i) => ({ ...c, activa: i < 3 }));
      localStorage.setItem("sotec-tienda-v2", JSON.stringify(e));
    });
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-cinta]");
    const pocas = await p.evaluate(() => {
      const m = document.querySelector("[data-cinta]");
      const l = m.querySelector("ul").getBoundingClientRect();
      const r = m.getBoundingClientRect();
      return { modo: m.dataset.cinta, izq: Math.round(l.left - r.left), der: Math.round(r.right - l.right), n: m.querySelectorAll("[data-cat-tarjeta]").length };
    });
    verificar(pocas.modo === "quieta" && pocas.n === 3 && Math.abs(pocas.izq - pocas.der) <= 2 && !(await p.$("[data-pausa-categorias]")), `con pocas categorías no se anima y quedan centradas (${JSON.stringify(pocas)})`);

    // ── Capturas (contexto limpio, catálogo de ejemplo)
    if (CAPTURAS) {
      fs.mkdirSync(CAPTURAS, { recursive: true });
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
        await p2.goto(`${T}/producto/ej-srv-mantenimiento`, { waitUntil: "networkidle0" });
        await p2.waitForSelector("[data-incluye]");
        await sleep(600);
        await p2.screenshot({ path: path.join(CAPTURAS, `ficha-servicio-${w}.png`) });
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
