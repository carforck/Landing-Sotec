/* Pruebas unitarias: carrito, mensaje de WhatsApp, antispam, validación y adaptador local. */
import assert from "node:assert/strict";

import { revisarLimite, LIMITE_PEDIDOS, VENTANA_MS, esBot } from "../../src/lib/antispam";
import * as C from "../../src/lib/carrito";
import { CLAVE_SESION, almacenMemoria, crearRepoLocal } from "../../src/lib/datos/local";
import { formatoCOP, textoPrecio } from "../../src/lib/formato";
import { urlImagen } from "../../src/lib/rutas";
import { PRODUCTOS_SEMILLA } from "../../src/lib/semilla";
import { CONFIG_INICIAL, type Producto } from "../../src/lib/tipos";
import { esquemaCliente } from "../../src/lib/validacion";
import { enlaceWhatsApp, mensajePedido, normalizarNumero } from "../../src/lib/whatsapp";

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

const panel = PRODUCTOS_SEMILLA.find((p) => p.id === "prd-panel-550")!;
const kit = PRODUCTOS_SEMILLA.find((p) => p.precio == null)!;
const camara = PRODUCTOS_SEMILLA.find((p) => p.id === "prd-camara-domo")!;

(async () => {
  // ── Formato
  await caso("COP sin decimales", () => assert.equal(formatoCOP(1250000), "$ 1.250.000"));
  await caso("precio nulo = a cotizar", () => assert.equal(textoPrecio(null), "Precio a cotizar"));
  await caso("urlImagen agrega basePath", () => assert.equal(urlImagen("/img/x.webp"), "/tienda/img/x.webp"));
  await caso("urlImagen no duplica basePath", () => assert.equal(urlImagen("/tienda/img/x.webp"), "/tienda/img/x.webp"));
  await caso("urlImagen respeta data/https", () => {
    assert.equal(urlImagen("data:image/webp;base64,AA"), "data:image/webp;base64,AA");
    assert.equal(urlImagen("https://x.supabase.co/a.webp"), "https://x.supabase.co/a.webp");
  });
  await caso("urlImagen vacía = emblema", () => assert.equal(urlImagen(""), "/tienda/img/sotec-emblem.webp"));

  // ── Carrito
  let c = C.agregar([], panel);
  await caso("agregar crea ítem", () => assert.deepEqual([c.length, c[0].cantidad, c[0].precio], [1, 1, 690000]));
  c = C.agregar(c, panel, 2);
  await caso("agregar repetido suma cantidad", () => assert.equal(c[0].cantidad, 3));
  c = C.agregar(c, kit);
  await caso("agregar producto a cotizar", () => assert.equal(c[1].precio, null));
  await caso("resumen: total solo con precio", () => assert.deepEqual(C.resumen(c), { unidades: 4, total: 2070000, aCotizar: 1, referencias: 2 }));
  await caso("subtotal", () => assert.equal(C.subtotal(c[0]), 2070000));
  await caso("subtotal a cotizar = null", () => assert.equal(C.subtotal(c[1]), null));
  await caso("cambiar cantidad", () => assert.equal(C.cambiarCantidad(c, panel.id, 5)[0].cantidad, 5));
  await caso("cantidad 0 quita", () => assert.equal(C.cambiarCantidad(c, panel.id, 0).length, 1));
  await caso("cantidad tope 999", () => assert.equal(C.cambiarCantidad(c, panel.id, 5000)[0].cantidad, 999));
  await caso("cantidad no entera se redondea", () => assert.equal(C.cambiarCantidad(c, panel.id, 2.7)[0].cantidad, 2));
  await caso("quitar", () => assert.deepEqual(C.quitar(c, kit.id).map((x) => x.productoId), [panel.id]));
  await caso("tope de referencias", () => {
    let xs = C.agregar([], panel);
    for (let i = 0; i < 60; i++) xs = C.agregar(xs, { ...panel, id: `p${i}` });
    assert.equal(xs.length, C.ITEMS_MAXIMOS);
  });
  await caso("sincronizar actualiza precio y quita inactivos", () => {
    const cat: Producto[] = [{ ...panel, precio: 700000 }, { ...kit, activo: false }];
    const s = C.sincronizar(c, cat);
    assert.deepEqual(s.map((x) => [x.productoId, x.precio]), [[panel.id, 700000]]);
  });
  await caso("leerCarrito tolera basura", () => {
    assert.deepEqual(C.leerCarrito("{no json"), []);
    assert.deepEqual(C.leerCarrito('{"a":1}'), []);
    const l = C.leerCarrito(JSON.stringify([{ productoId: "x", nombre: "X", precio: -5, cantidad: "7", imagen: "" }, { nada: 1 }]));
    assert.deepEqual(l, [{ productoId: "x", nombre: "X", precio: null, cantidad: 7, imagen: "" }]);
  });

  // ── WhatsApp
  await caso("normaliza celular colombiano", () => assert.equal(normalizarNumero("310 469 6060"), "573104696060"));
  await caso("respeta indicativo", () => assert.equal(normalizarNumero("+57 310-469-6060"), "573104696060"));
  const cliente = { nombre: "Cliente Ficticio", celular: "3001234567", ciudad: "Cartagena", correo: "", nota: "Con instalación" };
  const m = mensajePedido(CONFIG_INICIAL, "T-ABC234", cliente, c);
  await caso("mensaje: saludo y código", () => {
    assert.ok(m.startsWith(CONFIG_INICIAL.mensajeInicial));
    assert.ok(m.includes("*Pedido T-ABC234*"));
  });
  await caso("mensaje: detalle por ítem", () => {
    assert.ok(m.includes("1. Panel solar monocristalino 550 W"));
    assert.ok(m.includes("Cantidad: 3 · Precio unitario: $ 690.000 · Subtotal: $ 2.070.000"));
    assert.ok(m.includes(`2. ${kit.nombre}`));
    assert.ok(m.includes("Cantidad: 1 · Precio unitario: Precio a cotizar"));
  });
  await caso("mensaje: total y a cotizar", () => assert.ok(m.includes("*Total: $ 2.070.000* (+ 1 producto a cotizar)")));
  await caso("mensaje: datos del cliente sin correo vacío", () => {
    assert.ok(m.includes("Nombre: Cliente Ficticio") && m.includes("Celular: 3001234567") && m.includes("Ciudad: Cartagena") && m.includes("Nota: Con instalación"));
    assert.ok(!m.includes("Correo:"));
  });
  await caso("enlace api.whatsapp.com codificado", () => {
    const u = new URL(enlaceWhatsApp("3104696060", m));
    assert.equal(u.origin + u.pathname, "https://api.whatsapp.com/send");
    assert.equal(u.searchParams.get("phone"), "573104696060");
    assert.equal(u.searchParams.get("text"), m);
  });

  // ── Antispam y validación
  await caso("honeypot", () => assert.deepEqual([esBot(""), esBot(undefined), esBot("http://spam")], [false, false, true]));
  await caso("límite de envíos", () => {
    const ahora = 1_000_000_000;
    const marcas = Array.from({ length: LIMITE_PEDIDOS }, (_, i) => ahora - i * 1000);
    assert.equal(revisarLimite(marcas, ahora).permitido, false);
    assert.equal(revisarLimite(marcas, ahora + VENTANA_MS + 1).permitido, true);
  });
  await caso("validación: datos correctos", () => assert.ok(esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "300 123 4567", ciudad: "Cartagena", correo: "" }).success));
  await caso("validación: celular inválido", () => assert.ok(!esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "12", ciudad: "Cartagena" }).success));
  await caso("validación: correo inválido", () => assert.ok(!esquemaCliente.safeParse({ nombre: "Ana Pérez", celular: "3001234567", ciudad: "Cartagena", correo: "x@" }).success));

  // ── Adaptador local
  const alm = almacenMemoria();
  const ses = almacenMemoria();
  const repo = crearRepoLocal(alm, ses);
  await caso("local: semilla de catálogo", async () => {
    assert.equal((await repo.categorias()).length, 6);
    assert.equal((await repo.productos()).length, PRODUCTOS_SEMILLA.length);
  });
  await caso("local: escribir exige sesión", async () => {
    await assert.rejects(repo.guardarProducto({ ...panel, nombre: "X" }), /Entra al panel/);
    await assert.rejects(repo.pedidos(), /Entra al panel/);
  });
  await repo.entrar("", "");
  await caso("local: sesión demo", async () => assert.equal(ses.getItem(CLAVE_SESION), "1"));
  await caso("local: crear y editar producto", async () => {
    const nuevo: Producto = { ...camara, id: "prd-prueba", nombre: "Producto de prueba", precio: 1000, orden: 999 };
    await repo.guardarProducto(nuevo);
    assert.equal((await repo.producto("prd-prueba"))?.nombre, "Producto de prueba");
    await repo.guardarProducto({ ...nuevo, activo: false });
    assert.ok(!(await repo.productos()).some((p) => p.id === "prd-prueba"));
    assert.ok((await repo.productos({ todos: true })).some((p) => p.id === "prd-prueba"));
  });
  await caso("local: categoría oculta oculta sus productos", async () => {
    const cats = await repo.categorias({ todas: true });
    const cctv = cats.find((x) => x.id === "cat-cctv")!;
    await repo.guardarCategoria({ ...cctv, activa: false });
    assert.ok(!(await repo.productos()).some((p) => p.categoriaId === "cat-cctv"));
    await repo.guardarCategoria(cctv);
  });
  await caso("local: no borra categoría con productos", async () => assert.rejects(repo.eliminarCategoria("cat-solar"), /tiene productos/));
  await caso("local: pedido recalcula precios del catálogo", async () => {
    const trucado = C.agregar([], { ...panel, precio: 1 }, 2);
    const p = await repo.crearPedido({ cliente, items: trucado });
    assert.equal(p.total, 1380000);
    assert.match(p.codigo, /^T-[2-9A-HJ-NP-Z]{6}$/);
    assert.equal(p.estado, "pendiente");
  });
  await caso("local: pedido vacío falla", async () => assert.rejects(repo.crearPedido({ cliente, items: [] }), /vacío/));
  await caso("local: pedido descarta productos ocultos", async () => {
    const p = await repo.crearPedido({ cliente, items: C.agregar(C.agregar([], panel), { ...camara, id: "prd-prueba" }) });
    assert.deepEqual(p.items.map((i) => i.productoId), [panel.id]);
  });
  await caso("local: listar y cambiar estado", async () => {
    const ps = await repo.pedidos();
    assert.equal(ps.length, 2);
    await repo.cambiarEstadoPedido(ps[0].id, "vendido");
    assert.equal((await repo.pedidos())[0].estado, "vendido");
  });
  await caso("local: configuración", async () => {
    await repo.guardarConfiguracion({ whatsapp: "573000000000", mensajeInicial: "Hola" });
    assert.equal((await repo.configuracion()).whatsapp, "573000000000");
  });
  await caso("local: persiste entre instancias", async () => {
    const otro = crearRepoLocal(alm, ses);
    assert.equal((await otro.pedidos()).length, 2);
  });
  await caso("local: datos dañados vuelven a la semilla", async () => {
    const a = almacenMemoria();
    a.setItem("sotec-tienda-v1", "{roto");
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
