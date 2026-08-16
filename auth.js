(() => {
  const API = "/api/auth";
  let mode = "login";
  let loginMethod = "password";
  let otpSent = false;
  let resetOtpSent = false;
  let registerOtpSent = false;
  let currentUser = null;

  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function injectStyles() {
    if (document.getElementById("janbahon-auth-styles")) return;
    const style = document.createElement("style");
    style.id = "janbahon-auth-styles";
    style.textContent = `
      .auth-overlay{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,31,67,.78);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:.2s;overflow:auto}
      .auth-modal.open .auth-overlay{opacity:1;pointer-events:auto}.auth-box{position:relative;width:min(100%,520px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:24px;padding:30px;box-shadow:0 25px 80px rgba(0,0,0,.3)}
      .auth-close{position:absolute;right:15px;top:15px;width:40px;height:40px;border:0;border-radius:50%;background:#f0f3f7;color:#082b5c;font-size:24px;cursor:pointer}.auth-head{text-align:center;padding:5px 25px 20px}.auth-head .eyebrow{margin:0 0 7px;color:#f47b20;font-size:11px;font-weight:800;letter-spacing:2.2px}.auth-head h2{margin:0;color:#082b5c;font-size:30px}.auth-head p{margin:7px 0 0;color:#6d7788;font-size:14px}
      .auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:5px;background:#f3f6f9;border-radius:12px;margin-bottom:18px}.auth-tab{border:0;background:transparent;padding:11px;border-radius:9px;color:#657286;font-weight:800;cursor:pointer}.auth-tab.active{background:#fff;color:#082b5c;box-shadow:0 2px 7px rgba(0,0,0,.07)}
      .auth-fields{display:grid;gap:13px}.auth-field{display:grid;gap:6px}.auth-field label{font-size:12px;font-weight:800;color:#082b5c}.auth-field input{width:100%;height:48px;box-sizing:border-box;padding:0 13px;border:1px solid #d8dfe8;border-radius:10px;outline:0;font-size:15px}.auth-field input:focus{border-color:#f47b20;box-shadow:0 0 0 3px rgba(244,123,32,.12)}
      .auth-btn{width:100%;height:50px;border:0;border-radius:11px;background:#f47b20;color:#fff;font-size:15px;font-weight:800;cursor:pointer}.auth-btn:disabled{background:#cbd2db;cursor:not-allowed}.auth-btn.secondary{background:#edf1f5;color:#082b5c}.auth-actions{display:grid;gap:10px;margin-top:16px}.auth-inline{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px}.auth-link{border:0;background:transparent;color:#d96512;font-weight:700;cursor:pointer;padding:4px}.auth-help{text-align:center;margin:12px 0 0;color:#718096;font-size:12px}.auth-error{display:none;padding:11px 12px;border-radius:9px;background:#fff0f0;color:#b42318;font-size:13px;margin-bottom:13px}.auth-error.show{display:block}.auth-success{display:none;padding:11px 12px;border-radius:9px;background:#edf9f2;color:#137443;font-size:13px;margin-bottom:13px}.auth-success.show{display:block}.otp-row{display:grid;grid-template-columns:1fr auto;gap:8px}.otp-send{height:48px;padding:0 13px;border:1px solid #f47b20;background:#fff8f2;color:#d96512;border-radius:10px;font-weight:800;cursor:pointer}.otp-send:disabled{opacity:.55;cursor:not-allowed}.auth-user-chip{display:inline-flex;align-items:center;gap:8px;margin-left:12px;padding:7px 11px;border-radius:99px;background:#eef7f2;color:#137443;font-size:12px;font-weight:800}.auth-user-chip button{border:0;background:transparent;color:#b42318;font-weight:800;cursor:pointer}.password-note{font-size:11px;color:#718096;margin-top:-5px}
      @media(max-width:600px){.auth-overlay{padding:8px}.auth-box{padding:23px 16px;border-radius:19px;max-height:calc(100vh - 16px)}.auth-head h2{font-size:25px}.otp-row{grid-template-columns:1fr}.auth-inline{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let modal = document.getElementById("auth-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "auth-modal";
    modal.innerHTML = `<div class="auth-overlay"><div class="auth-box"><button class="auth-close" type="button" aria-label="Close">×</button><div id="auth-content"></div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector(".auth-close").onclick = close;
    modal.querySelector(".auth-overlay").addEventListener("click", e => { if (e.target.classList.contains("auth-overlay")) close(); });
    return modal;
  }

  function setMessage(error = "", success = "") {
    const e = document.querySelector("#auth-error"), s = document.querySelector("#auth-success");
    if (e) { e.textContent = error; e.classList.toggle("show", !!error); }
    if (s) { s.textContent = success; s.classList.toggle("show", !!success); }
  }

  async function request(action, payload) {
    const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload || {}) });
    let data = {};
    try { data = await response.json(); } catch { data = { error: "Server returned an invalid response." }; }
    if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
    return data;
  }

  function mobileValue() { return document.querySelector("#auth-mobile")?.value.trim() || ""; }

  function render() {
    const modal = ensureModal();
    const content = modal.querySelector("#auth-content");
    const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password";
    const subtitle = mode === "login" ? "Login with your mobile number and password or OTP." : mode === "signup" ? "Register with your mobile number and verify by SMS OTP." : "Verify your mobile by SMS OTP and choose a new password.";
    let body = "";
    if (mode === "login") {
      body = `<div class="auth-tabs"><button class="auth-tab ${loginMethod === "password" ? "active" : ""}" data-method="password">Password</button><button class="auth-tab ${loginMethod === "otp" ? "active" : ""}" data-method="otp">Login with OTP</button></div>
        <div class="auth-fields"><div class="auth-field"><label for="auth-mobile">Mobile number</label><input id="auth-mobile" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="10-digit mobile number"></div>
        ${loginMethod === "password" ? `<div class="auth-field"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" placeholder="Enter password"></div>` : `<div class="auth-field"><label for="auth-otp">SMS OTP</label><div class="otp-row"><input id="auth-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit OTP"><button class="otp-send" id="send-login-otp" type="button">${otpSent ? "Resend OTP" : "Send OTP"}</button></div></div>`}</div>
        <div class="auth-inline"><button class="auth-link" id="forgot-password" type="button">Forgot password?</button><span class="auth-help">New to JANBAHON? <button class="auth-link" id="go-signup" type="button">Sign up</button></span></div>
        <div class="auth-actions"><button class="auth-btn" id="login-submit" type="button">${loginMethod === "password" ? "Login" : "Verify & Login"}</button></div>`;
    } else if (mode === "signup") {
      body = `<div class="auth-fields"><div class="auth-field"><label for="auth-name">Full name</label><input id="auth-name" autocomplete="name" maxlength="100" placeholder="Your full name"></div><div class="auth-field"><label for="auth-mobile">Mobile number</label><div class="otp-row"><input id="auth-mobile" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="10-digit mobile number"><button class="otp-send" id="send-register-otp" type="button">${registerOtpSent ? "Resend OTP" : "Send OTP"}</button></div></div>${registerOtpSent ? `<div class="auth-field"><label for="auth-otp">SMS OTP</label><input id="auth-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit OTP"></div><div class="auth-field"><label for="auth-password">Create password</label><input id="auth-password" type="password" autocomplete="new-password" placeholder="At least 6 characters"><span class="password-note">Use at least 6 characters. Never share your password or OTP.</span></div>` : ""}</div><div class="auth-actions"><button class="auth-btn" id="signup-submit" type="button">${registerOtpSent ? "Verify OTP & Create Account" : "Send OTP to Register"}</button><button class="auth-btn secondary" id="go-login" type="button">Already have an account? Login</button></div>`;
    } else {
      body = `<div class="auth-fields"><div class="auth-field"><label for="auth-mobile">Mobile number</label><div class="otp-row"><input id="auth-mobile" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="10-digit mobile number"><button class="otp-send" id="send-reset-otp" type="button">${resetOtpSent ? "Resend OTP" : "Send OTP"}</button></div></div>${resetOtpSent ? `<div class="auth-field"><label for="auth-otp">SMS OTP</label><input id="auth-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit OTP"></div><div class="auth-field"><label for="auth-password">New password</label><input id="auth-password" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div>` : ""}</div><div class="auth-actions"><button class="auth-btn" id="reset-submit" type="button">${resetOtpSent ? "Verify OTP & Reset Password" : "Send SMS OTP"}</button><button class="auth-btn secondary" id="go-login" type="button">Back to Login</button></div>`;
    }
    content.innerHTML = `<div class="auth-head"><p class="eyebrow">JANBAHON ACCOUNT</p><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div id="auth-error" class="auth-error"></div><div id="auth-success" class="auth-success"></div>${body}`;
    bind();
  }

  function bind() {
    document.querySelectorAll(".auth-tab").forEach(btn => btn.onclick = () => { loginMethod = btn.dataset.method; otpSent = false; render(); });
    document.getElementById("go-signup")?.addEventListener("click", () => { mode = "signup"; registerOtpSent = false; render(); });
    document.getElementById("go-login")?.addEventListener("click", () => { mode = "login"; loginMethod = "password"; render(); });
    document.getElementById("forgot-password")?.addEventListener("click", () => { mode = "reset"; resetOtpSent = false; render(); });
    document.getElementById("send-login-otp")?.addEventListener("click", sendLoginOtp);
    document.getElementById("send-register-otp")?.addEventListener("click", sendRegisterOtp);
    document.getElementById("send-reset-otp")?.addEventListener("click", sendResetOtp);
    document.getElementById("login-submit")?.addEventListener("click", login);
    document.getElementById("signup-submit")?.addEventListener("click", signup);
    document.getElementById("reset-submit")?.addEventListener("click", resetPassword);
  }

  async function sendLoginOtp() {
    try { setMessage(); await request("login-send-otp", { mobile: mobileValue() }); otpSent = true; render(); setMessage("", "OTP sent by SMS. It is valid for 5 minutes."); } catch (e) { setMessage(e.message); }
  }
  async function sendRegisterOtp() {
    try { setMessage(); await request("register-send-otp", { mobile: mobileValue() }); registerOtpSent = true; render(); setMessage("", "OTP sent by SMS. Enter it below to create your account."); } catch (e) { setMessage(e.message); }
  }
  async function sendResetOtp() {
    try { setMessage(); await request("reset-send-otp", { mobile: mobileValue() }); resetOtpSent = true; render(); setMessage("", "Password reset OTP sent by SMS."); } catch (e) { setMessage(e.message); }
  }
  async function login() {
    try {
      setMessage(); const payload = { mobile: mobileValue() };
      const data = loginMethod === "password" ? await request("login-password", { ...payload, password: document.getElementById("auth-password")?.value }) : await request("login-otp", { ...payload, code: document.getElementById("auth-otp")?.value });
      currentUser = data.user; close(); updateHeader(); window.dispatchEvent(new CustomEvent("janbahon:login", { detail: currentUser }));
    } catch (e) { setMessage(e.message); }
  }
  async function signup() {
    try {
      if (!registerOtpSent) return await sendRegisterOtp();
      setMessage(); const data = await request("register", { mobile: mobileValue(), fullName: document.getElementById("auth-name")?.value, code: document.getElementById("auth-otp")?.value, password: document.getElementById("auth-password")?.value });
      currentUser = { user_id: data.userId, mobile: mobileValue(), full_name: document.getElementById("auth-name")?.value || "" }; close(); updateHeader(); window.dispatchEvent(new CustomEvent("janbahon:login", { detail: currentUser }));
    } catch (e) { setMessage(e.message); }
  }
  async function resetPassword() {
    try {
      if (!resetOtpSent) return await sendResetOtp();
      setMessage(); const data = await request("reset-password", { mobile: mobileValue(), code: document.getElementById("auth-otp")?.value, password: document.getElementById("auth-password")?.value });
      currentUser = data.user || { mobile: mobileValue() }; close(); updateHeader(); alert("Password reset successful. You are now logged in.");
    } catch (e) { setMessage(e.message); }
  }

  function updateHeader() {
    const nav = document.querySelector(".site-header nav");
    if (!nav) return;
    const old = nav.querySelector(".auth-user-chip"); old?.remove();
    if (currentUser) {
      const chip = document.createElement("span"); chip.className = "auth-user-chip"; chip.innerHTML = `<span>${esc(currentUser.full_name || currentUser.mobile || "Account")}</span><button type="button">Logout</button>`; chip.querySelector("button").onclick = logout; nav.appendChild(chip);
    }
  }
  async function logout() { try { await request("logout", {}); currentUser = null; updateHeader(); window.dispatchEvent(new Event("janbahon:logout")); } catch (e) { alert(e.message); } }

  function open(requestedMode = "login") { injectStyles(); mode = requestedMode; if (mode === "login") { loginMethod = "password"; otpSent = false; } if (mode === "signup") registerOtpSent = false; if (mode === "reset") resetOtpSent = false; render(); const modal = ensureModal(); requestAnimationFrame(() => modal.classList.add("open")); document.body.classList.add("auth-open"); }
  function close() { const modal = document.getElementById("auth-modal"); modal?.classList.remove("open"); document.body.classList.remove("auth-open"); }

  async function loadSession() { try { const response = await fetch(API, { credentials: "same-origin", cache: "no-store" }); const data = await response.json(); if (data.authenticated) { currentUser = data.user; updateHeader(); } } catch {} }

  window.janbahonAuth = { open, close, getUser: () => currentUser, logout };
  document.addEventListener("click", e => { const link = e.target.closest('a[href="#login"],a[href="#signup"]'); if (!link) return; e.preventDefault(); open(link.getAttribute("href") === "#signup" ? "signup" : "login"); });
  document.addEventListener("DOMContentLoaded", loadSession);
})();
