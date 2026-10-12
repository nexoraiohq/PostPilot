/**
 * Fly-to-cart effect: clones the dish photo, arcs it from its card into the
 * header cart button, then pulses the cart. Honours prefers-reduced-motion.
 */
const CART_TARGET_SELECTOR = '[data-cart-target]'

function bumpCart(target: HTMLElement) {
  target.classList.remove('animate-cart-bump')
  void target.offsetWidth
  target.classList.add('animate-cart-bump')
  target.addEventListener('animationend', () => target.classList.remove('animate-cart-bump'), { once: true })
}

export function flyToCart(sourceImg: HTMLImageElement | null) {
  const target = document.querySelector<HTMLElement>(CART_TARGET_SELECTOR)
  if (!target) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!sourceImg || reducedMotion) {
    bumpCart(target)
    return
  }

  const from = sourceImg.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  if (from.width === 0 || from.height === 0) {
    bumpCart(target)
    return
  }

  const fly = document.createElement('img')
  fly.src = sourceImg.currentSrc || sourceImg.src
  fly.alt = ''
  fly.setAttribute('aria-hidden', 'true')
  Object.assign(fly.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    objectFit: 'cover',
    borderRadius: '1rem',
    pointerEvents: 'none',
    zIndex: '90',
    boxShadow: '0 16px 40px rgba(23, 23, 21, 0.28)',
    willChange: 'transform, opacity',
  })
  document.body.appendChild(fly)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)

  const animation = fly.animate(
    [
      { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
      {
        transform: `translate3d(${dx * 0.55}px, ${dy * 0.55 - 72}px, 0) scale(0.42) rotate(-3deg)`,
        opacity: 0.95,
        offset: 0.55,
      },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.05)`, opacity: 0, offset: 1 },
    ],
    { duration: 780, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
  )

  animation.onfinish = () => {
    fly.remove()
    bumpCart(target)
  }
}
