/* Pruebas unitarias: carrito, precios y ofertas, mensajes de WhatsApp, segmentos, filtros, antispam,
 * validación, normalización y adaptador local. */
import assert from "node:assert/strict";

import { Package, Sun } from "lucide-react";

import { LIMITE_PEDIDOS, VENTANA_MS, esBot, revisarLimite } from "../../src/lib/antispam";
import * as C from "../../src/lib/carrito";
import { CLAVE_LOCAL, CLAVE_SESION, almacenMemoria, crearRepoLocal } from "../../src/lib/datos/local";
import { filtrar, filtrosDeUrl } from "../../src/lib/filtros";
import { descuento, formatoCOP, textoPrecio } from "../../src/lib/formato";
import { ICONOS, iconoDe } from "../../src/lib/iconos";
import { normalizarConfig, normalizarProducto } from "../../src/lib/normalizar";
import { MINIMO_CARRUSEL, filasPortada } from "../../src/lib/portada";
import { urlImagen } from "../../src/lib/rutas";
import { BANNERS_SEMILLA, CATEGORIAS_SEMILLA, MARCAS_SEMILLA, PRODUCTOS_SEMILLA, esEjemplo } from "../../src/lib/semilla";
import { CONFIG_INICIAL, type DatosCliente, type Producto } from "../../src/lib/tipos";
import { errorPrecios, esquemaCliente } from "../../src/lib/validacion";
import { enlaceWhatsApp, mensajePedido, mensajeProducto, normalizarNumero, numeroPara, numeroProducto } from "../../src/lib/whatsapp";

let casos = 0;
const fallos: string[] = [];
async function caso(nombre: string, f: () => unknown | Promise<unknown>) {
  casos++;
  try {
    await f();
  } catch (e) {
    fallos.push(`✗ ${nombre}: ${e instanceof Error ? e.message : e}`);
  }
}
const P = (id: string) => {
  const p = PRODUCTOS_SEMILLA.find((x) => x.id === id);
  if (!p) throw new Error(`falta ${id}`);
  return p;
};

const panel = P("ej-panel-550"); // 690.000
const servidor = P("ej-servidor-rack"); // a cotizar, empresa
const portatil = P("ej-portatil-14"); // oferta 2.890.000 (antes 3.290.000)
const mantenimiento = P("ej-srv-mantenimiento"); // servicio desde 120.000
const cctvAnual = P("ej-srv-mant-cctv"); // servicio a cotizar, empresa

(async () => {
  // ── Formato y ofertas
  await caso("COP sin decimales", () => assert.equal(formatoCOP(1250000), "$ 1.250.000"));
  await caso("texto de precio por tipo", () => {
    assert.equal(textoPrecio(null), "Precio a cotizar");
    assert.equal(textoPrecio(null, "servicio"), "A cotizar");
    assert.equal(textoPrecio(120000, "servicio"), "Desde $ 120.000");
  });
  await caso("descuento: -12 % en el portátil", () => assert.equal(descuento(portatil), 12));
  await caso("descuento: sin oferta si el anterior no es mayor", () => {
    assert.equal(descuento({ precio: 100, precioAnterior: 100 }), null);
    assert.equal(descuento({ precio: 100, precioAnterior: 90 }), null);
    assert.equal(descuento({ precio: null, precioAnterior: 90 }), null);
    assert.equal(descuento({ precio: 100, precioAnterior: null }), null);
  });
  await caso("validación de precios del panel", () => {
    assert.equal(errorPrecios(100, null), null);
    assert.equal(errorPrecios(100, 150), null);
    assert.match(errorPrecios(100, 100) ?? "", /mayor/);
    assert.match(errorPrecios(null, 150) ?? "", /precio actual/);
  });
  await caso("urlImagen agrega basePath y respeta data/https", () => {
    assert.equal(urlImagen("/img/x.webp"), "/tienda/img/x.webp");
    assert.equal(urlImagen("/tienda/img/x.webp"), "/tienda/img/x.webp");
    assert.equal(urlImagen("data:image/webp;base64,AA"), "data:image/webp;base64,AA");
    assert.equal(urlImagen("https://x.supabase.co/a.webp"), "https://x.supabase.co/a.webp");
  });

  // ── Carrito con productos y servicios
  let c = C.agregar([], panel);
  c = C.agregar(c, panel, 2);
  c = C.agregar(c, servidor);
  c = C.agregar(c, mantenimiento, 2);
  await caso("agregar suma cantidades y guarda el tipo", () => {
    assert.deepEqual(c.map((x) => [x.productoId, x.tipo, x.cantidad]), [[panel.id, "producto", 3], [servidor.id, "producto", 1], [mantenimiento.id, "servicio", 2]]);
    assert.equal(c[2].modalidad, "Por equipo");
  });
  await caso("resumen: servicios y productos a cotizar no suman", () => assert.deepEqual(C.resumen(c), { unidades: 6, total: 2070000, aCotizar: 1, servicios: 1, referencias: 3 }));
  await caso("subtotal de servicio = null (precio «desde»)", () => assert.equal(C.subtotal(c[2]), null));
  await caso("cambiar, acotar y quitar", () => {
    assert.equal(C.cambiarCantidad(c, panel.id, 5000)[0].cantidad, 999);
    assert.equal(C.cambiarCantidad(c, panel.id, 0).length, 2);
    assert.deepEqual(C.quitar(c, servidor.id).map((x) => x.productoId), [panel.id, mantenimiento.id]);
  });
  await caso("tope de referencias", () => {
    let xs = C.agregar([], panel);
    for (let i = 0; i < 60; i++) xs = C.agregar(xs, { ...panel, id: `p${i}` });
    assert.equal(xs.length, C.ITEMS_MAXIMOS);
  });
  await caso("sincronizar actualiza precio/tipo y quita inactivos", () => {
    const s = C.sincronizar(c, [{ ...panel, precio: 700000 }, { ...servidor, activo: false }, mantenimiento]);
    assert.deepEqual(s.map((x) => [x.productoId, x.precio, x.tipo]), [[panel.id, 700000, "producto"], [mantenimiento.id, 120000, "servicio"]]);
  });
  await caso("leerCarrito tolera basura y versiones viejas (sin tipo)", () => {
    assert.deepEqual(C.leerCarrito("{no json"), []);
    const l = C.leerCarrito(JSON.stringify([{ productoId: "x", nombre: "X", precio: -5, cantidad: "7" }, { nada: 1 }]));
    assert.deepEqual(l, [{ productoId: "x", nombre: "X", precio: null, cantidad: 7, tipo: "producto", imagen: "" }]);
  });

  // ── WhatsApp: secciones, segmento y número
  const cfg = { ...CONFIG_INICIAL, whatsappHogar: "573001110000", whatsappEmpresa: "573002220000" };
  const cliente: DatosCliente = { nombre: "Cliente Ficticio", celular: "3001234567", ciudad: "Cartagena", segmento: "empresa", empresa: "Empresa Ficticia S.A.S.", correo: "", nota: "Con instalación" };
  const m = mensajePedido(cfg, "T-ABC234", cliente, c);
  await caso("mensaje: saludo, código y segmento", () => {
    assert.ok(m.startsWith(cfg.mensajeInicial));
    assert.ok(m.includes("*Pedido T-ABC234*\nPara: Empresas"));
  });
  await caso("mensaje: sección Productos", () => {
    const prod = m.slice(m.indexOf("*Productos*"), m.indexOf("*Servicios solicitados*"));
    assert.ok(prod.includes("1. Panel solar monocristalino 550 W\n   Cantidad: 3 · Precio unitario: $ 690.000 · Subtotal: $ 2.070.000"));
    assert.ok(prod.includes("2. Servidor en rack 1U\n   Cantidad: 1 · Precio unitario: Precio a cotizar"));
    assert.ok(!prod.includes("Mantenimiento"));
  });
  await caso("mensaje: sección Servicios solicitados aparte", () => {
    const srv = m.slice(m.indexOf("*Servicios solicitados*"));
    assert.ok(srv.includes("1. Mantenimiento preventivo de computadores (Por equipo)\n   Cantidad: 2 · Precio: Desde $ 120.000"));
    assert.ok(!srv.split("*Mis datos*")[0].includes("Subtotal"));
  });
  await caso("mensaje: total solo de productos y nota de servicios", () => {
    assert.ok(m.includes("*Total productos: $ 2.070.000* (+ 1 producto a cotizar)"));
    assert.ok(m.includes("Servicios: 1, se cotizan según el alcance."));
  });
  await caso("mensaje: datos del cliente con empresa, sin correo vacío", () => {
    assert.ok(m.includes("Nombre: Cliente Ficticio\nEmpresa: Empresa Ficticia S.A.S.\nCelular: 3001234567\nCiudad: Cartagena\nNota: Con instalación"));
    assert.ok(!m.includes("Correo:"));
  });
  await caso("mensaje solo de servicios: sin sección ni total de productos", () => {
    const ms = mensajePedido(cfg, "T-SRV", { ...cliente, segmento: "hogar", empresa: "" }, C.agregar([], cctvAnual));
    assert.ok(!ms.includes("*Productos*") && !ms.includes("Total productos") && ms.includes("*Servicios solicitados*") && ms.includes("Precio: A cotizar") && ms.includes("Para: Hogar"));
  });
  await caso("segmento → número de WhatsApp", () => {
    assert.equal(numeroPara(cfg, "hogar"), "573001110000");
    assert.equal(numeroPara(cfg, "empresa"), "573002220000");
    assert.equal(numeroPara({ ...cfg, whatsappEmpresa: "" }, "empresa"), "573001110000");
  });
  await caso("cotizar un ítem solo-empresa va al número de empresas", () => {
    assert.equal(numeroProducto(cfg, servidor), "573002220000");
    assert.equal(numeroProducto(cfg, panel), "573001110000");
  });
  await caso("normaliza celular colombiano", () => {
    assert.equal(normalizarNumero("310 469 6060"), "573104696060");
    assert.equal(normalizarNumero("+57 310-469-6060"), "573104696060");
  });
  await caso("enlace api.whatsapp.com codificado", () => {
    const u = new URL(enlaceWhatsApp(numeroPara(cfg, "empresa"), m));
    assert.equal(u.origin + u.pathname, "https://api.whatsapp.com/send");
    assert.equal(u.searchParams.get("phone"), "573002220000");
    assert.equal(u.searchParams.get("text"), m);
  });
  await caso("cotizar producto: cantidad, unitario, subtotal y enlace", () => {
    const mp = mensajeProducto(panel, 2, "https://sotecse.com/tienda/producto/ej-panel-550");
    assert.ok(mp.includes("este producto") && mp.includes("Cantidad: 2 · Precio unitario: $ 690.000 · Subtotal: $ 1.380.000") && mp.endsWith("ej-panel-550"));
  });
  await caso("cotizar servicio: «Desde» y modalidad, sin subtotal", () => {
    const ms = mensajeProducto(mantenimiento, 1);
    assert.ok(ms.includes("este servicio") && ms.includes("*Mantenimiento preventivo de computadores* (Por equipo)") && ms.includes("Precio: Desde $ 120.000") && !ms.includes("Subtotal"));
  });

  // ── Filtros
  const nombres = { categoria: new Map(CATEGORIAS_SEMILLA.map((x) => [x.id, x.nombre])), marca: new Map(MARCAS_SEMILLA.map((x) => [x.id, x.nombre])) };
  await caso("filtro por tipo servicio", () => assert.ok(filtrar(PRODUCTOS_SEMILLA, { tipo: "servicio" }, nombres).every((p) => p.tipo === "servicio")));
  await caso("filtro por segmento empresa incluye los de ambos", () => {
    const r = filtrar(PRODUCTOS_SEMILLA, { segmento: "empresa" }, nombres);
    assert.ok(r.some((p) => p.segmentos.length === 2) && r.every((p) => p.segmentos.includes("empresa")) && !r.some((p) => p.id === "ej-kit-alarma"));
  });
  await caso("filtro por marca", () => assert.deepEqual(filtrar(PRODUCTOS_SEMILLA, { marca: "mar-alfa" }, nombres).map((p) => p.marcaId), ["mar-alfa", "mar-alfa", "mar-alfa"]));
  await caso("búsqueda sin tildes por nombre, marca o categoría", () => {
    assert.ok(filtrar(PRODUCTOS_SEMILLA, { q: "computo" }, nombres).some((p) => p.id === "ej-portatil-14"));
    assert.ok(filtrar(PRODUCTOS_SEMILLA, { q: "ejemplo beta" }, nombres).every((p) => p.marcaId === "mar-beta"));
  });
  await caso("filtrosDeUrl ignora valores inválidos", () => assert.deepEqual(filtrosDeUrl(new URLSearchParams("tipo=kit&segmento=oficina&categoria=cat-solar")), { categoria: "cat-solar", tipo: "", segmento: "", marca: "", q: "" }));

  // ── Carruseles de la portada: solo con 3+ ítems
  await caso("portada: 7 carruseles con el catálogo de ejemplo", () => {
    const f = filasPortada(PRODUCTOS_SEMILLA, CATEGORIAS_SEMILLA);
    assert.deepEqual(f.map((x) => x.id), ["ofertas", "destacados", "servicios", "cat-computo", "cat-redes", "cat-seguridad", "cat-servicios"]);
    assert.ok(f.every((x) => x.productos.length >= MINIMO_CARRUSEL));
  });
  await caso("portada: categorías con menos de 3 no tienen carrusel", () => {
    const ids = filasPortada(PRODUCTOS_SEMILLA, CATEGORIAS_SEMILLA).map((x) => x.id);
    for (const c of ["cat-servidores", "cat-solar", "cat-automatizacion", "cat-impresion"]) assert.ok(!ids.includes(c), c);
  });
  await caso("portada: respeta el segmento (empresa) al contar", () => {
    const f = filasPortada(PRODUCTOS_SEMILLA, CATEGORIAS_SEMILLA, "empresa");
    const seg = f.find((x) => x.id === "cat-seguridad");
    assert.ok(seg && seg.productos.length === 3 && !seg.productos.some((p) => p.id === "ej-kit-alarma"));
    assert.ok(f.every((x) => x.productos.length >= 3 && x.productos.every((p) => p.segmentos.includes("empresa"))));
    assert.ok(f.find((x) => x.id === "servicios")?.verTodo?.includes("segmento=empresa"));
  });
  await caso("portada: exactamente 3 sí, 2 no", () => {
    const cat = [{ ...CATEGORIAS_SEMILLA[0], id: "c" }];
    const mk = (i: number) => ({ ...panel, id: `x${i}`, categoriaId: "c", destacado: false, nuevo: false, precioAnterior: null });
    assert.equal(filasPortada([mk(1), mk(2)], cat).length, 0);
    assert.deepEqual(filasPortada([mk(1), mk(2), mk(3)], cat).map((x) => x.id), ["c"]);
  });

  // ── Semilla, íconos y normalización
  await caso("semilla: 8 categorías con ícono válido", () => {
    assert.equal(CATEGORIAS_SEMILLA.length, 8);
    assert.ok(CATEGORIAS_SEMILLA.every((x) => ICONOS.some((i) => i.clave === x.icono)));
  });
  await caso("semilla: 16–20 ítems mezclando productos y servicios", () => {
    assert.ok(PRODUCTOS_SEMILLA.length >= 16 && PRODUCTOS_SEMILLA.length <= 20);
    assert.ok(PRODUCTOS_SEMILLA.filter((p) => p.tipo === "servicio").length >= 4);
    assert.ok(new Set(PRODUCTOS_SEMILLA.map((p) => p.categoriaId)).size === 8);
  });
  await caso("semilla: ofertas válidas y marcas ficticias", () => {
    assert.ok(PRODUCTOS_SEMILLA.every((p) => errorPrecios(p.precio, p.precioAnterior) == null));
    assert.ok(MARCAS_SEMILLA.every((x) => x.nombre.startsWith("Ejemplo ") && !x.logo));
  });
  await caso("semilla: banners y promos con enlaces internos válidos", () => {
    const ids = new Set(PRODUCTOS_SEMILLA.map((p) => p.id));
    const cats = new Set(CATEGORIAS_SEMILLA.map((x) => x.id));
    assert.equal(BANNERS_SEMILLA.filter((b) => b.ubicacion === "promo").length, 3);
    for (const b of BANNERS_SEMILLA) {
      assert.match(b.enlace, /^\/[A-Za-z0-9/?=&_.#-]*$/);
      const prod = b.enlace.match(/^\/producto\/(.+)$/)?.[1];
      const cat = b.enlace.match(/categoria=([^&#]+)/)?.[1];
      const seg = /segmento=(hogar|empresa)/.test(b.enlace);
      assert.ok((prod && ids.has(prod)) || (cat && cats.has(cat)) || seg, b.enlace);
    }
  });
  await caso("íconos: conocidos, desconocidos y claves válidas", () => {
    assert.equal(iconoDe("sol"), Sun);
    assert.equal(iconoDe("no-existe"), Package);
    assert.ok(ICONOS.every((i) => /^[a-z]{2,20}$/.test(i.clave)));
  });
  await caso("normalizar producto viejo: tipo, segmentos y oferta inválida", () => {
    const n = normalizarProducto({ id: "x", nombre: "Viejo", categoriaId: "c", precio: 100, precioAnterior: 50, imagenes: ["a"] } as Partial<Producto> & Record<string, unknown>);
    assert.deepEqual([n.tipo, n.segmentos, n.precioAnterior, n.marcaId, n.incluye], ["producto", ["hogar", "empresa"], null, null, ""]);
  });
  await caso("normalizar config con el número único de la versión anterior", () => {
    const n = normalizarConfig({ whatsapp: "573009998888" } as never);
    assert.deepEqual([n.whatsappHogar, n.whatsappEmpresa], ["573009998888", "573009998888"]);
  });

  // ── Antispam y validación
  await caso("honeypot", () => assert.deepEqual([esBot(""), esBot(undefined), esBot("http://spam")], [false, false, true]));
  await caso("límite de envíos", () => {
    const ahora = 1_000_000_000;
    const marcas = Array.from({ length: LIMITE_PEDIDOS }, (_, i) => ahora - i * 1000);
    assert.equal(revisarLimite(marcas, ahora).permitido, false);
    assert.equal(revisarLimite(marcas, ahora + VENTANA_MS + 1).permitido, true);
  });
  await caso("validación: segmento obligatorio", () => {
    assert.ok(esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "300 123 4567", ciudad: "Cartagena", segmento: "hogar", correo: "" }).success);
    const r = esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "3001234567", ciudad: "Cartagena", segmento: "" });
    assert.ok(!r.success && r.error.issues.some((i) => i.path[0] === "segmento" && /hogar o empresa/.test(i.message)));
  });
  await caso("validación: celular y correo inválidos", () => {
    assert.ok(!esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "12", ciudad: "Cartagena", segmento: "hogar" }).success);
    assert.ok(!esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "3001234567", ciudad: "Cartagena", segmento: "hogar", correo: "x@" }).success);
  });

  // ── Adaptador local
  const alm = almacenMemoria();
  const ses = almacenMemoria();
  const repo = crearRepoLocal(alm, ses);
  await caso("local: semilla completa", async () => {
    assert.equal((await repo.categorias()).length, 8);
    assert.equal((await repo.productos()).length, PRODUCTOS_SEMILLA.length);
    assert.equal((await repo.marcas()).length, 4);
    const bs = await repo.banners();
    assert.deepEqual([bs.filter((b) => b.ubicacion === "carrusel").length, bs.filter((b) => b.ubicacion === "promo").length], [3, 3]);
  });
  await caso("local: escribir exige sesión", async () => {
    await assert.rejects(repo.guardarProducto(panel), /Entra al panel/);
    await assert.rejects(repo.guardarMarca(MARCAS_SEMILLA[0]), /Entra al panel/);
    await assert.rejects(repo.pedidos(), /Entra al panel/);
  });
  await repo.entrar("", "");
  await caso("local: sesión demo", () => assert.equal(ses.getItem(CLAVE_SESION), "1"));
  await caso("local: pedido con servicios recalcula del catálogo y guarda segmento", async () => {
    const trucado = C.agregar(C.agregar([], { ...panel, precio: 1 }, 2), { ...mantenimiento, tipo: "producto", precio: 5 });
    const p = await repo.crearPedido({ cliente, items: trucado });
    assert.equal(p.total, 1380000);
    assert.equal(p.items[1].tipo, "servicio");
    assert.equal(p.conItemsACotizar, true);
    assert.equal(p.cliente.segmento, "empresa");
    assert.match(p.codigo, /^T-[2-9A-HJ-NP-Z]{6}$/);
  });
  await caso("local: pedido vacío falla", async () => assert.rejects(repo.crearPedido({ cliente, items: [] }), /vacío/));
  await caso("local: borrar marca deja productos sin marca", async () => {
    await repo.eliminarMarca("mar-alfa");
    assert.ok((await repo.productos({ todos: true })).filter((p) => p.id === "ej-portatil-14").every((p) => p.marcaId === null));
  });
  await caso("local: banners crear y ocultar", async () => {
    await repo.guardarBanner({ ...BANNERS_SEMILLA[0], id: "ban-prueba", orden: 0 });
    assert.equal((await repo.banners())[0].id, "ban-prueba");
    await repo.guardarBanner({ ...BANNERS_SEMILLA[0], id: "ban-prueba", orden: 0, activo: false });
    assert.ok(!(await repo.banners()).some((b) => b.id === "ban-prueba"));
  });
  await caso("local: borrar catálogo de ejemplo deja categorías y lo propio", async () => {
    await repo.guardarProducto({ ...panel, id: "prd-propio", nombre: "Producto propio", marcaId: "mar-beta" });
    await repo.borrarCatalogoEjemplo?.();
    const ps = await repo.productos({ todos: true });
    assert.deepEqual(ps.map((p) => [p.id, p.marcaId]), [["prd-propio", null]]);
    assert.ok((await repo.banners({ todos: true })).every((b) => !esEjemplo(b.id)));
    assert.equal((await repo.marcas({ todas: true })).length, 0);
    assert.equal((await repo.categorias({ todas: true })).length, 8);
  });
  await caso("local: configuración con dos números", async () => {
    await repo.guardarConfiguracion({ ...cfg });
    assert.deepEqual(await repo.configuracion(), cfg);
  });
  await caso("local: datos v2 parciales se normalizan", async () => {
    const a = almacenMemoria();
    a.setItem(CLAVE_LOCAL, JSON.stringify({ productos: [{ id: "x", nombre: "Sin tipo", categoriaId: "cat-solar", precio: 10 }], config: { whatsapp: "573000000001" } }));
    const r = crearRepoLocal(a);
    const [p] = await r.productos();
    assert.deepEqual([p.tipo, p.segmentos.length], ["producto", 2]);
    assert.equal((await r.configuracion()).whatsappEmpresa, "573000000001");
    assert.equal((await r.categorias()).length, 8);
  });
  await caso("local: datos dañados vuelven a la semilla", async () => {
    const a = almacenMemoria();
    a.setItem(CLAVE_LOCAL, "{roto");
    assert.equal((await crearRepoLocal(a).productos()).length, PRODUCTOS_SEMILLA.length);
  });
  await caso("local: sin espacio da error claro", async () => {
    const lleno = { ...almacenMemoria(), setItem: () => { throw new Error("QuotaExceededError"); } };
    const s2 = almacenMemoria();
    s2.setItem(CLAVE_SESION, "1");
    await assert.rejects(crearRepoLocal(lleno, s2).guardarProducto(panel), /no tiene espacio/);
  });
  await repo.salir();
  await caso("local: salir cierra la sesión", async () => assert.equal(await repo.sesion(), null));

  if (fallos.length) {
    console.error(fallos.join("\n"));
    console.error(`${fallos.length} de ${casos} casos fallaron`);
    process.exit(1);
  }
  console.log(`✓ ${casos} casos unitarios`);
})();
