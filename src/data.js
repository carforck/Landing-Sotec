// Contenido de la landing. Fuente: sotecse.com (inicio, acerca de, contacto).
// Lo marcado con "VALIDAR" es redacción nueva que el cliente debe confirmar.

export const CONTACT = {
  phones: ['+57 310 469 6060', '+57 312 279 775'], // VALIDAR: el segundo número viene con 9 dígitos en el sitio original
  whatsapp: '573104696060',
  email: 'info@sotecse.com',
  address: 'Urb. Altos de Plan Parejo, Mz Y Lote 7',
  facebook: 'https://www.facebook.com/sotecjm',
  instagram: 'https://www.instagram.com/sotec91',
  instagramReel: 'https://www.instagram.com/reel/Ct4fPhhpRY1/',
};

export const waLink = (text = 'Hola, quiero información sobre los servicios de SOTEC.') =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'soluciones', label: 'Soluciones' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'galeria', label: 'Galería' },
  { id: 'presencia', label: 'Presencia' },
  { id: 'faq', label: 'Preguntas' },
  { id: 'contacto', label: 'Contacto' },
];

// Las tres líneas de negocio del sitio original + automatización (servicio residencial publicado).
// Los sub-servicios son VALIDAR: desglose típico de cada línea.
export const SERVICES = [
  {
    key: 'seguridad',
    icon: 'ShieldCheck',
    img: 'camara-muro',
    gallery: ['camara-ptz', 'control-acceso-torniquetes', 'citofonia-teclado'],
    title: 'Seguridad electrónica',
    short: 'Protege personas, bienes e instalaciones con tecnología confiable.',
    body:
      'Diseñamos e instalamos sistemas de seguridad a la medida de cada espacio, con equipos de calidad y acompañamiento antes, durante y después de la instalación.',
    items: [
      'Videovigilancia CCTV e IP',
      'Control de acceso',
      'Alarmas y sensores de intrusión',
      'Detección y protección contra incendio',
      'Conteo de personas',
      'Citofonía y videoporteros',
    ],
  },
  {
    key: 'telecom',
    icon: 'RadioTower',
    img: 'fibra-optica',
    gallery: ['torre-telecom', 'cableado-switch', 'fibra-optica-2'],
    title: 'Telecomunicaciones',
    short: 'Conectividad estable para hogares, empresas y proyectos.',
    body:
      'Implementamos infraestructura de red pensada para crecer: cableado, enlaces y cobertura inalámbrica que mantienen a tu equipo y tus sistemas conectados.',
    items: [
      'Cableado estructurado',
      'Redes WiFi de alta cobertura',
      'Fibra óptica',
      'Enlaces inalámbricos punto a punto',
      'Racks y centros de cableado',
      'Mantenimiento de redes',
    ],
  },
  {
    key: 'energia',
    icon: 'Sun',
    img: 'techo-solar',
    gallery: ['instalacion-solar', 'panel-solar-casa', 'parqueadero-solar'],
    title: 'Energías renovables',
    short: 'Energía solar eficiente que reduce costos y cuida el entorno.',
    body:
      'Llevamos la energía solar a tu hogar o negocio con sistemas dimensionados según tu consumo real, para que ahorres desde el primer mes.',
    items: [
      'Sistemas solares fotovoltaicos',
      'Soluciones on-grid y off-grid',
      'Respaldo con baterías',
      'Iluminación solar',
      'Estudio de consumo energético',
      'Mantenimiento de paneles',
    ],
  },
  {
    key: 'automatizacion',
    icon: 'Cpu',
    img: 'automatizacion-placa',
    gallery: ['residencial', 'tablero-electrico', 'citofonia-teclado'],
    title: 'Automatización',
    short: 'Espacios inteligentes que trabajan por ti.',
    body:
      'Integramos iluminación, accesos, cámaras y dispositivos para que controles tu hogar o empresa desde el celular, con escenas y alertas en tiempo real.',
    items: [
      'Domótica residencial',
      'Control desde app móvil',
      'Automatización de puertas y portones',
      'Iluminación inteligente',
      'Integración de sistemas',
      'Alertas y notificaciones',
    ],
  },
];

export const SEGMENTS = {
  residencial: {
    label: 'Hogar y conjuntos',
    img: 'residencial',
    title: 'Tranquilidad para tu familia',
    text:
      'Soluciones residenciales sencillas de usar, que protegen tu casa y te permiten verla y controlarla desde cualquier lugar.',
    cards: [
      { icon: 'House', title: 'Automatización', text: 'Luces, accesos y dispositivos controlados desde tu celular.' },
      { icon: 'Users', title: 'Conteo de personas', text: 'Control de aforo en zonas comunes y accesos.' },
      { icon: 'Flame', title: 'Protección contra incendio', text: 'Detección temprana para actuar a tiempo.' },
      { icon: 'Cctv', title: 'Videovigilancia', text: 'Mira tu casa en vivo, estés donde estés.' },
    ],
  },
  empresarial: {
    label: 'Empresas',
    img: 'comercio',
    title: 'Operación segura y conectada',
    text:
      'Infraestructura tecnológica para negocios que necesitan continuidad, control de accesos y conectividad sin interrupciones.',
    cards: [
      { icon: 'KeyRound', title: 'Control de acceso', text: 'Gestiona quién entra, a dónde y cuándo.' },
      { icon: 'Network', title: 'Redes empresariales', text: 'Cableado y WiFi listos para crecer con tu equipo.' },
      { icon: 'SunMedium', title: 'Energía solar', text: 'Reduce la factura de energía de tu operación.' },
      { icon: 'Users', title: 'Analítica de afluencia', text: 'Conteo de personas para decisiones con datos.' },
    ],
  },
};

// Las tres tarjetas del sitio original (Safe & Secure / 24×7 Support / Low Cost), traducidas y redactadas.
export const PILLARS = [
  { icon: 'ShieldCheck', title: 'Seguro y confiable', text: 'Equipos de calidad e instalaciones hechas por técnicos expertos.' },
  { icon: 'Headset', title: 'Soporte 24/7', text: 'Te acompañamos cuando lo necesites, también después de instalar.' },
  { icon: 'BadgeDollarSign', title: 'Costo eficiente', text: 'Soluciones a la medida de tu necesidad y de tu presupuesto.' },
];

export const ABOUT = {
  mision:
    'Brindar soluciones tecnológicas de alta calidad en telecomunicaciones, seguridad electrónica y energías renovables que respondan a las necesidades específicas de cada cliente, construyendo relaciones duraderas basadas en la confianza.',
  vision:
    'Ser la empresa de servicios tecnológicos especializados líder en Colombia y un referente regional, aportando al desarrollo sostenible y a la transformación digital de empresas y comunidades.',
  valores: ['Innovación', 'Satisfacción del cliente', 'Confianza', 'Atención personalizada', 'Compromiso'],
};

export const STEPS = [
  { icon: 'Search', title: 'Diagnóstico', text: 'Visitamos o analizamos tu espacio y escuchamos lo que necesitas.' },
  { icon: 'PencilRuler', title: 'Diseño', text: 'Proponemos una solución a la medida con una cotización clara.' },
  { icon: 'Wrench', title: 'Instalación', text: 'Nuestro equipo técnico instala, configura y prueba cada sistema.' },
  { icon: 'LifeBuoy', title: 'Acompañamiento', text: 'Capacitación, soporte y mantenimiento para que todo siga funcionando.' },
];

// VALIDAR: respuestas redactadas a partir de la propuesta del sitio.
export const FAQ = [
  {
    q: '¿Atienden hogares o solo empresas?',
    a: 'Ambos. Tenemos soluciones residenciales (automatización, cámaras, protección contra incendio) y empresariales (control de acceso, redes, energía solar, conteo de personas).',
  },
  {
    q: '¿Cómo solicito una cotización?',
    a: 'Escríbenos por WhatsApp o usa el formulario de esta página. Te contactamos para entender tu necesidad y, si hace falta, agendamos una visita técnica.',
  },
  {
    q: '¿Puedo ver mis cámaras desde el celular?',
    a: 'Sí. Configuramos los sistemas para que los veas en vivo y recibas alertas desde tu teléfono.',
  },
  {
    q: '¿La energía solar sirve para mi casa o negocio?',
    a: 'Hacemos un estudio de tu consumo y te proponemos el sistema que mejor se ajusta, con o sin baterías de respaldo.',
  },
  {
    q: '¿Ofrecen soporte después de la instalación?',
    a: 'Sí. Brindamos acompañamiento, mantenimiento y soporte para que tus sistemas sigan funcionando como el primer día.',
  },
];

export const KEYWORDS = [
  'CCTV', 'Control de acceso', 'Fibra óptica', 'Energía solar', 'Domótica', 'Alarmas',
  'Redes WiFi', 'Contra incendio', 'Conteo de personas', 'Cableado estructurado',
];

export const img = (name) => `${import.meta.env.BASE_URL}img/${name}.webp`;

export const HERO_SLIDES = ['control-acceso-torniquetes', 'fibra-optica', 'techo-solar', 'tablero-electrico'];

export const HERO_WORDS = ['Protegemos', 'Conectamos', 'Energizamos', 'Automatizamos'];

// Fotos de referencia (banco de imágenes del sitio actual). Reemplazar por fotos reales de proyectos cuando existan.
export const GALLERY_CATS = ['Todos', 'Seguridad', 'Telecomunicaciones', 'Energía solar', 'Instalación'];
export const GALLERY = [
  { src: 'camara-ptz', cat: 'Seguridad', title: 'Cámara PTZ para exteriores', tall: true },
  { src: 'control-acceso-torniquetes', cat: 'Seguridad', title: 'Control de acceso con torniquetes' },
  { src: 'torre-telecom', cat: 'Telecomunicaciones', title: 'Infraestructura de telecomunicaciones', tall: true },
  { src: 'techo-solar', cat: 'Energía solar', title: 'Sistema solar en cubierta' },
  { src: 'citofonia-teclado', cat: 'Seguridad', title: 'Citofonía y teclado de acceso' },
  { src: 'proyecto-rack', cat: 'Instalación', title: 'Organización de rack y centro de cableado', tall: true },
  { src: 'fibra-optica', cat: 'Telecomunicaciones', title: 'Conexiones de fibra óptica' },
  { src: 'instalacion-solar', cat: 'Energía solar', title: 'Montaje de paneles solares', tall: true },
  { src: 'camara-residencial', cat: 'Seguridad', title: 'Videovigilancia residencial', tall: true },
  { src: 'parqueadero-solar', cat: 'Energía solar', title: 'Parqueadero con cubierta solar' },
  { src: 'tecnico-tablero', cat: 'Instalación', title: 'Revisión de tableros eléctricos' },
  { src: 'cableado-switch', cat: 'Telecomunicaciones', title: 'Cableado estructurado' },
  { src: 'panel-solar-casa', cat: 'Energía solar', title: 'Energía solar para el hogar', tall: true },
  { src: 'tecnico-redes-aereas', cat: 'Instalación', title: 'Trabajo en redes aéreas' },
  { src: 'camara-muro', cat: 'Seguridad', title: 'Cámara domo en fachada', tall: true },
  { src: 'tecnico-cables', cat: 'Instalación', title: 'Conexionado eléctrico' },
];

// VALIDAR: ciudades y tipo de presencia. Solo la sede viene del sitio actual (Urb. Altos de Plan Parejo).
// Para agregar una ciudad basta con sumar una fila con su latitud y longitud.
export const PRESENCE_TYPES = {
  sede: { label: 'Sede principal', color: '#8fe04e' },
  proyectos: { label: 'Proyectos ejecutados', color: '#3ba30e' },
  cobertura: { label: 'Cobertura de servicio', color: '#97989a' },
};
export const PRESENCE = [
  { city: 'Cartagena y Turbaco', dept: 'Bolívar', lat: 10.391, lon: -75.479, type: 'sede', text: 'Base de operaciones y atención a toda la región Caribe.' },
  { city: 'Barranquilla', dept: 'Atlántico', lat: 10.964, lon: -74.796, type: 'proyectos', text: 'Seguridad electrónica y redes para comercio.' },
  { city: 'Santa Marta', dept: 'Magdalena', lat: 11.24, lon: -74.199, type: 'proyectos', text: 'Videovigilancia y control de acceso.' },
  { city: 'Sincelejo', dept: 'Sucre', lat: 9.304, lon: -75.397, type: 'cobertura', text: 'Instalación y mantenimiento.' },
  { city: 'Montería', dept: 'Córdoba', lat: 8.748, lon: -75.881, type: 'cobertura', text: 'Energía solar y seguridad.' },
  { city: 'Valledupar', dept: 'Cesar', lat: 10.463, lon: -73.253, type: 'cobertura', text: 'Soluciones solares y telecomunicaciones.' },
  { city: 'Riohacha', dept: 'La Guajira', lat: 11.544, lon: -72.907, type: 'cobertura', text: 'Energía solar para zonas apartadas.' },
  { city: 'Medellín', dept: 'Antioquia', lat: 6.244, lon: -75.581, type: 'proyectos', text: 'Proyectos de redes y control de acceso.' },
  { city: 'Bogotá', dept: 'Bogotá D.C.', lat: 4.711, lon: -74.072, type: 'proyectos', text: 'Proyectos corporativos de seguridad.' },
  { city: 'Bucaramanga', dept: 'Santander', lat: 7.119, lon: -73.123, type: 'cobertura', text: 'Telecomunicaciones y automatización.' },
  { city: 'Cali', dept: 'Valle del Cauca', lat: 3.451, lon: -76.532, type: 'cobertura', text: 'Seguridad electrónica empresarial.' },
];
