/* DealVault page chrome extras — reveal-on-scroll niceties. */
(() => {
  const reveal = [...document.querySelectorAll('.cp-reveal')];
  if (!reveal.length) return;
  if (!('IntersectionObserver' in window)) {
    reveal.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  reveal.forEach((el) => io.observe(el));
})();
