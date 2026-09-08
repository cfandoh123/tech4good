/* Mobile nav toggle. The header links are hidden below 960px (see styles.css),
   so the hamburger is the only way to reach them on a phone. */
(function () {
  var nav = document.querySelector('nav.top');
  if (!nav) return;

  var toggle = nav.querySelector('.nav-toggle');
  var links = nav.querySelector('.nav-links');
  if (!toggle || !links) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Tapping outside the header dismisses the menu.
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
  });

  // Don't leave the menu "open" behind a desktop layout after a resize/rotate.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 960) setOpen(false);
  });
})();
