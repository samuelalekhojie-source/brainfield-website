// Brainfield Group — shared site behaviour
(function () {
  "use strict";

  /* Mobile nav toggle ---------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        document.body.classList.remove("menu-open");
      });
    });
  }

  /* Scroll reveal ---------------------------------------------------------*/
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el, i) {
      el.style.setProperty("--i", i % 6);
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Animated stat counters -------------------------------------------------*/
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var counted = new WeakSet();
    var cIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !counted.has(entry.target)) {
            counted.add(entry.target);
            animateCount(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { cIo.observe(el); });
  }

  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
    var duration = 1400;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = target * eased;
      el.textContent = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = decimals ? target.toFixed(decimals) : target.toLocaleString();
      }
    }
    requestAnimationFrame(step);
  }

  /* Video modal -------------------------------------------------------------*/
  var modal = document.querySelector("[data-video-modal]");
  if (modal) {
    var video = modal.querySelector("video");
    var openers = document.querySelectorAll("[data-video-open]");
    var closers = modal.querySelectorAll("[data-video-close]");

    openers.forEach(function (btn) {
      btn.addEventListener("click", function () {
        modal.classList.add("open");
        document.body.classList.add("menu-open");
        if (video) { video.currentTime = 0; video.play().catch(function () {}); }
      });
    });
    closers.forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
    function closeModal() {
      modal.classList.remove("open");
      document.body.classList.remove("menu-open");
      if (video) video.pause();
    }
  }

  /* Back to top ---------------------------------------------------------- */
  var backTop = document.querySelector(".back-to-top");
  if (backTop) {
    window.addEventListener("scroll", function () {
      backTop.classList.toggle("show", window.scrollY > 700);
    }, { passive: true });
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* Contact form submission ------------------------------------------------
     Wired for Netlify Forms (works because the site is hosted on Netlify —
     see the data-netlify attribute + hidden form-name field in contact.html).
     Netlify's own servers intercept this POST and handle storage/email
     notifications; there's no app code to run, which is why this is the
     right approach for a static host that can't execute PHP.

     Netlify doesn't return a JSON body — just an HTTP status — so success
     here means "response.ok", not a parsed message from the server.

     If Brainfield ever moves off Netlify to PHP-capable hosting instead,
     swap this block for a fetch() to contact-handler.php (kept in this
     project for that scenario) and remove the data-netlify/form-name
     markup from contact.html. */
  var contactForm = document.querySelector("#contactForm");
  if (contactForm) {
    var statusBox = contactForm.querySelector("#formStatus");
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.innerHTML : "";

    function encodeFormData(data) {
      return Object.keys(data)
        .map(function (key) { return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]); })
        .join("&");
    }

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var formData = new FormData(contactForm);
      var payload = {};
      formData.forEach(function (value, key) { payload[key] = value; });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Sending…";
      }
      showStatus(null, "Sending your message…");

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeFormData(payload)
      })
        .then(function (res) {
          if (res.ok) {
            var name = (payload.name || "").split(" ")[0];
            showStatus(true, (name ? "Thanks " + name : "Thanks") + " — we've received your message and will be in touch shortly.");
            contactForm.reset();
          } else {
            showStatus(false, "Something went wrong sending your message. Please email us directly at info@brainfieldng.com.");
          }
        })
        .catch(function () {
          showStatus(false, "Couldn't reach the server. Please email us directly at info@brainfieldng.com.");
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitLabel;
          }
        });
    });

    function showStatus(success, message) {
      if (!statusBox) return;
      statusBox.style.display = "block";
      statusBox.textContent = message;
      statusBox.style.background = success === null ? "var(--paper-dim)" : success ? "var(--agro-tint)" : "#FBEAEA";
      statusBox.style.color = success === null ? "var(--stone)" : success ? "var(--agro)" : "#8C1E1E";
      statusBox.style.border = "1px solid " + (success === null ? "var(--line)" : success ? "var(--agro-light)" : "#D98C8C");
    }
  }

  /* Slideshow / carousel ---------------------------------------------------
     Lightweight, dependency-free, supports multiple independent instances
     per page (each [data-slideshow] manages its own state via closures). */
  document.querySelectorAll("[data-slideshow]").forEach(function (root) {
    var track = root.querySelector(".slideshow-track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
    var dotsWrap = root.querySelector("[data-slide-dots]");
    var prevBtn = root.querySelector("[data-slide-prev]");
    var nextBtn = root.querySelector("[data-slide-next]");
    if (!track || slides.length < 2) return;

    var index = 0;
    var timer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slide-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", function () { goTo(i); restart(); });
      if (dotsWrap) dotsWrap.appendChild(dot);
    });
    var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (d, di) { d.classList.toggle("active", di === index); });
    }
    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }
    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 5000);
    }

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });

    // Touch swipe support.
    var startX = null;
    root.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); restart(); }
      startX = null;
    }, { passive: true });

    // Pause auto-advance while the user is looking at or interacting with it.
    root.addEventListener("mouseenter", function () { if (timer) clearInterval(timer); });
    root.addEventListener("mouseleave", restart);

    restart();
  });

  /* Current year in footer ------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
