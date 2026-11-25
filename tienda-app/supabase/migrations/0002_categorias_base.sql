-- Tienda virtual SOTEC · categorías base (las mismas del modo demostración).
-- Las fotos son archivos de la app (/img/categorias/…). Se editan o eliminan desde el panel; si ya
-- existen no se tocan. Los productos, marcas y banners NO se precargan: se cargan desde el panel.
insert into public.categorias (id, nombre, imagen, icono, orden, activa) values
  ('cat-computo', 'Cómputo', '', 'computador', 1, true),
  ('cat-servidores', 'Servidores y almacenamiento', '/img/categorias/telecom-rack-tecnico.webp', 'servidor', 2, true),
  ('cat-redes', 'Redes y telecomunicaciones', '/img/categorias/telecom-rack-cableado.webp', 'red', 3, true),
  ('cat-seguridad', 'Seguridad electrónica', '/img/categorias/cctv-instalacion-camara.webp', 'alarma', 4, true),
  ('cat-solar', 'Energía solar', '/img/categorias/panel-solar-casa.webp', 'sol', 5, true),
  ('cat-automatizacion', 'Automatización', '/img/categorias/tablero-electrico.webp', 'automatizacion', 6, true),
  ('cat-impresion', 'Impresión y periféricos', '', 'impresora', 7, true),
  ('cat-servicios', 'Servicios técnicos', '/img/categorias/redes-poste-tecnico.webp', 'herramienta', 8, true)
on conflict (id) do nothing;
