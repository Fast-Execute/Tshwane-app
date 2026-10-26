/* Tshwane municipal module. Uses only the public Supabase publishable key.
   RLS in PostgreSQL is the security boundary; UI visibility is not authorization. */
(() => {
  "use strict";
  const config = window.TSHWANE_CONFIG || {};
  const alertBox = document.getElementById("connectionAlert");
  const noticeList = document.getElementById("noticeList");
  const caseList = document.getElementById("caseList");
  const authStatus = document.getElementById("authStatus");
  const authMessage = document.getElementById("authMessage");
  const faultMessage = document.getElementById("faultMessage");
  const authForm = document.getElementById("authForm");
  const authNameWrap = document.getElementById("authNameWrap");
  const signInButton = document.getElementById("signInButton");
  const signUpButton = document.getElementById("signUpButton");
  const signOutButton = document.getElementById("signOutButton");
  let supabase = null;
  let categories = [];
  let areas = [];
  let currentUser = null;
  let authMode = "signin";

  function setMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("text-danger", isError);
    element.classList.toggle("text-success", !isError && Boolean(message));
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setSelectOptions(select, rows, labelFn, emptyLabel) {
    select.replaceChildren();
    select.appendChild(new Option(emptyLabel, ""));
    rows.forEach((row) => select.appendChild(new Option(labelFn(row), row.code || row.id)));
  }

  function statusLabel(status) {
    return String(status || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "Time not provided";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Time not provided" : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
  }

  function renderNotice(notice) {
    const card = node("article", "border rounded-3 p-3 bg-white");
    const heading = node("h3", "h6 fw-bold mb-2", notice.title);
    const meta = node("p", "small text-muted mb-2", [
      notice.category_name || notice.category_code,
      notice.area_name || "All areas",
      statusLabel(notice.notice_type)
    ].join(" · "));
    const details = node("p", "mb-2", notice.details);
    const timing = node("p", "small text-muted mb-0", "Expected end: " + (notice.expected_end_at ? formatDate(notice.expected_end_at) : "Not specified"));
    card.append(heading, meta, details, timing);
    if (notice.is_demo) card.appendChild(node("span", "badge text-bg-warning mt-2 align-self-start", "DEMO — not a verified live notice"));
    return card;
  }

  async function loadReferenceData() {
    const [categoryResult, areaResult] = await Promise.all([
      supabase.from("service_categories").select("code,name,description").eq("active", true).order("name"),
      supabase.from("service_areas").select("id,name,area_type,ward_number").eq("active", true).order("name")
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (areaResult.error) throw areaResult.error;
    categories = categoryResult.data || [];
    areas = areaResult.data || [];
    setSelectOptions(document.getElementById("faultCategory"), categories, (row) => row.name, "Choose a service");
    setSelectOptions(document.getElementById("faultArea"), areas, (row) => row.name + (row.ward_number ? " · Ward " + row.ward_number : ""), "Choose an area");
  }

  async function loadNotices() {
    noticeList.replaceChildren(node("p", "text-muted", "Loading published notices…"));
    const { data, error } = await supabase.from("service_notices")
      .select("id,title,category_code,notice_type,area_id,details,starts_at,expected_end_at,status,is_demo")
      .eq("published", true).in("status", ["active", "resolved"])
      .order("starts_at", { ascending: false }).limit(30);
    if (error) {
      noticeList.replaceChildren(node("p", "text-danger", "Could not load notices: " + error.message));
      return;
    }
    if (!data || !data.length) {
      noticeList.replaceChildren(node("p", "text-muted", "No published notices are available."));
      return;
    }
    const categoryMap = new Map(categories.map((item) => [item.code, item.name]));
    const areaMap = new Map(areas.map((item) => [item.id, item.name]));
    noticeList.replaceChildren(...data.map((item) => renderNotice({
      ...item,
      category_name: categoryMap.get(item.category_code),
      area_name: areaMap.get(item.area_id)
    })));
  }

  async function loadCases() {
    if (!currentUser) {
      caseList.replaceChildren(node("p", "text-muted", "Sign in to view your own reports. The demo records in the database are illustrative and are not live cases."));
      return;
    }
    caseList.replaceChildren(node("p", "text-muted", "Loading your cases…"));
    const { data, error } = await supabase.from("service_requests")
      .select("id,reference_no,category_code,area_id,location_description,description,priority,status,is_demo,created_at")
      .eq("submitted_by", currentUser.id).eq("is_demo", false)
      .order("created_at", { ascending: false }).limit(50);
    if (error) {
      caseList.replaceChildren(node("p", "text-danger", "Could not load cases: " + error.message));
      return;
    }
    if (!data || !data.length) {
      caseList.replaceChildren(node("p", "text-muted", "You have not submitted any reports yet."));
      return;
    }
    const categoryMap = new Map(categories.map((item) => [item.code, item.name]));
    const areaMap = new Map(areas.map((item) => [item.id, item.name]));
    caseList.replaceChildren(...data.map((item) => {
      const card = node("article", "border rounded-3 p-3 mb-3 bg-white");
      const top = node("div", "d-flex justify-content-between align-items-start gap-2 flex-wrap");
      top.append(node("h3", "h6 fw-bold mb-1", categoryMap.get(item.category_code) || item.category_code));
      top.append(node("span", "badge text-bg-secondary", statusLabel(item.status)));
      card.append(top);
      card.append(node("p", "small text-muted mb-2", item.reference_no + " · " + (areaMap.get(item.area_id) || "Area not set")));
      card.append(node("p", "mb-2", item.description));
      card.append(node("p", "small text-muted mb-0", item.location_description + " · Reported " + formatDate(item.created_at)));
      return card;
    }));
  }

  function updateAuthUI(session) {
    currentUser = session?.user || null;
    if (currentUser) {
      authStatus.textContent = "Signed in as " + currentUser.email + ".";
      authForm.querySelectorAll("#authEmail, #authPassword, #authName").forEach((input) => { input.disabled = true; });
      signInButton.classList.add("d-none");
      signUpButton.classList.add("d-none");
      authNameWrap.classList.add("d-none");
      signOutButton.classList.remove("d-none");
    } else {
      authStatus.textContent = "You are not signed in. Use your Supabase Auth account.";
      authForm.querySelectorAll("#authEmail, #authPassword").forEach((input) => { input.disabled = false; });
      document.getElementById("authName").disabled = false;
      signInButton.classList.remove("d-none");
      signUpButton.classList.remove("d-none");
      signOutButton.classList.add("d-none");
    }
    loadCases();
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabase) return;
    setMessage(authMessage, "Signing in…");
    const { error } = await supabase.auth.signInWithPassword({
      email: document.getElementById("authEmail").value.trim(),
      password: document.getElementById("authPassword").value
    });
    if (error) setMessage(authMessage, error.message, true);
    else setMessage(authMessage, "Signed in successfully.");
  }

  async function signUp() {
    if (!supabase) return;
    if (!authForm.reportValidity()) return;
    authMode = "signup";
    setMessage(authMessage, "Creating your account…");
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const fullName = document.getElementById("authName").value.trim();
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName || undefined } }
    });
    if (error) {
      setMessage(authMessage, error.message, true);
      return;
    }
    if (data.session) setMessage(authMessage, "Account created and signed in.");
    else setMessage(authMessage, "Account created. Check your email to confirm it, then sign in.");
  }

  async function submitFault(event) {
    event.preventDefault();
    if (!supabase) return;
    if (!currentUser) {
      setMessage(faultMessage, "Please sign in before submitting a report.", true);
      return;
    }
    const categoryCode = document.getElementById("faultCategory").value;
    const areaId = document.getElementById("faultArea").value;
    const location = document.getElementById("faultLocation").value.trim();
    const description = document.getElementById("faultDescription").value.trim();
    const priority = document.getElementById("faultPriority").value;
    if (priority === "emergency") {
      setMessage(faultMessage, "This demo cannot dispatch emergency help. Choose another priority for a non-emergency report.", true);
      return;
    }
    const button = document.getElementById("submitFault");
    button.disabled = true;
    setMessage(faultMessage, "Submitting report…");
    const { data, error } = await supabase.from("service_requests").insert({
      submitted_by: currentUser.id,
      category_code: categoryCode,
      area_id: areaId,
      location_description: location,
      description,
      priority,
      status: "submitted",
      is_demo: false
    }).select("reference_no").single();
    button.disabled = false;
    if (error) {
      setMessage(faultMessage, "Report was not submitted: " + error.message, true);
      return;
    }
    document.getElementById("faultForm").reset();
    setMessage(faultMessage, "Report submitted. Your reference is " + data.reference_no + ". Keep this reference for follow-up.");
    await loadCases();
  }

  async function init() {
    if (!window.supabase || !config.supabaseUrl || !config.supabasePublishableKey) {
      alertBox.className = "alert alert-warning";
      alertBox.textContent = "Supabase is not configured for this deployment yet. Set TSHWANE_CONFIG.supabaseUrl and TSHWANE_CONFIG.supabasePublishableKey in js/app-config.js using the project's public URL and publishable key. Never use a service-role key in the browser.";
      noticeList.replaceChildren(node("p", "text-muted", "Not connected. Configure Supabase to load notices."));
      authStatus.textContent = "Supabase configuration is required before account access can work.";
      return;
    }
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    try {
      await loadReferenceData();
      await loadNotices();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      updateAuthUI(data.session);
      alertBox.className = "alert alert-success";
      alertBox.textContent = "Connected to the Tshwane demo database. Notices and areas are loaded from Supabase; sample notices are labelled DEMO.";
    } catch (error) {
      alertBox.className = "alert alert-danger";
      alertBox.textContent = "Supabase connection failed: " + (error.message || "Unknown error");
    }
    supabase.auth.onAuthStateChange((_event, session) => updateAuthUI(session));
  }

  authForm.addEventListener("submit", signIn);
  signUpButton.addEventListener("click", signUp);
  signOutButton.addEventListener("click", async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(authMessage, error.message, true);
    else setMessage(authMessage, "You have signed out.");
  });
  document.getElementById("faultForm").addEventListener("submit", submitFault);
  document.getElementById("refreshNotices").addEventListener("click", () => { if (supabase) loadNotices(); });
  document.getElementById("refreshCases").addEventListener("click", loadCases);
  init();
})();
