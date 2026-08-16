(() => {
  const API = "/api/auth";
  let modal = null;
  let mode = "login";
  let step = "form";
  let mobile = "";
  let signupName = "";
  let signupPassword = "";

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const digits = v => String(v || "").replace(/\D/g, "").slice(0, 10);

  async function request(action, payload = {}) {
    const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch { throw new Error(`Authentication server returned invalid data (${response.status}).`); }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function installStyles() {
    if (document.getElementById("jb-passenger-auth-css")) return;
    const s = document.createElement("style");
    s.id = "jb-passenger-auth-css";
    s.textContent = `
      body.jb-auth-lock{overflow:hidden}
      .jbpa-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,28,61,.82);backdrop-filter:blur(7px)}
      .jbpa-card{position:relative;width:min(100%,500px);max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:24px;padding:30px;box-sizing:border-box;box-shadow:0 25px 80px rgba(0,0,0,.3)}
      .jbpa-close{position:absolute;right:14px;top:14px;width:42px;height:42px;border:0;border-radius:50%;background:#eef2f6;color:#082b5c;font-size:25px;cursor:pointer}
      .jbpa-head{text-align:center;padding:4px 36px 20px}.jbpa-eyebrow{margin:0 0 7px;color:#f47b20;font-size:12px;font-weight:800;letter-spacing:2.5px}.jbpa-head h2{margin:0;color:#082b5c;font-size:29px}.jbpa-head p{margin:9px 0 0;color:#69778a;line-height:1.45}
      .jbpa-form{display:grid;gap:13px}.jbpa-field{display:grid;gap:6px}.jbpa-field label{font-size:12px;font-weight:800;color:#082b5c}.jbpa-field input{width:100%;height:49px;box-sizing:border-box;border:1px solid #d8e0e8;border-radius:10px;padding:0 13px;font-size:15px;outline:none}.jbpa-field input:focus{border-color:#f47b20;box-shadow:0 0 0 3px rgba(244,123,32,.12)}
      .jbpa-btn{width:100%;min-height:50px;border:0;border-radius:11px;background:#f47b20;color:#fff;font-size:15px;font-weight:800;cursor:pointer}.jbpa-btn:disabled{opacity:.6;cursor:wait}.jbpa-secondary{background:#edf1f5;color:#082b5c}.jbpa-link{border:0;background:transparent;color:#0b4f91;font-weight:700;cursor:pointer;padding:4px}.jbpa-links{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.jbpa-msg{padding:11px 13px;border-radius:10px;font-size:13px}.jbpa-error{background:#fff0f0;color:#a12b2b}.jbpa-ok{background:#eaf8f0;color:#187748}.jbpa-otp{letter-spacing:5px;text-align:center;font-size:22px!important;font-weight:800}.jbpa-account{display:inline-flex;align-items:center;gap:8px;margin-left:12px;color:#082b5c;font-weight:700}.jbpa-account button{border:0;background:none;color:#a12b2b;font-weight:700;cursor:pointer}
      @media(max-width:600px){.jbpa-card{padding:24px 16px}.jbpa-head h2{font-size:25px}.jbpa-links{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(s);
  }

  function get(sel) { return modal?.querySelector(sel); }
  function value(sel) { return get(sel)?.value.trim() || ""; }
  function msg(text, ok = false) { const el = get(".jbpa-message"); if (el) el.innerHTML = text ? `<div class="jbpa-msg ${ok ? "jbpa-ok" : "jbpa-error"}">${esc(text)}</div>` : ""; }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "jbpa-overlay";
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.body.appendChild(modal);
    return modal;
  }

  function close() {
    modal?.remove();
    modal = null;
    document.body.classList.remove("jb-auth-lock");
  }

  function shell(body) {
    const root = ensureModal();
    root.innerHTML = `<div class="jbpa-card"><button class="jbpa-close" type="button" aria-label="Close">×</button>${body}</div>`;
    get(".jbpa-close").onclick = close;
  }

  function render() {
    if (mode === "signup") return renderSignup();
    if (mode === "reset") return renderReset();
    return renderLogin();
  }

  function renderLogin() {
    if (step === "otp") {
      shell(`<div class="jbpa-head"><p class="jbpa-eyebrow">VERIFY MOBILE</p><h2>Enter SMS OTP</h2><p>We sent a verification code to +91 ${esc(mobile)}.</p></div><form class="jbpa-form" id="jbpaForm"><div class="jbpa-field"><label>SMS OTP</label><input class="jbpa-otp" id="jbpaOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit OTP"></div><div class="jbpa-message"></div><button class="jbpa-btn" type="submit">Verify & Login</button><button class="jbpa-btn jbpa-secondary" type="button" id="jbpaBack">Use Password Instead</button></form>`);
      get("#jbpaBack").onclick = () => { step = "form"; render(); };
      get("#jbpaForm").onsubmit = async e => { e.preventDefault(); await run(get("#jbpaForm button[type=submit]"), async () => { const data = await request("login-otp", { mobile: "+91" + mobile, code: value("#jbpaOtp") }); onLogin(data.user); }); };
      get("#jbpaOtp")?.focus();
      return;
    }
    shell(`<div class="jbpa-head"><p class="jbpa-eyebrow">PASSENGER ACCOUNT</p><h2>Login to JANBAHON</h2><p>Use your mobile number and password, or receive an OTP by SMS.</p></div><form class="jbpa-form" id="jbpaForm"><div class="jbpa-field"><label>MOBILE NUMBER</label><input id="jbpaMobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number"></div><div class="jbpa-field"><label>PASSWORD</label><input id="jbpaPassword" type="password" autocomplete="current-password" placeholder="Your password"></div><div class="jbpa-message"></div><button class="jbpa-btn" type="submit">Login</button><button class="jbpa-btn jbpa-secondary" type="button" id="jbpaOtpLogin">Login with SMS OTP</button><div class="jbpa-links"><button class="jbpa-link" type="button" id="jbpaSignup">Create account</button><button class="jbpa-link" type="button" id="jbpaReset">Forgot password?</button></div></form>`);
    get("#jbpaForm").onsubmit = async e => { e.preventDefault(); mobile = digits(value("#jbpaMobile")); if (mobile.length !== 10) return msg("Enter a valid 10-digit mobile number."); if (!value("#jbpaPassword")) return msg("Enter your password."); await run(get("#jbpaForm button[type=submit]"), async () => { const data = await request("login-password", { mobile: "+91" + mobile, password: value("#jbpaPassword") }); onLogin(data.user); }); };
    get("#jbpaOtpLogin").onclick = async () => { mobile = digits(value("#jbpaMobile")); if (mobile.length !== 10) return msg("Enter your mobile number first."); await run(get("#jbpaOtpLogin"), async () => { await request("login-send-otp", { mobile: "+91" + mobile }); step = "otp"; render(); }); };
    get("#jbpaSignup").onclick = () => { mode = "signup"; step = "form"; render(); };
    get("#jbpaReset").onclick = () => { mode = "reset"; step = "form"; render(); };
    get("#jbpaMobile")?.focus();
  }

  function renderSignup() {
    if (step === "otp") {
      shell(`<div class="jbpa-head"><p class="jbpa-eyebrow">CREATE ACCOUNT</p><h2>Verify your mobile</h2><p>Enter the SMS OTP sent to +91 ${esc(mobile)}.</p></div><form class="jbpa-form" id="jbpaForm"><div class="jbpa-field"><label>SMS OTP</label><input class="jbpa-otp" id="jbpaOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit OTP"></div><div class="jbpa-message"></div><button class="jbpa-btn" type="submit">Verify & Create Account</button><button class="jbpa-btn jbpa-secondary" type="button" id="jbpaBack">Back</button></form>`);
      get("#jbpaBack").onclick = () => { step = "form"; render(); };
      get("#jbpaForm").onsubmit = async e => { e.preventDefault(); await run(get("#jbpaForm button[type=submit]"), async () => { const data = await request("register", { mobile: "+91" + mobile, code: value("#jbpaOtp"), fullName: signupName, password: signupPassword }); onLogin({ user_id: data.userId, mobile: "+91" + mobile, full_name: signupName }); }); };
      get("#jbpaOtp")?.focus();
      return;
    }
    shell(`<div class="jbpa-head"><p class="jbpa-eyebrow">NEW PASSENGER</p><h2>Create your account</h2><p>Register with your mobile number and password.</p></div><form class="jbpa-form" id="jbpaForm"><div class="jbpa-field"><label>FULL NAME</label><input id="jbpaName" autocomplete="name" maxlength="100" placeholder="Your full name"></div><div class="jbpa-field"><label>MOBILE NUMBER</label><input id="jbpaMobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number"></div><div class="jbpa-field"><label>PASSWORD</label><input id="jbpaPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div><div class="jbpa-field"><label>CONFIRM PASSWORD</label><input id="jbpaConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></div><div class="jbpa-message"></div><button class="jbpa-btn" type="submit">Send SMS OTP</button><button class="jbpa-link" type="button" id="jbpaLogin">Already have an account? Login</button></form>`);
    get("#jbpaForm").onsubmit = async e => { e.preventDefault(); signupName = value("#jbpaName"); mobile = digits(value("#jbpaMobile")); signupPassword = value("#jbpaPassword"); if (!signupName) return msg("Enter your full name."); if (mobile.length !== 10) return msg("Enter a valid 10-digit mobile number."); if (signupPassword.length < 6) return msg("Password must be at least 6 characters."); if (signupPassword !== value("#jbpaConfirm")) return msg("Passwords do not match."); await run(get("#jbpaForm button[type=submit]"), async () => { await request("register-send-otp", { mobile: "+91" + mobile }); step = "otp"; render(); }); };
    get("#jbpaLogin").onclick = () => { mode = "login"; step = "form"; render(); };
    get("#jbpaName")?.focus();
  }

  function renderReset() {
    if (step === "otp") {
      shell(`<div class="jbpa-head"><p class="jbpa-eyebrow">RESET PASSWORD</p><h2>Choose a new password</h2><p>Enter the SMS OTP sent to +91 ${esc(mobile)}.</p></div><form class="jbpa-form" id="jbpaForm"><div class="jbpa-field"><label>SMS OTP</label><input class="jbpa-otp" id="jbpaOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit OTP"></div><div class="jbpa-field"><label>NEW PASSWORD</label><input id="jbpaPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div><div class="jbpa-field"><label>CONFIRM PASSWORD</label><input id="jbpaConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></div><div class="jbpa-message"></div><button class="jbpa-btn" type="submit">Reset Password</button></form>`);
      get("#jbpaForm").onsubmit = async e => { e.preventDefault(); const p = value("#jbpaPassword"); if (p.length < 6) return msg("Password must be at least 6 characters."); if (p !== value("#jbpaConfirm")) return msg("Passwords do not match."); await run(get("#jbpaForm button[type=submit]"), async () => { const data = await request("reset-password", { mobile: "+91" + mobile, code: value("#jbpaOtp"), password: p }); onLogin(data.user || { mobile: "+91" + mobile, full_name: "Passenger" }); }); };
      get("#jbpaOtp")?.focus();
      return;
    }
    shell(`<div class="jbpa-head"><p class="jbpa-eyebrow">ACCOUNT RECOVERY</p><h2>Reset your password</h2><p>We will send a verification code by SMS.</p></div><form class="jbpa-form" id="jbpaForm"><div class="jbpa-field"><label>MOBILE NUMBER</label><input id="jbpaMobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number"></div><div class="jbpa-message"></div><button class="jbpa-btn" type="submit">Send SMS OTP</button><button class="jbpa-link" type="button" id="jbpaLogin">Back to Login</button></form>`);
    get("#jbpaForm").onsubmit = async e => { e.preventDefault(); mobile = digits(value("#jbpaMobile")); if (mobile.length !== 10) return msg("Enter a valid 10-digit mobile number."); await run(get("#jbpaForm button[type=submit]"), async () => { await request("reset-send-otp", { mobile: "+91" + mobile }); step = "otp"; render(); }); };
    get("#jbpaLogin").onclick = () => { mode = "login"; step = "form"; render(); };
    get("#jbpaMobile")?.focus();
  }

  async function run(button, action) {
    if (button) button.disabled = true;
    try { await action(); } catch (e) { msg(e.message || "Something went wrong. Please try again."); } finally { if (button) button.disabled = false; }
  }

  function onLogin(user) {
    close();
    updateAccount(user);
    window.dispatchEvent(new CustomEvent("janbahon:login", { detail: user }));
  }

  function updateAccount(user) {
    const nav = document.querySelector(".site-header nav");
    if (!nav) return;
    nav.querySelector(".jbpa-account")?.remove();
    if (!user) return;
    const chip = document.createElement("span");
    chip.className = "jbpa-account";
    chip.innerHTML = `<span>${esc(user.full_name || user.mobile || "Passenger")}</span><button type="button">Logout</button>`;
    chip.querySelector("button").onclick = async () => { try { await request("logout"); } catch {} updateAccount(null); window.dispatchEvent(new Event("janbahon:logout")); };
    nav.appendChild(chip);
  }

  function open(initialMode) {
    installStyles();
    mode = initialMode;
    step = "form";
    mobile = "";
    signupName = "";
    signupPassword = "";
    render();
    document.body.classList.add("jb-auth-lock");
  }

  document.addEventListener("click", e => {
    const link = e.target.closest('a[href="#login"], a[href="#signup"]');
    if (!link) return;
    e.preventDefault();
    open(link.getAttribute("href") === "#signup" ? "signup" : "login");
  });

  window.JanbahonPassengerAuth = { open, close };
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      const r = await fetch(`${API}?action=session`, { credentials: "same-origin", cache: "no-store" });
      if (r.ok) { const data = await r.json(); if (data.authenticated) updateAccount(data.user); }
    } catch {}
  });
})();
