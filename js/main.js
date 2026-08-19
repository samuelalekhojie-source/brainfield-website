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
     Posts JSON to contact-handler.php (requires PHP hosting — see that
     file's header comment for static-host alternatives) and shows an
     inline success/error message without leaving the page. */
  var contactForm = document.querySelector("#contactForm");
  if (contactForm) {
    var statusBox = contactForm.querySelector("#formStatus");
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.innerHTML : "";

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

      fetch("contact-handler.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return { success: false, message: "Unexpected response from the server." }; });
        })
        .then(function (data) {
          showStatus(!!data.success, data.message || (data.success ? "Message sent." : "Something went wrong."));
          if (data.success) contactForm.reset();
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

  /* Current year in footer ------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
