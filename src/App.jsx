import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, BadgeDollarSign, Building, Cctv, Check, ChevronDown, Circle, CircleCheck,
  Clock, Cpu, Facebook, Factory, Flame, Headset, House, Instagram, KeyRound, LifeBuoy, Mail, MapPin, Menu,
  Network, PencilRuler, Phone, Play, Plus, RadioTower, Search, Send, ShieldCheck, Siren, Store, Sun, SunMedium,
  Users, Wifi, Wrench, X,
} from 'lucide-react';
import {
  ABOUT, CONTACT, FAQ, HERO_SLIDES, HERO_WORDS, KEYWORDS, NAV, PILLARS, SEGMENTS, SERVICES, STEPS, img, waLink,
} from './data.js';
import { useCardFx, useInterval } from './fx.js';
import Gallery from './Gallery.jsx';
import PresenceMap from './PresenceMap.jsx';

const Icons = {
  ArrowLeft, ArrowRight, ArrowUp, BadgeDollarSign, Building, Cctv, Check, ChevronDown, Circle, CircleCheck,
  Clock, Cpu, Facebook, Factory, Flame, Headset, House, Instagram, KeyRound, LifeBuoy, Mail, MapPin, Menu,
  Network, PencilRuler, Phone, Play, Plus, RadioTower, Search, Send, ShieldCheck, Siren, Store, Sun, SunMedium,
  Users, Wifi, Wrench, X,
};

const Icon = ({ name, ...props }) => {
  const C = Icons[name] || Icons.Circle;
  return <C aria-hidden="true" {...props} />;
};

const WhatsAppGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.2 4.23-9.42 9.43-9.42a9.37 9.37 0 0 1 9.42 9.43c0 5.2-4.23 9.42-9.42 9.42zm8.02-17.45A11.27 11.27 0 0 0 12.05.72C5.8.72.72 5.8.72 12.05c0 2 .52 3.95 1.52 5.66L.62 23.28l5.7-1.5a11.3 11.3 0 0 0 5.73 1.46c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.31-8z" />
  </svg>
);

const Reveal = ({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) => (
  <Tag className={`reveal ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>
    {children}
  </Tag>
);

function useScrollEffects() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('inicio');

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty('--sp', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const revealObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('is-in'), revealObs.unobserve(e.target))),
      { threshold: 0.12 },
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));

    const navObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) navObs.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      revealObs.disconnect();
      navObs.disconnect();
    };
  }, []);

  return { scrolled, active };
}

/* ---------- Header ---------- */

function TopBar() {
  return (
    <div className="topbar">
      <div className="container topbar__inner">
        <div className="topbar__info">
          <a href={`tel:+${CONTACT.whatsapp}`}><Icon name="Phone" size={14} /> {CONTACT.phones[0]}</a>
          <a href={`mailto:${CONTACT.email}`}><Icon name="Mail" size={14} /> {CONTACT.email}</a>
          <span className="hide-sm"><Icon name="MapPin" size={14} /> {CONTACT.address}</span>
        </div>
        <div className="topbar__social">
          <a href={CONTACT.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Icon name="Facebook" size={15} /></a>
          <a href={CONTACT.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="Instagram" size={15} /></a>
          <a href={waLink()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppGlyph width={15} height={15} /></a>
        </div>
      </div>
    </div>
  );
}

function Header({ scrolled, active }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('menu-open', open);
    // El panel ocupa exactamente el alto visible bajo el header (con o sin la barra superior).
    if (open && headerRef.current) {
      const bottom = headerRef.current.getBoundingClientRect().bottom;
      headerRef.current.style.setProperty('--menu-top', `${Math.round(bottom)}px`);
    }
  }, [open]);

  return (
    <header ref={headerRef} className={`header ${scrolled ? 'is-scrolled' : ''}`}>
      <span className="progress-bar" aria-hidden="true" />
      <div className="container header__inner">
        <a href="#inicio" className="brand" aria-label="SOTEC, inicio">
          <img src={img('sotec-emblem')} alt="" width="44" height="44" />
          <span className="brand__text">
            <strong>SOTEC</strong>
            <small>Seguridad tecnológica</small>
          </span>
        </a>
        <nav className={`nav ${open ? 'is-open' : ''}`} aria-label="Principal">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className={active === n.id ? 'is-active' : ''} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
          <a href="#contacto" className="btn btn--primary nav__cta" onClick={() => setOpen(false)}>
            Solicitar cotización
          </a>
        </nav>
        <a href="#contacto" className="btn btn--primary btn--sm header__cta">Cotizar</a>
        <button className="burger" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'X' : 'Menu'} size={24} />
        </button>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

// Ojo/lente del logo convertido en un escáner animado.
function ScannerEye() {
  const nodes = [
    [70, 70], [52, 118], [92, 220], [248, 96], [262, 150], [228, 236],
  ];
  return (
    <div className="eye" aria-hidden="true">
      <svg viewBox="0 0 320 320" className="eye__svg">
        <defs>
          <radialGradient id="iris" cx="45%" cy="40%" r="60%">
            <stop offset="0" stopColor="#c9cacc" />
            <stop offset=".55" stopColor="#8d8e90" />
            <stop offset="1" stopColor="#3b3a3b" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" x2="1">
            <stop offset="0" stopColor="#3BA30E" stopOpacity="0" />
            <stop offset="1" stopColor="#3BA30E" stopOpacity=".55" />
          </linearGradient>
        </defs>
        <g className="eye__ring">
          <circle cx="160" cy="160" r="150" fill="none" stroke="#3BA30E" strokeWidth="6" strokeDasharray="300 70 180 60" strokeLinecap="round" />
        </g>
        <polygon className="eye__hex" points="160,30 272,95 272,225 160,290 48,225 48,95" fill="none" stroke="#3BA30E" strokeWidth="5" strokeLinejoin="round" />
        <g stroke="rgba(255,255,255,.28)" strokeWidth="1.2" fill="none">
          <path d="M70 70 L120 70 L140 100" />
          <path d="M52 118 L110 118" />
          <path d="M92 220 L120 196" />
          <path d="M248 96 L210 120" />
          <path d="M262 150 L222 150" />
          <path d="M228 236 L200 210 L180 210" />
          <path d="M160 40 V280 M40 160 H280" strokeDasharray="2 6" />
        </g>
        {nodes.map(([x, y], i) => (
          <circle key={i} className="eye__node" style={{ '--i': i }} cx={x} cy={y} r="7" fill="#58595b" stroke="#97989A" strokeWidth="2" />
        ))}
        <g className="eye__sweep">
          <path d="M160 160 L160 52 A108 108 0 0 1 253 106 Z" fill="url(#sweep)" />
        </g>
        <circle cx="160" cy="160" r="62" fill="#1d1f1e" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
        <circle cx="160" cy="160" r="50" fill="url(#iris)" />
        <circle className="eye__pupil" cx="160" cy="160" r="22" fill="#121212" />
        <circle cx="170" cy="148" r="8" fill="rgba(255,255,255,.75)" />
      </svg>
      <div className="chip chip--a"><span className="dot" /> Monitoreo activo</div>
      <div className="chip chip--b"><Icon name="Sun" size={14} /> Energía solar</div>
      <div className="chip chip--c"><Icon name="Wifi" size={14} /> Red estable</div>
    </div>
  );
}

function Hero() {
  const [slide, setSlide] = useState(0);
  const [word, setWord] = useState(0);
  useInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
  useInterval(() => setWord((w) => (w + 1) % HERO_WORDS.length), 2400);

  // Parallax suave del escáner con el mouse.
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  return (
    <section id="inicio" className="hero" onPointerMove={onMove}>
      <div className="hero__slides" aria-hidden="true">
        {HERO_SLIDES.map((s, i) => (
          <img key={s} src={img(s)} alt="" className={i === slide ? 'is-on' : ''} />
        ))}
      </div>
      <div className="hero__grid-bg" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__copy">
          <Reveal as="p" className="hero__badge">
            <span className="dot" />
            <span className="rotator" aria-live="polite">
              <b key={word}>{HERO_WORDS[word]}</b>
            </span>
            hogares y empresas en Colombia
          </Reveal>
          <Reveal as="p" className="eyebrow eyebrow--light">Telecomunicaciones · Seguridad electrónica · Energías renovables</Reveal>
          <Reveal as="h1" delay={80}>
            Tu acceso eficaz a la <span className="grad">seguridad tecnológica</span>
          </Reveal>
          <Reveal as="p" className="hero__lead" delay={160}>
            En SOTEC transformamos tus necesidades en soluciones innovadoras. Un equipo experto en telecomunicaciones,
            seguridad electrónica y energías renovables, dedicado a brindarte atención personalizada.
          </Reveal>
          <Reveal className="hero__actions" delay={240}>
            <a href="#contacto" className="btn btn--primary btn--lg">
              Solicitar cotización <Icon name="ArrowRight" size={18} />
            </a>
            <a href="#servicios" className="btn btn--ghost btn--lg">Ver servicios</a>
          </Reveal>
          <Reveal as="ul" className="hero__pillars" delay={320}>
            {PILLARS.map((p) => (
              <li key={p.title}><Icon name={p.icon} size={18} /> {p.title}</li>
            ))}
          </Reveal>
        </div>
        <Reveal className="hero__visual" delay={200}>
          <div className="hero__parallax">
            <ScannerEye />
          </div>
          <div className="hero__dots" role="group" aria-label="Imagen de fondo">
            {HERO_SLIDES.map((s, i) => (
              <button key={s} className={i === slide ? 'is-on' : ''} aria-label={`Imagen ${i + 1}`} onClick={() => setSlide(i)} />
            ))}
          </div>
        </Reveal>
      </div>
      <a href="#servicios" className="hero__scroll" aria-label="Ir a servicios"><Icon name="ChevronDown" size={22} /></a>
    </section>
  );
}

function Marquee() {
  const row = [...KEYWORDS, ...KEYWORDS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row.map((k, i) => (
          <span key={i}>{k}<i /></span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Servicios ---------- */

function Services({ onQuote }) {
  const [tab, setTab] = useState(SERVICES[0].key);
  const s = SERVICES.find((x) => x.key === tab);

  return (
    <section id="servicios" className="section">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">Nuestros servicios</p>
          <h2>Una sola empresa para proteger, conectar y energizar tus espacios</h2>
          <p>Cuatro líneas de servicio que se integran entre sí para darte una solución completa.</p>
        </Reveal>

        <Reveal className="svc">
          <div className="svc__tabs" role="tablist" aria-label="Servicios">
            {SERVICES.map((x) => (
              <button
                key={x.key}
                role="tab"
                id={`tab-${x.key}`}
                aria-selected={tab === x.key}
                aria-controls="svc-panel"
                className={`svc__tab fx ${tab === x.key ? 'is-active' : ''}`}
                onClick={() => setTab(x.key)}
              >
                <span className="svc__tab-icon"><Icon name={x.icon} size={22} /></span>
                <span>
                  <strong>{x.title}</strong>
                  <small>{x.short}</small>
                </span>
              </button>
            ))}
          </div>

          <ServicePanel s={s} onQuote={onQuote} key={tab} />
        </Reveal>
      </div>
    </section>
  );
}

function ServicePanel({ s, onQuote }) {
  const photos = [s.img, ...s.gallery];
  const [photo, setPhoto] = useState(0);
  return (
    <div className="svc__panel" role="tabpanel" id="svc-panel" aria-labelledby={`tab-${s.key}`}>
      <div className="svc__media">
        {photos.map((p, i) => (
          <img key={p} src={img(p)} alt={i === photo ? s.title : ''} className={i === photo ? 'is-on' : ''} loading="lazy" />
        ))}
        <div className="svc__thumbs">
          {photos.map((p, i) => (
            <button key={p} className={i === photo ? 'is-on' : ''} onClick={() => setPhoto(i)} aria-label={`Ver foto ${i + 1}`}>
              <img src={img(p)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
      <div className="svc__panel-icon"><Icon name={s.icon} size={34} /></div>
      <h3>{s.title}</h3>
      <p>{s.body}</p>
      <ul className="checklist">
        {s.items.map((it) => (
          <li key={it}><Icon name="CircleCheck" size={18} /> {it}</li>
        ))}
      </ul>
      <div className="svc__panel-actions">
        <a href="#contacto" className="btn btn--primary" onClick={() => onQuote(s.title)}>
          Cotizar {s.title.toLowerCase()} <Icon name="ArrowRight" size={16} />
        </a>
        <a href={waLink(`Hola, quiero información sobre ${s.title.toLowerCase()}.`)} target="_blank" rel="noreferrer" className="btn btn--outline">
          <WhatsAppGlyph width={16} height={16} /> Preguntar por WhatsApp
        </a>
      </div>
    </div>
  );
}

/* ---------- Soluciones por segmento ---------- */

function Segments() {
  const [seg, setSeg] = useState('residencial');
  const s = SEGMENTS[seg];
  return (
    <section id="soluciones" className="section section--tint">
      <div className="container seg">
        <Reveal className="seg__intro">
          <p className="eyebrow">Soluciones a tu medida</p>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
          <div className="seg__img" key={seg}>
            <img src={img(s.img)} alt={s.label} loading="lazy" />
          </div>
          <div className="switch" role="group" aria-label="Tipo de cliente">
            {Object.entries(SEGMENTS).map(([k, v]) => (
              <button key={k} aria-pressed={seg === k} className={seg === k ? 'is-active' : ''} onClick={() => setSeg(k)}>
                {v.label}
              </button>
            ))}
            <span className="switch__thumb" style={{ transform: `translateX(${seg === 'residencial' ? 0 : 100}%)` }} />
          </div>
        </Reveal>
        <div className="seg__cards" key={seg}>
          {s.cards.map((c, i) => (
            <div className="card card--pop fx" data-tilt="8" style={{ '--i': i }} key={c.title}>
              <span className="card__icon"><Icon name={c.icon} size={24} /></span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Nosotros ---------- */

function About() {
  const [tab, setTab] = useState('mision');
  return (
    <section id="nosotros" className="section">
      <div className="container about">
        <Reveal className="about__media">
          <div className="about__photo">
            <img src={img('tecnica')} alt="Técnica de SOTEC revisando documentos de un proyecto" loading="lazy" />
          </div>
          <figure className="about__project fx" data-tilt="10">
            <img src={img('proyecto-rack')} alt="Técnico organizando un rack de comunicaciones" loading="lazy" />
            <figcaption>Centros de cableado</figcaption>
          </figure>
          <div className="about__badge">
            <Icon name="Headset" size={22} />
            <span><strong>Soporte 24/7</strong>Atención personalizada</span>
          </div>
          <a className="about__reel" href={CONTACT.instagramReel} target="_blank" rel="noreferrer">
            <span className="play"><Icon name="Play" size={18} /></span> Míranos en acción
          </a>
        </Reveal>

        <div className="about__copy">
          <Reveal as="p" className="eyebrow">Quiénes somos</Reveal>
          <Reveal as="h2" delay={60}>La trayectoria de un equipo comprometido</Reveal>
          <Reveal as="p" delay={120}>
            SOTEC es una empresa colombiana que se ha consolidado en el sector de servicios tecnológicos. Fundada por un
            equipo de expertos con amplia trayectoria en telecomunicaciones, seguridad electrónica y energías renovables,
            nos dedicamos a ofrecer soluciones innovadoras y personalizadas.
          </Reveal>
          <Reveal as="p" delay={160}>
            Nuestro enfoque es la satisfacción del cliente: atención cercana y respuestas adecuadas a cada necesidad, con
            estándares de calidad y compromiso en cada proyecto.
          </Reveal>

          <Reveal className="mvv" delay={200}>
            <div className="mvv__tabs" role="tablist">
              {[['mision', 'Misión'], ['vision', 'Visión'], ['valores', 'Valores']].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-active' : ''} onClick={() => setTab(k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="mvv__body" key={tab}>
              {tab === 'valores' ? (
                <ul className="tags">
                  {ABOUT.valores.map((v) => <li key={v}>{v}</li>)}
                </ul>
              ) : (
                <p>{ABOUT[tab]}</p>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container pillars">
        {PILLARS.map((p, i) => (
          <Reveal className="pillar fx" data-tilt="6" key={p.title} delay={i * 90}>
            <span className="pillar__icon"><Icon name={p.icon} size={26} /></span>
            <div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Configurador ---------- */

const SPACES = [
  { k: 'Hogar', icon: 'House', img: 'residencial' },
  { k: 'Conjunto residencial', icon: 'Building', img: 'camara-residencial' },
  { k: 'Empresa o comercio', icon: 'Store', img: 'comercio' },
  { k: 'Industria o bodega', icon: 'Factory', img: 'industria' },
];
const NEEDS = [
  { k: 'Cámaras de seguridad', icon: 'Cctv' },
  { k: 'Control de acceso', icon: 'KeyRound' },
  { k: 'Alarmas y contra incendio', icon: 'Siren' },
  { k: 'Internet y redes', icon: 'Wifi' },
  { k: 'Energía solar', icon: 'Sun' },
  { k: 'Automatización', icon: 'Cpu' },
];
const WHEN = ['Lo antes posible', 'Este mes', 'Estoy explorando opciones'];

function Builder() {
  const [step, setStep] = useState(0);
  const [space, setSpace] = useState('');
  const [needs, setNeeds] = useState([]);
  const [when, setWhen] = useState('');

  const toggle = (k) => setNeeds((n) => (n.includes(k) ? n.filter((x) => x !== k) : [...n, k]));
  const canNext = [space, needs.length, when][step];
  const msg = useMemo(
    () => `Hola SOTEC, quiero una solución para: ${space}.\nNecesito: ${needs.join(', ')}.\nTiempo: ${when}.`,
    [space, needs, when],
  );
  const reset = () => { setStep(0); setSpace(''); setNeeds([]); setWhen(''); };

  return (
    <section className="section builder-wrap">
      <div className="container">
        <Reveal className="builder">
          <div className="builder__side">
            <p className="eyebrow eyebrow--light">Arma tu solución</p>
            <h2>¿Qué necesitas proteger o conectar?</h2>
            <p>Responde tres preguntas y envíanos tu solicitud por WhatsApp. Te respondemos con una propuesta a tu medida.</p>
            <ol className="builder__steps">
              {['Tipo de espacio', 'Necesidades', 'Tiempo'].map((l, i) => (
                <li key={l} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
                  <span>{i < step ? <Icon name="Check" size={14} /> : i + 1}</span>{l}
                </li>
              ))}
            </ol>
          </div>

          <div className="builder__main">
            {step < 3 && <div className="progress"><span style={{ width: `${(step / 3) * 100}%` }} /></div>}

            {step === 0 && (
              <div className="opts" key="s0">
                <h3>¿Dónde la necesitas?</h3>
                <div className="opts__grid">
                  {SPACES.map((o) => (
                    <button key={o.k} className={`opt opt--img fx ${space === o.k ? 'is-on' : ''}`} aria-pressed={space === o.k} onClick={() => setSpace(o.k)}>
                      <img src={img(o.img)} alt="" loading="lazy" />
                      <Icon name={o.icon} size={26} /> {o.k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="opts" key="s1">
                <h3>¿Qué te interesa? <small>Puedes elegir varias</small></h3>
                <div className="opts__grid opts__grid--3">
                  {NEEDS.map((o) => (
                    <button key={o.k} className={`opt fx ${needs.includes(o.k) ? 'is-on' : ''}`} aria-pressed={needs.includes(o.k)} onClick={() => toggle(o.k)}>
                      <Icon name={o.icon} size={26} /> {o.k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="opts" key="s2">
                <h3>¿Para cuándo?</h3>
                <div className="opts__list">
                  {WHEN.map((w) => (
                    <button key={w} className={`opt opt--row fx ${when === w ? 'is-on' : ''}`} aria-pressed={when === w} onClick={() => setWhen(w)}>
                      <Icon name="Clock" size={20} /> {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="summary" key="s3">
                <span className="summary__ok"><Icon name="CircleCheck" size={30} /></span>
                <h3>¡Listo! Este es tu resumen</h3>
                <dl>
                  <div><dt>Espacio</dt><dd>{space}</dd></div>
                  <div><dt>Necesidades</dt><dd>{needs.join(', ')}</dd></div>
                  <div><dt>Tiempo</dt><dd>{when}</dd></div>
                </dl>
                <div className="summary__actions">
                  <a className="btn btn--wa btn--lg" href={waLink(msg)} target="_blank" rel="noreferrer">
                    <WhatsAppGlyph width={18} height={18} /> Enviar por WhatsApp
                  </a>
                  <button className="btn btn--link" onClick={reset}>Empezar de nuevo</button>
                </div>
              </div>
            )}

            {step < 3 && (
              <div className="builder__nav">
                <button className="btn btn--link" disabled={step === 0} onClick={() => setStep(step - 1)}>
                  <Icon name="ArrowLeft" size={16} /> Atrás
                </button>
                <button className="btn btn--primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
                  {step === 2 ? 'Ver resumen' : 'Siguiente'} <Icon name="ArrowRight" size={16} />
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Proceso ---------- */

function Process() {
  return (
    <section id="proceso" className="section">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">Cómo trabajamos</p>
          <h2>De la idea a un sistema funcionando</h2>
          <p>Un proceso claro, con acompañamiento en cada etapa.</p>
        </Reveal>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" className="step fx" data-tilt="8" key={s.title} delay={i * 110}>
              <span className="step__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step__icon"><Icon name={s.icon} size={26} /></span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Redes ---------- */

function Social() {
  return (
    <section className="social">
      <div className="container social__inner">
        <Reveal>
          <h2>Conéctate con nosotros en redes sociales</h2>
          <p>Mira nuestros proyectos, instalaciones y novedades.</p>
        </Reveal>
        <Reveal className="social__links" delay={100}>
          <a href={CONTACT.instagram} target="_blank" rel="noreferrer"><Icon name="Instagram" size={20} /> @sotec91</a>
          <a href={CONTACT.facebook} target="_blank" rel="noreferrer"><Icon name="Facebook" size={20} /> /sotecjm</a>
          <a href={waLink()} target="_blank" rel="noreferrer"><WhatsAppGlyph width={20} height={20} /> WhatsApp</a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="section section--tint">
      <div className="container faq">
        <Reveal className="faq__head">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2>Resolvemos tus dudas</h2>
          <p>¿No encuentras tu pregunta? Escríbenos y te respondemos de inmediato.</p>
          <a className="btn btn--wa" href={waLink('Hola, tengo una pregunta sobre sus servicios.')} target="_blank" rel="noreferrer">
            <WhatsAppGlyph width={18} height={18} /> Escribir por WhatsApp
          </a>
        </Reveal>
        <div className="faq__list">
          {FAQ.map((f, i) => (
            <Reveal className={`qa fx ${open === i ? 'is-open' : ''}`} key={f.q} delay={i * 60}>
              <button aria-expanded={open === i} aria-controls={`qa-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                <Icon name="Plus" size={20} />
              </button>
              <div className="qa__a" id={`qa-${i}`} role="region">
                <div><p>{f.a}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Contacto ---------- */

function Contact({ purpose, setPurpose }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Sin backend: el formulario arma el mensaje y lo abre en WhatsApp.
  const submit = (e) => {
    e.preventDefault();
    const text =
      `Hola SOTEC, soy ${form.name}.\n` +
      `Motivo: ${purpose || 'Información general'}\n` +
      (form.phone ? `Teléfono: ${form.phone}\n` : '') +
      (form.email ? `Correo: ${form.email}\n` : '') +
      `\n${form.message}`;
    window.open(waLink(text), '_blank', 'noopener');
    setSent(true);
  };

  return (
    <section id="contacto" className="section contact-wrap">
      <img className="contact-wrap__bg" src={img('fibra-optica-2')} alt="" aria-hidden="true" loading="lazy" />
      <div className="container contact">
        <Reveal className="contact__info">
          <p className="eyebrow eyebrow--light">Contáctanos</p>
          <h2>Solicita tu cotización hoy</h2>
          <p>Estamos aquí para atenderte. Cuéntanos qué necesitas y te ayudamos a encontrar la mejor solución.</p>
          <ul className="contact__list">
            <li>
              <span><Icon name="Phone" size={20} /></span>
              <div>
                <small>Teléfonos</small>
                {CONTACT.phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>)}
              </div>
            </li>
            <li>
              <span><Icon name="Mail" size={20} /></span>
              <div><small>Correo</small><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
            </li>
            <li>
              <span><Icon name="MapPin" size={20} /></span>
              <div><small>Ubicación</small>{CONTACT.address}</div>
            </li>
          </ul>
        </Reveal>

        <Reveal as="form" className="form fx" onSubmit={submit} delay={100}>
          {sent ? (
            <div className="form__sent">
              <Icon name="CircleCheck" size={42} />
              <h3>¡Gracias, {form.name.split(' ')[0]}!</h3>
              <p>Abrimos WhatsApp con tu mensaje listo. Si no se abrió, escríbenos a <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
              <button type="button" className="btn btn--outline" onClick={() => setSent(false)}>Enviar otro mensaje</button>
            </div>
          ) : (
            <>
              <div className="form__row">
                <label>Nombre<input required value={form.name} onChange={set('name')} autoComplete="name" placeholder="Tu nombre" /></label>
                <label>Teléfono<input value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" placeholder="300 000 0000" /></label>
              </div>
              <label>Correo<input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="tu@correo.com" /></label>
              <label>
                Motivo de contacto
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="">Información general</option>
                  {SERVICES.map((s) => <option key={s.key} value={s.title}>{s.title}</option>)}
                  <option value="Mantenimiento y soporte">Mantenimiento y soporte</option>
                </select>
              </label>
              <label>Mensaje<textarea required rows="4" value={form.message} onChange={set('message')} placeholder="Cuéntanos qué necesitas" /></label>
              <button className="btn btn--primary btn--lg btn--block" type="submit">
                Enviar solicitud <Icon name="Send" size={18} />
              </button>
              <p className="form__note">Al enviar se abrirá WhatsApp con tu mensaje listo.</p>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <a href="#inicio" className="brand"><img src={img('sotec-emblem')} alt="" width="44" height="44" loading="lazy" /><span className="brand__text"><strong>SOTEC</strong><small>Seguridad tecnológica</small></span></a>
          <p>¡Tu acceso eficaz a la seguridad tecnológica! Telecomunicaciones, seguridad electrónica y energías renovables.</p>
        </div>
        <div>
          <h4>Servicios</h4>
          <ul>{SERVICES.map((s) => <li key={s.key}><a href="#servicios">{s.title}</a></li>)}</ul>
        </div>
        <div>
          <h4>Empresa</h4>
          <ul>{NAV.slice(2).map((n) => <li key={n.id}><a href={`#${n.id}`}>{n.label}</a></li>)}</ul>
        </div>
        <div>
          <h4>Contacto</h4>
          <ul>
            {CONTACT.phones.map((p) => <li key={p}><a href={`tel:${p.replace(/\s/g, '')}`}>{p}</a></li>)}
            <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            <li>{CONTACT.address}</li>
          </ul>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} SOTEC. Todos los derechos reservados.</span>
        <span className="footer__social">
          <a href={CONTACT.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Icon name="Facebook" size={18} /></a>
          <a href={CONTACT.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="Instagram" size={18} /></a>
          <a href={waLink()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppGlyph width={18} height={18} /></a>
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  const { scrolled, active } = useScrollEffects();
  useCardFx();
  const [purpose, setPurpose] = useState('');

  return (
    <>
      <a className="skip" href="#servicios">Ir al contenido</a>
      <TopBar />
      <Header scrolled={scrolled} active={active} />
      <main>
        <Hero />
        <Marquee />
        <Services onQuote={setPurpose} />
        <Segments />
        <About />
        <Gallery />
        <PresenceMap />
        <Builder />
        <Process />
        <Social />
        <Faq />
        <Contact purpose={purpose} setPurpose={setPurpose} />
      </main>
      <Footer />
      <a className="wa-float" href={waLink()} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
        <WhatsAppGlyph width={28} height={28} />
        <span>¿Hablamos?</span>
      </a>
      <a className={`to-top ${scrolled ? 'is-on' : ''}`} href="#inicio" aria-label="Volver arriba"><Icon name="ArrowUp" size={20} /></a>
    </>
  );
}
