(function () {
  'use strict';

  function init() {
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());

    /* ---- mobile menu ---- */
    var dialog = document.getElementById('menu');
    var openBtn = document.getElementById('menuOpen');
    var closeBtn = document.getElementById('menuClose');

    if (dialog && openBtn && typeof dialog.showModal === 'function') {
      var lockScroll = function (on) {
        document.documentElement.classList.toggle('no-scroll', on);
      };

      var show = function () {
        dialog.classList.remove('is-closing');
        dialog.showModal();
        openBtn.setAttribute('aria-expanded', 'true');
        lockScroll(true);
      };

      var close = function () {
        if (!dialog.open || dialog.classList.contains('is-closing')) return;
        dialog.classList.add('is-closing');
        lockScroll(false);
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.focus({ preventScroll: true });
        /* даём анимации закрытия доиграть, затем скрываем слой */
        var done = function () {
          dialog.classList.remove('is-closing');
          if (dialog.open) dialog.close();
        };
        if ('Animation' in window && typeof AnimationEvent !== 'undefined') {
          dialog.addEventListener('animationend', function handler(e) {
            if (e.target === dialog) {
              dialog.removeEventListener('animationend', handler);
              done();
            }
          }, { once: true });
        } else {
          setTimeout(done, 420);
        }
      };

      openBtn.addEventListener('click', show);

      if (closeBtn) closeBtn.addEventListener('click', close);

      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) close();
      });
      dialog.querySelectorAll('nav a').forEach(function (a) {
        a.addEventListener('click', close);
      });
      dialog.addEventListener('close', function () {
        openBtn.setAttribute('aria-expanded', 'false');
        lockScroll(false);
      });
    }

    /* ---- nav inverts while it sits over a dark section ---- */
    var navbar = document.querySelector('.navbar');
    var darkSections = document.querySelectorAll('[data-nav="dark"]');
    if (navbar && darkSections.length && 'IntersectionObserver' in window) {
      var navIO = null;
      var overlapping = new Set();

      var buildObserver = function () {
        if (navIO) navIO.disconnect();
        overlapping.clear();
        var h = navbar.offsetHeight;
        /* trigger a bit before the dark section reaches the header, so the 1.1s
           colour transition has room to run instead of snapping at the edge */
        var lead = 90;
        var top = Math.max(0, h - lead);
        navIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) overlapping.add(entry.target);
            else overlapping.delete(entry.target);
          });
          navbar.classList.toggle('is-dark', overlapping.size > 0);
        }, { rootMargin: '-' + top + 'px 0px -' + Math.max(0, window.innerHeight - top - 1) + 'px 0px' });
        darkSections.forEach(function (el) { navIO.observe(el); });
      };

      buildObserver();
      var t;
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(buildObserver, 150);
      });
    }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- parallax on photos: rAF loop, gated by visibility, no scroll listener ---- */
    var pxEls = document.querySelectorAll('[data-parallax]');
    if (!reduce && pxEls.length && 'IntersectionObserver' in window) {
      var visible = [];
      var running = false;

      var tick = function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        for (var i = 0; i < visible.length; i++) {
          var el = visible[i];
          var r = el.getBoundingClientRect();
          var span = vh + r.height;
          var p = span ? (vh - r.top) / span : 0.5;
          p = p < 0 ? 0 : p > 1 ? 1 : p;
          var amount = parseFloat(el.dataset.parallax) || 7;
          var base = parseFloat(el.dataset.parallaxBase) || 0;
          el.style.transform = 'translate3d(0,' + (base + (p - 0.5) * 2 * amount).toFixed(3) + '%,0)';
        }
        running = visible.length > 0;
        if (running) requestAnimationFrame(tick);
      };

      var pxIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var i = visible.indexOf(entry.target);
          if (entry.isIntersecting && i === -1) visible.push(entry.target);
          else if (!entry.isIntersecting && i !== -1) visible.splice(i, 1);
        });
        if (visible.length && !running) { running = true; requestAnimationFrame(tick); }
      }, { rootMargin: '15% 0px 15% 0px' });

      pxEls.forEach(function (el) { pxIO.observe(el); });
    }

    /* ---- soft accordion, one open at a time within a group ---- */
    if (!reduce && typeof Element.prototype.animate === 'function') {
      var OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';   /* ease-out for reveal */
      var IN = 'cubic-bezier(0.4, 0, 0.2, 1)';     /* ease-in-out for collapse */

      var expand = function (d) {
        d.open = true;
        var panel = d.querySelector('.topics_answer');
        var h = panel.scrollHeight;
        panel.animate(
          [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
          { duration: 360, easing: OUT }
        ).onfinish = function () { delete d.dataset.busy; };
      };
      var collapse = function (d) {
        var panel = d.querySelector('.topics_answer');
        var from = panel.scrollHeight;
        d.classList.add('is-closing');         /* keep the fill through the collapse */
        panel.animate(
          [{ height: from + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 300, easing: IN }
        ).onfinish = function () {
          d.open = false;
          d.classList.remove('is-closing');
          delete d.dataset.busy;
        };
      };

      document.querySelectorAll('.topics details').forEach(function (d) {
        var summary = d.querySelector('summary');
        if (!summary || !d.querySelector('.topics_answer')) return;
        summary.addEventListener('click', function (e) {
          e.preventDefault();
          if (d.dataset.busy) return;

          if (!d.open) {
            var group = d.closest('.topics');
            if (group) {
              group.querySelectorAll('details[open]').forEach(function (o) {
                if (o !== d && !o.dataset.busy) { o.dataset.busy = '1'; collapse(o); }
              });
            }
            d.dataset.busy = '1';
            expand(d);
          } else {
            d.dataset.busy = '1';
            collapse(d);
          }
        });
      });
    }

    /* ---- scroll reveal ---- */
    if (reduce || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('anim');
    var els = document.querySelectorAll('.reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
