// Página «Tienda virtual · próximamente»: animación Lottie propia (public/lottie/tienda.json).
import lottie from 'lottie-web/build/player/lottie_light';
import './tienda.css';

const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = lottie.loadAnimation({
  container: document.getElementById('anim'),
  renderer: 'svg',
  loop: !quieto,
  autoplay: !quieto,
  path: `${import.meta.env.BASE_URL}lottie/tienda.json`,
});
if (quieto) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(15, true));
