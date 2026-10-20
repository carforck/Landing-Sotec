import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUp, BadgeDollarSign, Check, Facebook, Headset, Instagram, Mail, MapPin, Menu, Minus, Phone, Plus,
  ShieldCheck, X,
} from 'lucide-react';
import {
  ABOUT, CONTACT, FAQ, HERO_SLIDES, NAV, PILLARS, SEGMENTS, SERVICES, STEPS, img, waLink,
} from './data.js';
import { reduced } from './fx.js';
import Gallery from './Gallery.jsx';
import PresenceMap from './PresenceMap.jsx';

const PILLAR_ICONS = { ShieldCheck, Headset, BadgeDollarSign };

const WhatsAppGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.2 4.23-9.42 9.43-9.42a9.37 9.37 0 0 1 9.42 9.43c0 5.2-4.23 9.42-9.42 9.42zm8.02-17.45A11.27 11.27 0 0 0 12.05.72C5.8.72.72 5.8.72 12.05c0 2 .52 3.95 1.52 5.66L.62 23.28l5.7-1.5a11.3 11.3 0 0 0 5.73 1.46c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.31-8z" />
  </svg>
);

const SLIDE_MS = 7000;

const tel = (p) => `tel:${p.replace(/\s/g, '')}`;

function useScrollEffects() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState('inicio');

  useEffect(() => {
    const root = document.documentElement;
    const still = reduced();
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      setScrolled(y > 8);
      // El encabezado se oculta al bajar y vuelve a aparecer al subir.
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
        lastY = y;
      }
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
      if (!still) {
        document.querySelectorAll('[data-parallax]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) return;
          const offset = (r.top + r.height / 2 - window.innerHeight / 2) * Number(el.dataset.parallax);
          el.style.setProperty('--py', `${offset.toFixed(1)}px`);
        });
      }
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    const revealObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('is-in'), revealObs.unobserve(e.target))),
      { threshold: 0.1 },
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

  return { scrolled, hidden, active };
}

/* ---------- Encabezado ---------- */

function TopBar() {
  return (
    <div className="topbar">
      <div className="container topbar__inner">
        <div className="topbar__info">
          <a href={tel(CONTACT.phones[0])}><Phone size={14} aria-hidden="true" /> {CONTACT.phones[0]}</a>
          <a href={`mailto:${CONTACT.email}`} className="hide-sm"><Mail size={14} aria-hidden="true" /> {CONTACT.email}</a>
        </div>
        <div className="topbar__social">
          <a href={CONTACT.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={15} /></a>
          <a href={CONTACT.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={15} /></a>
          <a href={waLink()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppGlyph width={15} height={15} /></a>
        </div>
      </div>
    </div>
  );
}

function Header({ scrolled, hidden, active }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('menu-open', open);
    if (open && headerRef.current) {
      const bottom = headerRef.current.getBoundingClientRect().bottom;
      headerRef.current.style.setProperty('--menu-top', `${Math.round(bottom)}px`);
    }
  }, [open]);

  return (
    <header ref={headerRef} className={`header ${scrolled ? 'is-scrolled' : ''} ${hidden && !open ? 'is-hidden' : ''}`}>
      <span className="progress" aria-hidden="true" />
      <div className="container header__inner">
        <a href="#inicio" className="brand" aria-label="SOTEC, inicio">
          <img src={img('sotec-emblem')} alt="" width="40" height="40" />
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
        <button className="burger" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}

/* ---------- Portada ---------- */

function Hero() {
  const [slide, setSlide] = useState(0);
  // Cada cambio de imagen (automático o por clic) reinicia los 7 segundos.
  useEffect(() => {
    if (reduced()) return undefined;
    const id = setTimeout(() => setSlide((x) => (x + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [slide]);

  return (
    <section id="inicio" className="hero">
      <div className="hero__bg" aria-hidden="true" data-parallax="-0.25">
        {HERO_SLIDES.map((s, i) => (
          <img key={s} src={img(s)} alt="" className={i === slide ? 'is-on' : ''} />
        ))}
      </div>
      <div className="container hero__inner">
        <p className="hero__kicker">Seguridad electrónica · Telecomunicaciones · Energías renovables</p>
        <h1>Tu acceso eficaz a la seguridad tecnológica</h1>
        <p className="hero__lead">
          Transformamos tus necesidades en soluciones confiables para hogares y empresas, con un equipo experto y
          atención personalizada en cada proyecto.
        </p>
        <div className="hero__actions">
          <a href="#contacto" className="btn btn--primary btn--lg">Solicitar cotización</a>
          <a href="#servicios" className="btn btn--light btn--lg">Conocer servicios</a>
        </div>
      </div>
      <div className="container hero__slides" role="group" aria-label="Imágenes de portada">
        {HERO_SLIDES.map((s, i) => (
          <button key={s} className={i === slide ? 'is-on' : ''} onClick={() => setSlide(i)} aria-label={`Imagen ${i + 1} de ${HERO_SLIDES.length}`}>
            <span key={i === slide ? `on-${slide}` : 'off'} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className="pillars" aria-label="Por qué elegirnos">
      <div className="container pillars__grid">
        {PILLARS.map((p) => {
          const I = PILLAR_ICONS[p.icon];
          return (
            <div className="pillar reveal" style={{ '--d': `${PILLARS.indexOf(p) * 90}ms` }} key={p.title}>
              <I size={28} aria-hidden="true" />
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Servicios ---------- */

function Services({ onQuote }) {
  return (
    <section id="servicios" className="section">
      <div className="container">
        <div className="head reveal">
          <div>
            <p className="kicker">Servicios</p>
            <h2>Soluciones integrales para proteger, conectar y energizar</h2>
          </div>
          <p>Cuatro líneas de servicio que se integran entre sí, con diseño, instalación y soporte a cargo de nuestro equipo técnico.</p>
        </div>
        <div className="services">
          {SERVICES.map((s, i) => (
            <article className="service reveal" style={{ '--d': `${i * 60}ms` }} key={s.key}>
              <div className="service__img">
                <img src={img(s.img)} alt={s.title} loading="lazy" />
              </div>
              <div className="service__body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <ul>
                  {s.items.slice(0, 4).map((it) => (
                    <li key={it}><Check size={16} aria-hidden="true" /> {it}</li>
                  ))}
                </ul>
                <a href="#contacto" className="link" onClick={() => onQuote(s.title)}>
                  Solicitar cotización <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Soluciones por tipo de cliente ---------- */

function Segments() {
  return (
    <section id="soluciones" className="section section--soft">
      <div className="container">
        <div className="head reveal">
          <div>
            <p className="kicker">Soluciones</p>
            <h2>Para hogares y para empresas</h2>
          </div>
          <p>Adaptamos cada proyecto al espacio, al uso y al presupuesto de nuestros clientes.</p>
        </div>
        <div className="segments">
          {Object.entries(SEGMENTS).map(([k, s]) => (
            <article className="segment reveal" key={k}>
              <div className="segment__img"><img src={img(s.img)} alt={s.label} loading="lazy" /></div>
              <div className="segment__body">
                <h3>{s.label}</h3>
                <p>{s.text}</p>
                <ul>
                  {s.cards.map((c) => (
                    <li key={c.title}><strong>{c.title}.</strong> {c.text}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Nosotros ---------- */

function About() {
  return (
    <section id="nosotros" className="section">
      <div className="container about">
        <div className="about__img reveal reveal--img">
          <img data-parallax="0.08" src={img('proyecto-rack')} alt="Técnico organizando un rack de comunicaciones" loading="lazy" />
        </div>
        <div className="about__copy reveal">
          <p className="kicker">Nosotros</p>
          <h2>La trayectoria de un equipo comprometido</h2>
          <p>
            SOTEC es una empresa colombiana del sector de servicios tecnológicos, fundada por un equipo con amplia
            experiencia en telecomunicaciones, seguridad electrónica y energías renovables.
          </p>
          <p>
            Nuestro enfoque es la satisfacción del cliente: atención cercana, respuestas adecuadas a cada necesidad y
            estándares de calidad en cada proyecto.
          </p>
          <dl className="mvv">
            <div><dt>Misión</dt><dd>{ABOUT.mision}</dd></div>
            <div><dt>Visión</dt><dd>{ABOUT.vision}</dd></div>
            <div><dt>Valores</dt><dd>{ABOUT.valores.join(' · ')}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ---------- Proceso ---------- */

function Process() {
  return (
    <section id="proceso" className="section section--soft">
      <div className="container">
        <div className="head reveal">
          <div>
            <p className="kicker">Cómo trabajamos</p>
            <h2>Un proceso claro de principio a fin</h2>
          </div>
          <p>Acompañamos cada etapa del proyecto, desde la primera visita hasta el soporte posterior.</p>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li className="step reveal" style={{ '--d': `${i * 60}ms` }} key={s.title}>
              <span className="step__num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Preguntas ---------- */

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="section">
      <div className="container faq">
        <div className="faq__head reveal">
          <p className="kicker">Preguntas frecuentes</p>
          <h2>Resolvemos tus dudas</h2>
          <p>Si no encuentras tu pregunta, escríbenos y te respondemos.</p>
          <a className="link" href={waLink('Hola, tengo una pregunta sobre sus servicios.')} target="_blank" rel="noreferrer">
            Escribir por WhatsApp <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="faq__list reveal">
          {FAQ.map((f, i) => (
            <div className={`qa ${open === i ? 'is-open' : ''}`} key={f.q}>
              <button aria-expanded={open === i} aria-controls={`qa-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                {open === i ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              </button>
              <div className="qa__a" id={`qa-${i}`} role="region">
                <div><p>{f.a}</p></div>
              </div>
            </div>
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
    <section id="contacto" className="section section--soft">
      <div className="container contact">
        <div className="contact__info reveal">
          <p className="kicker">Contacto</p>
          <h2>Solicita tu cotización</h2>
          <p>Cuéntanos qué necesitas y un asesor te contactará para entender tu proyecto y proponerte la mejor solución.</p>
          <ul className="contact__list">
            <li>
              <Phone size={20} aria-hidden="true" />
              <div>
                <small>Teléfonos</small>
                {CONTACT.phones.map((p) => <a key={p} href={tel(p)}>{p}</a>)}
              </div>
            </li>
            <li>
              <Mail size={20} aria-hidden="true" />
              <div><small>Correo</small><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
            </li>
            <li>
              <MapPin size={20} aria-hidden="true" />
              <div><small>Dirección</small><span>{CONTACT.address}</span></div>
            </li>
          </ul>
        </div>

        <form className="form reveal" onSubmit={submit}>
          {sent ? (
            <div className="form__sent">
              <h3>Gracias, {form.name.split(' ')[0]}.</h3>
              <p>Abrimos WhatsApp con tu mensaje listo. Si no se abrió, escríbenos a <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
              <button type="button" className="btn btn--outline" onClick={() => setSent(false)}>Enviar otro mensaje</button>
            </div>
          ) : (
            <>
              <div className="form__row">
                <label>Nombre<input required value={form.name} onChange={set('name')} autoComplete="name" /></label>
                <label>Teléfono<input value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></label>
              </div>
              <label>Correo electrónico<input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
              <label>
                Servicio de interés
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="">Información general</option>
                  {SERVICES.map((s) => <option key={s.key} value={s.title}>{s.title}</option>)}
                  <option value="Mantenimiento y soporte">Mantenimiento y soporte</option>
                </select>
              </label>
              <label>Mensaje<textarea required rows="4" value={form.message} onChange={set('message')} /></label>
              <button className="btn btn--primary btn--lg btn--block" type="submit">Enviar solicitud</button>
              <p className="form__note">Al enviar se abrirá WhatsApp con tu mensaje.</p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <a href="#inicio" className="brand brand--light">
            <img src={img('sotec-emblem')} alt="" width="40" height="40" loading="lazy" />
            <span className="brand__text"><strong>SOTEC</strong><small>Seguridad tecnológica</small></span>
          </a>
          <p>Telecomunicaciones, seguridad electrónica y energías renovables para hogares y empresas.</p>
        </div>
        <div>
          <h4>Servicios</h4>
          <ul>{SERVICES.map((s) => <li key={s.key}><a href="#servicios">{s.title}</a></li>)}</ul>
        </div>
        <div>
          <h4>Empresa</h4>
          <ul>{NAV.slice(1).map((n) => <li key={n.id}><a href={`#${n.id}`}>{n.label}</a></li>)}</ul>
        </div>
        <div>
          <h4>Contacto</h4>
          <ul>
            {CONTACT.phones.map((p) => <li key={p}><a href={tel(p)}>{p}</a></li>)}
            <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            <li>{CONTACT.address}</li>
          </ul>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} SOTEC. Todos los derechos reservados.</span>
        <span className="footer__social">
          <a href={CONTACT.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
          <a href={CONTACT.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          <a href={waLink()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppGlyph width={18} height={18} /></a>
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  const { scrolled, hidden, active } = useScrollEffects();
  const [purpose, setPurpose] = useState('');

  return (
    <>
      <a className="skip" href="#servicios">Ir al contenido</a>
      <TopBar />
      <Header scrolled={scrolled} hidden={hidden} active={active} />
      <main>
        <Hero />
        <Pillars />
        <Services onQuote={setPurpose} />
        <Segments />
        <About />
        <Gallery />
        <PresenceMap />
        <Process />
        <Faq />
        <Contact purpose={purpose} setPurpose={setPurpose} />
      </main>
      <Footer />
      <a className="wa-float" href={waLink()} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
        <WhatsAppGlyph width={26} height={26} />
      </a>
      <a className={`to-top ${scrolled ? 'is-on' : ''}`} href="#inicio" aria-label="Volver arriba"><ArrowUp size={20} /></a>
    </>
  );
}
