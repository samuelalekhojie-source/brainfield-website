// Brainfield Admin — dashboard logic.
// Everything here talks to Supabase directly using the anon key from
// cms-config.js; writes only succeed once the person is logged in, because
// of the Row Level Security policies set up in supabase/schema.sql.
//
// Markup here deliberately reuses the public site's own component classes
// (.field, .btn, .small, .stack) from css/style.css wherever possible —
// admin.css only adds the handful of things the site doesn't already have
// (sidebar, accordion sections, the gallery manager, the toast).
(function () {
  "use strict";

  if (!window.supabase) {
    alert("Could not load Supabase. Check your internet connection and reload.");
    return;
  }

  var client = window.supabase.createClient(
    window.BRAINFIELD_SUPABASE_URL,
    window.BRAINFIELD_SUPABASE_ANON_KEY
  );

  var loginView = document.getElementById("loginView");
  var dashboardView = document.getElementById("dashboardView");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var logoutBtn = document.getElementById("logoutBtn");
  var userEmailEl = document.getElementById("userEmail");
  var navEl = document.getElementById("adminNav");
  var mainEl = document.getElementById("adminMain");
  var toastEl = document.getElementById("toast");

  var PAGES = [
    { key: "global", label: "Global" },
    { key: "home", label: "Home" },
    { key: "about", label: "About" },
    { key: "consult", label: "Services" },
    { key: "agro", label: "Agro" },
    { key: "gallery", label: "Gallery" },
    { key: "contact", label: "Contact" }
  ];

  var PAGE_HELP = {
    global: "These appear in the header and footer on every page of the site.",
    home: "Edit the text and images on your Home page.",
    about: "Edit the text on your About page. Team member cards are managed from Team members, below.",
    consult: "Edit the text on your Services page. Team member cards are managed from Team members, below.",
    agro: "Edit the text and images on your Agro page.",
    gallery: "Edit the intro text below, then manage the photo grid further down.",
    contact: "Edit the text and corporate contact details on your Contact page.",
    __team: "These cards feed the Home, About and Services pages. Tick which pages each person should appear on, and use the arrows to reorder them."
  };

  var currentPage = "home";

  function showToast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = "admin-toast" + (isError ? " error" : "");
    toastEl.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  // Shown in place of a broken image (bad URL, deleted file, wrong path)
  // instead of the browser's default broken-image icon. No network request —
  // it's an inline SVG, so it always renders.
  var FALLBACK_IMG =
    "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E" +
    "%3Crect width=%22200%22 height=%22200%22 fill=%22%23eee7df%22/%3E" +
    "%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 " +
    "fill=%22%23a89c8c%22 font-family=%22sans-serif%22 font-size=%2213%22%3EImage unavailable%3C/text%3E%3C/svg%3E";
  function onImgError() {
    return "this.onerror=null;this.src='" + FALLBACK_IMG + "'";
  }

  /* ============================ AUTH ==================================== */
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var email = document.getElementById("loginEmail").value.trim();
    var password = document.getElementById("loginPassword").value;
    client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) {
        loginError.textContent = res.error.message;
        loginError.hidden = false;
        return;
      }
      enterDashboard();
    });
  });

  logoutBtn.addEventListener("click", function () {
    client.auth.signOut().then(function () { location.reload(); });
  });

  function checkSession() {
    client.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        enterDashboard();
      } else {
        loginView.hidden = false;
        dashboardView.hidden = true;
      }
    });
  }

  function enterDashboard() {
    client.auth.getUser().then(function (res) {
      userEmailEl.textContent = res.data && res.data.user ? res.data.user.email : "";
    });
    loginView.hidden = true;
    dashboardView.hidden = false;
    buildNav();
    loadPage(currentPage);
  }

  /* ============================ NAV ===================================== */
  function buildNav() {
    var pageButtons = PAGES.map(function (p) {
      return '<button class="admin-nav-btn" data-page="' + p.key + '">' + p.label + "</button>";
    }).join("");
    navEl.innerHTML =
      '<div class="admin-nav-group"><span class="mono-label admin-nav-group-label">Pages</span>' + pageButtons + "</div>" +
      '<div class="admin-nav-group"><span class="mono-label admin-nav-group-label">Manage</span>' +
        '<button class="admin-nav-btn" data-page="__team">Team members</button>' +
      "</div>";

    navEl.querySelectorAll(".admin-nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentPage = btn.getAttribute("data-page");
        highlightNav();
        loadPage(currentPage);
      });
    });
    highlightNav();
  }
  function highlightNav() {
    navEl.querySelectorAll(".admin-nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-page") === currentPage);
    });
  }
  function labelForPage(key) {
    var found = PAGES.filter(function (p) { return p.key === key; })[0];
    return found ? found.label : key;
  }

  /* ============================ CONTENT BLOCKS ============================ */
  function loadPage(pageKey) {
    mainEl.innerHTML = '<p class="small">Loading…</p>';
    if (pageKey === "__team") { loadTeamPanel(); return; }
    client.from("content_blocks").select("*").eq("page", pageKey).order("sort_order")
      .then(function (res) {
        if (res.error) { mainEl.innerHTML = '<p class="admin-error">Could not load: ' + res.error.message + "</p>"; return; }
        renderBlockForm(pageKey, res.data || []);
        if (pageKey === "gallery") loadGalleryPanel();
      });
  }

  function groupBySection(rows) {
    var groups = {};
    var order = [];
    rows.forEach(function (r) {
      if (!groups[r.section]) { groups[r.section] = []; order.push(r.section); }
      groups[r.section].push(r);
    });
    return { groups: groups, order: order };
  }

  function fieldInput(row) {
    if (row.type === "image") {
      return (
        '<div class="admin-image-row">' +
          '<img src="' + escapeAttr(row.value) + '" alt="" class="admin-image-preview" data-preview="' + row.key + '" onerror="' + onImgError() + '">' +
          '<input type="text" data-key="' + row.key + '" value="' + escapeAttr(row.value) + '" placeholder="Image URL">' +
          '<label class="btn btn-ghost btn-sm admin-upload-btn">Upload<input type="file" accept="image/*" data-upload-key="' + row.key + '" hidden></label>' +
        "</div>"
      );
    }
    if (row.type === "textarea" || row.type === "html") {
      return '<textarea data-key="' + row.key + '" rows="3">' + escapeHtml(row.value) + "</textarea>";
    }
    return '<input type="text" data-key="' + row.key + '" value="' + escapeAttr(row.value) + '">';
  }

  function renderBlockForm(pageKey, rows) {
    var grouped = groupBySection(rows);
    var html =
      '<div class="admin-page-head"><h2>' + labelForPage(pageKey) + "</h2>" +
      '<p class="small">' + (PAGE_HELP[pageKey] || "") + "</p></div>";

    if (grouped.order.length > 1) {
      html +=
        '<div class="admin-expand-controls">' +
          '<button type="button" class="link-arrow" data-expand-all>Expand all</button>' +
          '<button type="button" class="link-arrow" data-collapse-all>Collapse all</button>' +
        "</div>";
    }

    grouped.order.forEach(function (section, idx) {
      var isOpen = idx === 0;
      html +=
        '<div class="admin-section-card">' +
          '<button type="button" class="admin-section-toggle" aria-expanded="' + isOpen + '">' +
            "<span>" + escapeHtml(section) + '</span><span class="admin-chevron">⌄</span>' +
          "</button>" +
          '<div class="admin-section-body"' + (isOpen ? "" : " hidden") + ">";
      grouped.groups[section].forEach(function (row) {
        html += '<div class="field"><label>' + escapeHtml(row.label) + "</label>" + fieldInput(row) + "</div>";
      });
      html += "</div></div>";
    });

    html += '<button id="saveBtn" class="btn btn-primary">Save changes</button>';
    html += '<div id="galleryPanelMount"></div>';
    mainEl.innerHTML = html;

    mainEl.querySelectorAll(".admin-section-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var body = btn.nextElementSibling;
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        body.hidden = open;
      });
    });
    var expandAllBtn = mainEl.querySelector("[data-expand-all]");
    var collapseAllBtn = mainEl.querySelector("[data-collapse-all]");
    if (expandAllBtn) expandAllBtn.addEventListener("click", function () { setAllSections(true); });
    if (collapseAllBtn) collapseAllBtn.addEventListener("click", function () { setAllSections(false); });

    document.getElementById("saveBtn").addEventListener("click", function () { saveBlocks(pageKey); });
    mainEl.querySelectorAll("input[data-upload-key]").forEach(function (input) {
      input.addEventListener("change", function (e) { handleImageUpload(e, input.getAttribute("data-upload-key")); });
    });
  }

  function setAllSections(open) {
    mainEl.querySelectorAll(".admin-section-toggle").forEach(function (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.nextElementSibling.hidden = !open;
    });
  }

  function uploadImage(file, folder) {
    var cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    var path = folder + "/" + Date.now() + "-" + cleanName;
    return client.storage.from("site-images").upload(path, file, { upsert: false }).then(function (res) {
      if (res.error) throw res.error;
      var pub = client.storage.from("site-images").getPublicUrl(path);
      return pub.data.publicUrl;
    });
  }

  function handleImageUpload(e, key) {
    var file = e.target.files[0];
    if (!file) return;
    showToast("Uploading…");
    uploadImage(file, "content").then(function (url) {
      var textInput = mainEl.querySelector('input[data-key="' + key + '"]');
      if (textInput) textInput.value = url;
      var preview = mainEl.querySelector('img[data-preview="' + key + '"]');
      if (preview) { preview.src = url; }
      showToast("Image uploaded — click Save changes to publish it.");
    }).catch(function (err) {
      showToast("Upload failed: " + err.message, true);
    });
  }

  function saveBlocks(pageKey) {
    var inputs = mainEl.querySelectorAll("[data-key]");
    var updates = [];
    inputs.forEach(function (el) { updates.push({ key: el.getAttribute("data-key"), value: el.value }); });
    showToast("Saving…");
    var chain = Promise.resolve();
    updates.forEach(function (u) {
      chain = chain.then(function () {
        return client.from("content_blocks").update({ value: u.value, updated_at: new Date().toISOString() }).eq("key", u.key);
      }).then(function (res) {
        if (res.error) throw new Error(u.key + ": " + res.error.message);
      });
    });
    chain.then(function () {
      showToast("Saved! Refresh the live site to see the changes.");
    }).catch(function (err) {
      showToast("Save failed — " + err.message, true);
    });
  }

  /* ============================ TEAM MEMBERS ============================ */
  function loadTeamPanel() {
    client.from("team_members").select("*").order("sort_order").then(function (res) {
      if (res.error) { mainEl.innerHTML = '<p class="admin-error">' + res.error.message + "</p>"; return; }
      renderTeamPanel(res.data || []);
    });
  }

  function renderTeamPanel(members) {
    var html =
      '<div class="admin-page-head"><h2>Team members</h2>' +
      '<p class="small">' + PAGE_HELP.__team + "</p></div>";
    members.forEach(function (m, i) { html += teamMemberCard(m, i, members.length); });
    html += '<button id="addMemberBtn" class="btn btn-ghost">+ Add team member</button>';
    mainEl.innerHTML = html;

    mainEl.querySelectorAll("[data-team-save]").forEach(function (btn) {
      btn.addEventListener("click", function () { saveTeamMember(btn.getAttribute("data-team-save")); });
    });
    mainEl.querySelectorAll("[data-team-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteTeamMember(btn.getAttribute("data-team-delete")); });
    });
    mainEl.querySelectorAll("[data-team-up]").forEach(function (btn) {
      btn.addEventListener("click", function () { moveTeamMember(members, btn.getAttribute("data-team-up"), -1); });
    });
    mainEl.querySelectorAll("[data-team-down]").forEach(function (btn) {
      btn.addEventListener("click", function () { moveTeamMember(members, btn.getAttribute("data-team-down"), 1); });
    });
    document.getElementById("addMemberBtn").addEventListener("click", addTeamMember);
  }

  function teamMemberCard(m, index, total) {
    return (
      '<div class="admin-section-card" data-team-id="' + m.id + '">' +
        '<div class="admin-team-card" style="padding:1.35rem;">' +
          '<div class="admin-order-btns">' +
            '<button ' + (index === 0 ? "disabled" : "") + ' data-team-up="' + m.id + '" aria-label="Move up">▲</button>' +
            '<button ' + (index === total - 1 ? "disabled" : "") + ' data-team-down="' + m.id + '" aria-label="Move down">▼</button>' +
          "</div>" +
          '<div class="admin-team-fields">' +
            '<div class="field"><label>Name</label><input data-team-field="name" value="' + escapeAttr(m.name) + '"></div>' +
            '<div class="field"><label>Role</label><input data-team-field="role" value="' + escapeAttr(m.role) + '"></div>' +
            '<div class="field"><label>Initials (shown as the avatar)</label><input data-team-field="initials" maxlength="3" value="' + escapeAttr(m.initials) + '"></div>' +
            '<div class="field"><label>Bio</label><textarea data-team-field="bio" rows="3">' + escapeHtml(m.bio) + "</textarea></div>" +
            '<div class="admin-checks">' +
              '<label><input type="checkbox" data-team-field="show_on_home" ' + (m.show_on_home ? "checked" : "") + "> Show on Home</label>" +
              '<label><input type="checkbox" data-team-field="show_on_about" ' + (m.show_on_about ? "checked" : "") + "> Show on About</label>" +
              '<label><input type="checkbox" data-team-field="show_on_consult" ' + (m.show_on_consult ? "checked" : "") + "> Show on Services</label>" +
            "</div>" +
            '<div class="admin-actions">' +
              '<button class="btn btn-primary btn-sm" data-team-save="' + m.id + '">Save</button>' +
              '<button class="btn btn-ghost btn-sm" data-team-delete="' + m.id + '">Remove</button>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function saveTeamMember(id) {
    var card = mainEl.querySelector('[data-team-id="' + id + '"]');
    var payload = {};
    card.querySelectorAll("[data-team-field]").forEach(function (el) {
      var field = el.getAttribute("data-team-field");
      payload[field] = el.type === "checkbox" ? el.checked : el.value;
    });
    showToast("Saving…");
    client.from("team_members").update(payload).eq("id", id).then(function (res) {
      if (res.error) { showToast("Save failed: " + res.error.message, true); return; }
      showToast("Saved!");
    });
  }

  function deleteTeamMember(id) {
    if (!confirm("Remove this team member from the site?")) return;
    client.from("team_members").delete().eq("id", id).then(function (res) {
      if (res.error) { showToast("Delete failed: " + res.error.message, true); return; }
      loadTeamPanel();
    });
  }

  function addTeamMember() {
    client.from("team_members").insert({ name: "New team member", role: "Role", bio: "", initials: "NN", sort_order: 999 })
      .then(function (res) {
        if (res.error) { showToast("Could not add: " + res.error.message, true); return; }
        loadTeamPanel();
      });
  }

  function moveTeamMember(members, id, dir) {
    var idx = members.findIndex(function (m) { return String(m.id) === String(id); });
    var swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= members.length) return;
    var a = members[idx], b = members[swapIdx];
    var aOrder = a.sort_order, bOrder = b.sort_order;
    showToast("Reordering…");
    Promise.all([
      client.from("team_members").update({ sort_order: bOrder }).eq("id", a.id),
      client.from("team_members").update({ sort_order: aOrder }).eq("id", b.id)
    ]).then(function () { loadTeamPanel(); });
  }

  /* ============================ GALLERY IMAGES =========================== */
  function loadGalleryPanel() {
    var mount = document.getElementById("galleryPanelMount");
    if (!mount) return;
    client.from("gallery_images").select("*").order("sort_order").then(function (res) {
      if (res.error) { mount.innerHTML = '<p class="admin-error">' + res.error.message + "</p>"; return; }
      renderGalleryPanel(mount, res.data || []);
    });
  }

  function renderGalleryPanel(mount, images) {
    var html =
      '<div class="admin-section-card"><div style="padding:1.35rem;">' +
        "<h3>Gallery images</h3>" +
        '<p class="small" style="margin-top:0.3rem;">These populate the Gallery page.</p>' +
        '<div class="admin-gallery-grid">';
    images.forEach(function (img, i) {
      html +=
        '<div class="admin-gallery-item" data-gallery-id="' + img.id + '">' +
          '<div class="admin-gallery-thumb"><img src="' + escapeAttr(img.image_url) + '" alt="" onerror="' + onImgError() + '"></div>' +
          '<input class="admin-gallery-alt" data-gallery-field="alt_text" value="' + escapeAttr(img.alt_text) + '" placeholder="Description" aria-label="Description" title="' + escapeAttr(img.alt_text) + '">' +
          '<div class="admin-gallery-controls">' +
            '<div class="admin-gallery-order">' +
              '<button ' + (i === 0 ? "disabled" : "") + ' data-gallery-up="' + img.id + '" aria-label="Move up">▲</button>' +
              '<button ' + (i === images.length - 1 ? "disabled" : "") + ' data-gallery-down="' + img.id + '" aria-label="Move down">▼</button>' +
            "</div>" +
            '<div class="admin-gallery-save-remove">' +
              '<button class="btn btn-primary btn-sm" data-gallery-save="' + img.id + '">Save</button>' +
              '<button class="btn btn-ghost btn-sm" data-gallery-delete="' + img.id + '">Remove</button>' +
            "</div>" +
          "</div>" +
        "</div>";
    });
    html += "</div>" +
      '<label class="btn btn-primary btn-sm admin-upload-btn" style="margin-top:1.1rem;">+ Add image<input type="file" accept="image/*" id="addGalleryImage" hidden></label>' +
    "</div></div>";
    mount.innerHTML = html;

    mount.querySelectorAll("[data-gallery-save]").forEach(function (btn) {
      btn.addEventListener("click", function () { saveGalleryImage(btn.getAttribute("data-gallery-save")); });
    });
    mount.querySelectorAll("[data-gallery-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteGalleryImage(btn.getAttribute("data-gallery-delete")); });
    });
    mount.querySelectorAll("[data-gallery-up]").forEach(function (btn) {
      btn.addEventListener("click", function () { moveGalleryImage(images, btn.getAttribute("data-gallery-up"), -1); });
    });
    mount.querySelectorAll("[data-gallery-down]").forEach(function (btn) {
      btn.addEventListener("click", function () { moveGalleryImage(images, btn.getAttribute("data-gallery-down"), 1); });
    });
    document.getElementById("addGalleryImage").addEventListener("change", addGalleryImage);
  }

  function saveGalleryImage(id) {
    var item = mainEl.querySelector('[data-gallery-id="' + id + '"]');
    var altText = item.querySelector('[data-gallery-field="alt_text"]').value;
    client.from("gallery_images").update({ alt_text: altText }).eq("id", id).then(function (res) {
      if (res.error) { showToast("Save failed: " + res.error.message, true); return; }
      showToast("Saved!");
    });
  }

  function deleteGalleryImage(id) {
    if (!confirm("Remove this image from the gallery?")) return;
    client.from("gallery_images").delete().eq("id", id).then(function (res) {
      if (res.error) { showToast("Delete failed: " + res.error.message, true); return; }
      loadGalleryPanel();
    });
  }

  function addGalleryImage(e) {
    var file = e.target.files[0];
    if (!file) return;
    showToast("Uploading…");
    uploadImage(file, "gallery").then(function (url) {
      return client.from("gallery_images").select("id", { count: "exact", head: true }).then(function (countRes) {
        var nextOrder = (countRes.count || 0) + 1;
        return client.from("gallery_images").insert({ image_url: url, alt_text: "", sort_order: nextOrder });
      });
    }).then(function (res) {
      if (res && res.error) throw res.error;
      showToast("Image added!");
      loadGalleryPanel();
    }).catch(function (err) {
      showToast("Upload failed: " + err.message, true);
    });
  }

  function moveGalleryImage(images, id, dir) {
    var idx = images.findIndex(function (m) { return String(m.id) === String(id); });
    var swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= images.length) return;
    var a = images[idx], b = images[swapIdx];
    showToast("Reordering…");
    Promise.all([
      client.from("gallery_images").update({ sort_order: b.sort_order }).eq("id", a.id),
      client.from("gallery_images").update({ sort_order: a.sort_order }).eq("id", b.id)
    ]).then(function () { loadGalleryPanel(); });
  }

  checkSession();
})();
