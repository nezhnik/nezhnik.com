/**
 * Scroll reveal — замена Webflow SCROLLING_IN_VIEW.
 * Один скрипт на все страницы проектов.
 */
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );

  function showIfVisible(el) {
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
      el.classList.add('is-visible');
      return true;
    }
    return false;
  }

  els.forEach(function (el) {
    if (!showIfVisible(el)) {
      io.observe(el);
    }
  });
})();
