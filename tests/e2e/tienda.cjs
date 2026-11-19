/* e2e de la tienda contra un servidor ya levantado (BASE=http://localhost:3300 por defecto). */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3300").replace(/\/$/, "");
const T = `${BASE}/tienda`;
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

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  const errores = [];
  const fallidas = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  p.on("response", (r) => r.status() >= 400 && fallidas.push(`${r.status()} ${r.url()}`));
  // Captura de WhatsApp: window.open no abre nada, guarda la URL
  await p.evaluateOnNewDocument(() => {
    window.open = (u) => {
      sessionStorage.setItem("__wa", String(u));
      return { opener: null };
    };
  });

  try {
    // 1. Catálogo
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");
    const n = await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.length);
    verificar(n === 13, `catálogo carga 13 productos (${n})`);
    verificar((await p.title()).includes("SOTEC"), "título con SOTEC");
    const imgsRotas = await p.$$eval("img", (xs) => xs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    verificar(imgsRotas.length === 0, `imágenes cargan bajo /tienda (${imgsRotas.join(", ") || "ok"})`);
    verificar(await p.$eval("header a[href='https://sotecse.com']", () => true).catch(() => false), "enlace de vuelta a sotecse.com");

    // 2. Filtrar
    await p.click("[data-categoria='cat-cctv']");
    await p.waitForFunction(() => location.search.includes("categoria=cat-cctv"));
    await sleep(300);
    const cctv = await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.map((x) => x.getAttribute("data-producto")));
    verificar(cctv.length === 3 && cctv.every((id) => ["prd-camara-domo", "prd-camara-ptz", "prd-nvr-8"].includes(id)), `filtro CCTV deja 3 productos (${cctv.join(",")})`);
    await p.type("input[type=search]", "ptz");
    await sleep(300);
    verificar((await p.$$eval("[data-grilla] [data-producto]", (xs) => xs.length)) === 1, "búsqueda «ptz» deja 1");
    await p.focus("input[type=search]");
    await p.keyboard.down("Control");
    await p.keyboard.press("A");
    await p.keyboard.up("Control");
    await p.keyboard.press("Backspace");
    await p.waitForFunction(() => document.querySelectorAll("[data-grilla] [data-producto]").length === 3);

    // 3. Agregar 2 productos
    await p.click("[data-grilla] [data-producto='prd-camara-domo'] button");
    await p.click("[data-grilla] [data-producto='prd-camara-ptz'] button");
    await sleep(300);
    verificar((await p.$eval("[data-contador]", (e) => e.textContent)) === "2", "contador del carrito = 2");
    verificar((await p.evaluate(() => document.body.innerText)).includes("al carrito"), "aviso al agregar");

    // Ficha de producto directa
    await p.goto(`${T}/producto/prd-panel-550`, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => document.querySelector("h1")?.textContent.includes("Panel solar"));
    const ficha = await p.evaluate(() => document.body.innerText);
    verificar(ficha.includes("$ 690.000") && ficha.includes("Ficha técnica") && ficha.includes("Potencia"), "ficha con precio y ficha técnica");

    // 4. Carrito: cambiar cantidad
    await p.goto(`${T}/carrito`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-item='prd-camara-domo']");
    verificar((await p.$$("[data-item]")).length === 2, "carrito persiste con 2 productos");
    await p.click("[data-item='prd-camara-domo'] button[aria-label='Más']");
    await sleep(200);
    const sub = await p.$eval("[data-item='prd-camara-domo'] [data-subtotal]", (e) => e.textContent);
    const total = await p.$eval("[data-total]", (e) => e.textContent);
    verificar(sub === "$ 640.000" && total === "$ 640.000", `cantidad 2: subtotal y total $ 640.000 (${sub} / ${total})`);
    verificar((await p.$eval("[data-item='prd-camara-ptz'] [data-subtotal]", (e) => e.textContent)) === "A cotizar", "PTZ sin precio = A cotizar");

    // 5. Checkout: validación y envío
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await sleep(300);
    verificar((await p.evaluate(() => document.body.innerText)).includes("Escribe tu nombre completo"), "valida campos obligatorios");
    await p.type("#nombre", "Cliente Ficticio de Prueba");
    await p.type("#celular", "300 123 4567");
    await p.type("#ciudad", "Cartagena");
    await p.type("#nota", "Instalación en oficina");
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await p.waitForSelector("[data-pedido-enviado]", { timeout: 10000 });
    const codigo = await p.$eval("[data-codigo]", (e) => e.textContent);
    const wa = await p.evaluate(() => sessionStorage.getItem("__wa"));
    const u = wa ? new URL(wa) : null;
    const texto = u?.searchParams.get("text") || "";
    verificar(u && u.origin + u.pathname === "https://api.whatsapp.com/send" && u.searchParams.get("phone") === "573104696060", `abre api.whatsapp.com al 573104696060`);
    verificar(texto.includes(`*Pedido ${codigo}*`), `mensaje con el código ${codigo}`);
    verificar(texto.includes("Cámara domo IP 4 MP") && texto.includes("Cantidad: 2 · Precio unitario: $ 320.000 · Subtotal: $ 640.000"), "mensaje con producto, cantidad, unitario y subtotal");
    verificar(texto.includes("Cámara PTZ exterior 25x") && texto.includes("Precio a cotizar"), "mensaje con producto a cotizar");
    verificar(texto.includes("*Total: $ 640.000* (+ 1 producto a cotizar)"), "mensaje con total");
    verificar(texto.includes("Nombre: Cliente Ficticio de Prueba") && texto.includes("Ciudad: Cartagena") && texto.includes("Nota: Instalación en oficina"), "mensaje con datos del cliente");
    verificar((await p.$eval("[data-contador]", (e) => e.textContent)) === "0", "carrito queda vacío");

    // 6. Admin: entrar, crear producto con foto
    await p.goto(`${T}/admin`, { waitUntil: "networkidle0" });
    verificar(!!(await p.$("[data-aviso-demo]")), "acceso muestra aviso de modo demostración");
    await clicTexto(p, "Entrar al modo demostración");
    await p.waitForFunction(() => document.querySelector("h1")?.textContent === "Resumen");
    verificar((await p.evaluate(() => document.body.innerText)).includes(codigo), "el resumen muestra el pedido nuevo");
    verificar(!!(await p.$("[data-aviso-demo]")), "panel muestra aviso: solo este navegador");
    await p.goto(`${T}/admin/productos/editar`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-editor-producto] #nombre");
    await p.type("#nombre", "Reflector solar LED de prueba");
    await p.select("#categoria", "cat-solar");
    await p.type("#precio", "185.000");
    await p.type("#descripcion", "Reflector para exteriores con panel incluido.");
    await p.type("#ficha", "Potencia: 100 W\nAutonomía: 10 h");
    const input = await p.$("[data-subir-fotos]");
    await input.uploadFile(path.join(__dirname, "../../public/img/logo-sotec.png"));
    await p.waitForSelector("[data-foto] img", { timeout: 15000 });
    const foto = await p.$eval("[data-foto] img", (i) => i.src);
    verificar(/^data:image\/(webp|jpeg);base64,/.test(foto) && foto.length < 350 * 1024 * 1.4, `foto comprimida a ${foto.slice(5, 15)} (${Math.round(foto.length / 1024)} KB en base64)`);
    await clicTexto(p, "Guardar producto");
    await p.waitForFunction(() => location.pathname === "/tienda/admin/productos");
    await p.waitForFunction(() => document.body.innerText.includes("Reflector solar LED de prueba"));
    verificar(true, "producto nuevo en la lista del panel");
    await p.goto(`${T}/?categoria=cat-solar`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto]");
    const enCatalogo = await p.evaluate(() => [...document.querySelectorAll("[data-grilla] [data-producto]")].find((a) => a.textContent.includes("Reflector solar LED de prueba"))?.textContent || "");
    verificar(enCatalogo.includes("$ 185.000"), "producto nuevo aparece en el catálogo con su precio");

    // 7. Pedidos: cambiar estado
    await p.goto(`${T}/admin/pedidos`, { waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-pedido='${codigo}']`);
    await p.click(`[data-pedido='${codigo}'] summary`);
    await p.select(`[data-pedido='${codigo}'] [data-cambiar-estado]`, "vendido");
    await p.waitForFunction((c) => document.querySelector(`[data-pedido='${c}'] [data-estado]`)?.textContent === "Vendido", {}, codigo);
    await p.reload({ waitUntil: "networkidle0" });
    await p.waitForSelector(`[data-pedido='${codigo}']`);
    verificar((await p.$eval(`[data-pedido='${codigo}'] [data-estado]`, (e) => e.textContent)) === "Vendido", "estado «Vendido» persiste al recargar");

    // 8. Móvil 390 px sin scroll horizontal
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const ruta of ["/", "/producto/prd-kit-solar-3kw", "/carrito", "/admin", "/admin/pedidos", "/admin/productos/editar"]) {
      await p.goto(`${T}${ruta === "/" ? "" : ruta}`, { waitUntil: "networkidle0" });
      await sleep(300);
      const w = await p.evaluate(() => document.documentElement.scrollWidth);
      verificar(w <= 390, `móvil 390px sin scroll horizontal en ${ruta} (${w})`);
    }
    // Carrito con productos en móvil
    await p.goto(T, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-grilla] [data-producto] button");
    await p.click("[data-grilla] [data-producto='prd-kit-solar-3kw'] button");
    await p.goto(`${T}/carrito`, { waitUntil: "networkidle0" });
    await p.waitForSelector("[data-item]");
    verificar((await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, "móvil: carrito con producto sin scroll horizontal");

    // 9. Antispam: honeypot no guarda pedido
    await p.evaluate(() => (document.getElementById("sitio_web").value = "http://spam"));
    await p.type("#nombre", "Bot Ficticio");
    await p.type("#celular", "3009999999");
    await p.type("#ciudad", "Bogotá");
    await p.evaluate(() => sessionStorage.removeItem("__wa"));
    await clicTexto(p, "Enviar pedido por WhatsApp");
    await p.waitForSelector("[data-pedido-enviado]");
    verificar((await p.evaluate(() => sessionStorage.getItem("__wa"))) === null, "honeypot: no abre WhatsApp ni guarda pedido");

    // Manifest e ícono bajo /tienda
    const man = await p.evaluate(async () => {
      const href = document.querySelector("link[rel=manifest]")?.getAttribute("href");
      const r = await fetch(href);
      return { href, status: r.status, start: (await r.json()).start_url };
    });
    verificar(man.href === "/tienda/manifest.webmanifest" && man.status === 200 && man.start === "/tienda", `manifest enlazado bajo /tienda (${man.href})`);

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
