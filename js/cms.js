// Brainfield CMS — public site loader.
// Include AFTER the Supabase JS CDN script and cms-config.js, and BEFORE
// main.js (main.js still runs its own reveal/slideshow/lightbox setup for
// whatever is already in the HTML; this file fills in the editable bits
// and, for gallery/team sections, re-runs the bits of main.js that need
// to see the freshly-inserted elements).
(function () {
  "use strict";

  if (!window.supabase || !window.BRAINFIELD_SUPABASE_URL) {
    // Supabase not configured yet — the page just shows its built-in
    // static text, so nothing breaks while you're setting this up.
    return;
  }

  var client = window.supabase.createClient(
    window.BRAINFIELD_SUPABASE_URL,
    window.BRAINFIELD_SUPABASE_ANON_KEY
  );

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---- content_blocks: plain text / html / images ---------------------- */
  function applyContentBlocks(rows) {
    var map = {};
    rows.forEach(function (row) { map[row.key] = row.value; });

    document.querySelectorAll("[data-cms]").forEach(function (el) {
      var key = el.getAttribute("data-cms");
      if (map[key] != null) el.textContent = map[key];
    });
    document.querySelectorAll("[data-cms-html]").forEach(function (el) {
      var key = el.getAttribute("data-cms-html");
      if (map[key] != null) el.innerHTML = map[key];
    });
    document.querySelectorAll("[data-cms-img]").forEach(function (el) {
      var key = el.getAttribute("data-cms-img");
      if (map[key] != null) el.setAttribute("src", map[key]);
    });
    // Keeps tel: links pointing at the number actually shown, if the phone
    // number is ever changed from the dashboard.
    document.querySelectorAll("[data-cms-tel]").forEach(function (el) {
      var key = el.getAttribute("data-cms-tel");
      if (map[key] != null) el.setAttribute("href", "tel:" + map[key].replace(/[^0-9+]/g, ""));
    });
  }

  /* ---- team_members: renders into [data-cms-team="home|about|consult"] - */
  function renderTeamCard(member, compact) {
    var bioHtml = compact ? "" : '<p class="bio">' + escapeHtml(member.bio) + "</p>";
    return (
      '<div class="card team-card">' +
        '<div class="team-head">' +
          '<div class="avatar">' + escapeHtml(member.initials) + "</div>" +
          "<div><h4>" + escapeHtml(member.name) + '</h4><span class="role">' + escapeHtml(member.role) + "</span></div>" +
        "</div>" +
        bioHtml +
      "</div>"
    );
  }

  function applyTeamMembers(rows) {
    var targets = [
      { selector: '[data-cms-team="home"]', filterKey: "show_on_home", compact: false },
      { selector: '[data-cms-team="about"]', filterKey: "show_on_about", compact: false },
      { selector: '[data-cms-team="consult"]', filterKey: "show_on_consult", compact: true }
    ];
    targets.forEach(function (t) {
      var container = document.querySelector(t.selector);
      if (!container) return;
      var subset = rows
        .filter(function (m) { return m[t.filterKey]; })
        .sort(function (a, b) { return a.sort_order - b.sort_order; });
      container.innerHTML = subset.map(function (m) { return renderTeamCard(m, t.compact); }).join("");
    });
  }

  /* ---- gallery_images: renders into [data-cms-gallery] ------------------ */
  function renderGalleryTile(image) {
    var src = escapeHtml(image.image_url);
    var alt = escapeHtml(image.alt_text);
    return (
      '<div class="gallery-tile has-photo" data-lightbox-src="' + src + '" data-lightbox-sub="' + alt + '">' +
        '<img src="' + src + '" alt="' + alt + '" loading="lazy">' +
      "</div>"
    );
  }

  function applyGalleryImages(rows) {
    var container = document.querySelector("[data-cms-gallery]");
    if (!container) return;
    var sorted = rows.slice().sort(function (a, b) { return a.sort_order - b.sort_order; });
    container.innerHTML = sorted.map(renderGalleryTile).join("");
    // main.js already ran its own lightbox setup against the old (static)
    // tiles before this script's fetch resolved — re-run it now that the
    // real tiles are in the DOM. See main.js for reinitLightbox.
    if (window.reinitLightbox) window.reinitLightbox();
  }

  /* ---- go ---------------------------------------------------------------*/
  Promise.all([
    client.from("content_blocks").select("key, value"),
    client.from("team_members").select("*"),
    client.from("gallery_images").select("*")
  ]).then(function (results) {
    var content = results[0].data || [];
    var team = results[1].data || [];
    var gallery = results[2].data || [];
    applyContentBlocks(content);
    applyTeamMembers(team);
    applyGalleryImages(gallery);
  }).catch(function (err) {
    // Fails quietly — the page keeps its static fallback text.
    console.warn("Brainfield CMS: couldn't load content, showing defaults.", err);
  });
})();
