(() => {
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const api = async (url, options = {}) => {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Authentication server returned invalid data (${response.status}).`); }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  };

  const styles = () => {
    if (document.getElementById("janbahon-auth-styles")) return;
    const s = document.createElement("style");
    s.id = "janbahon-auth-styles";
    s.textContent = `
      body.jb-auth-open{overflow:hidden}
      .jb-auth-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,31,67,.82);backdrop-filter:blur(7px);opacity:0;pointer-events:none;transition:.18s}
      .jb-auth-overlay.open{opacity:1;pointer-events:auto}
      .jb-auth-card{position:relative;width:min(100%,500px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:24px;padding:30px;box-shadow:0 25px 80px rgba(0,0,0,.3)}
      .jb-auth-close{position:absolute;right:14px;top:14px;width:42px;height:42px;border:0;border-radius:50%;background:#f0f3f7;color:#082b5c;font-size:25px;cursor:pointer}
      .jb-auth-head{text-align:center;padding:4px 35px 20px}.jb-auth-eyebrow{margin:0 0 7px;color:#f47b20;font-size:12px;font-weight:800;letter-spacing:2.5px}.jb-auth-head h2{margin:0;color:#082b5c;font-size:30px}.jb-auth-head p{color:#6d7788;margin:9px 0}
      .jb-auth-form{display:grid;gap:14px}.jb-auth-field{display:grid;gap:6px}.jb-auth-field label{font-size:12px;font-weight:800;color:#082b5c}.jb-auth-field input{width:100%;box-sizing:border-box;min-height:48px;padding:0 13px;border:1px solid #d8e0e8;border-radius:10px;font-size:15px;outline:none}.jb-auth-field input:focus{border-color:#f47b20;box-shadow:0 0 0 3px rgba(244,123,32,.12)}
      .jb-auth-btn{width:100%;min-height:50px;border:0;border-radius:11px;background:#f47b20;color:#fff;font-size:16px;font-weight:800;cursor:pointer}.jb-auth-btn:disabled{opacity:.6;cursor:wait}.jb-auth-secondary{background:#eef2f6;color:#082b5c}.jb-auth-links{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:2px}.jb-auth-link{border:0;background:none;color:#0b4f91;font-weight:700;cursor:pointer;padding:3px}.jb-auth-error{padding:11px 13px;border-radius:10px;background:#fff0f0;color:#a12b2b;font-size:13px}.jb-auth-ok{padding:11px 13px;border-radius:10px;background:#eaf8f0;color:#187748;font-size:13px}.jb-auth-otp{letter-spacing:5px;text-align:center;font-size:22px!important;font-weight:800}.jb-auth-note{text-align:center;color:#6d7788;font-size:12px;margin:0}.jb-auth-user{display:inline-flex;align-items:center;gap:8px}.jb-auth-account{font-weight:700;color:#082b5c}.jb-auth-logout{border:0;background:none;color:#a12b2b;font-weight:700;cursor:pointer}
      @media(max-width:600px){.jb-auth-card{padding:24px 16px}.jb-auth-head h2{font-size:25px}}
    `;
    document.head.appendChild(s);
  };

  let overlay;
  let mode = "login";
  let step = "form";
  let mobile = "";

  function open(initialMode = "login") {
    styles();
    mode = initialMode;
    step = "form";
    mobile = "";
    render();
    overlay.classList.add("open");
    document.body.classList.add("jb-auth-open");
    setTimeout(() => overlay.querySelector("input")?.focus(), 30);
  }

  function close() {
    overlay?.classList.remove("open");
    document.body.classList.remove("jb-auth-open");
  }

  function shell(content) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "jb-auth-overlay";
      overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div class="jb-auth-card"><button class="jb-auth-close" type="button" aria-label="Close">×</button>${content}</div>`;
    overlay.querySelector(".jb-auth-close").onclick = close;
  }

  const normalize = value => String(value || "").replace(/\D/g, "").slice(0, 10);
  const formValue = sel => overlay.querySelector(sel)?.value.trim() || "";

  function render() {
    if (mode === "signup") return renderSignup();
    if (mode === "reset") return renderReset();
    renderLogin();
  }

  function renderLogin() {
    if (step === "otp") {
      shell(`<div class="jb-auth-head"><p class="jb-auth-eyebrow">VERIFY MOBILE</p><h2>Enter OTP</h2><p>We sent a verification code to +91 ${esc(mobile)}.</p></div><form class="jb-auth-form" id="jbAuthForm"><div class="jb-auth-field"><label>SMS OTP</label><input class="jb-auth-otp" id="jbOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></div><div id="jbAuthMsg"></div><button class="jb-auth-btn" type="submit">Verify & Login</button><button class="jb-auth-btn jb-auth-secondary" type="button" id="jbBack">Use Password Instead</button></form>`);
      overlay.querySelector("#jbBack").onclick = () => { step = "form"; render(); };
      overlay.querySelector("#jbAuthForm").onsubmit = async e => {
        e.preventDefault(); await submit(async () => api("/api/auth?action=login-otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile, code: formValue("#jbOtp") }) }));
      };
      return;
    }
    shell(`<div class="jb-auth-head"><p class="jb-auth-eyebrow">WELCOME BACK</p><h2>Login to JANBAHON</h2><p>Use your mobile number and password, or login with OTP.</p></div><form class="jb-auth-form" id="jbAuthForm"><div class="jb-auth-field"><label>MOBILE NUMBER</label><input id="jbMobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number"></div><div class="jb-auth-field"><label>PASSWORD</label><input id="jbPassword" type="password" autocomplete="current-password" placeholder="Your password"></div><div id="jbAuthMsg"></div><button class="jb-auth-btn" type="submit">Login</button><button class="jb-auth-btn jb-auth-secondary" type="button" id="jbOtpLogin">Login with SMS OTP</button><div class="jb-auth-links"><button class="jb-auth-link" type="button" id="jbSignup">Create account</button><button class="jb-auth-link" type="button" id="jbReset">Forgot password?</button></div></form>`);
    overlay.querySelector("#jbAuthForm").onsubmit = async e => {
      e.preventDefault(); mobile = normalize(formValue("#jbMobile"));
      if (mobile.length !== 10) return message("Enter a valid 10-digit mobile number.");
      if (!formValue("#jbPassword")) return message("Enter your password.");
      await submit(() => api("/api/auth?action=login-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile, password: formValue("#jbPassword") }) }));
    };
    overlay.querySelector("#jbOtpLogin").onclick = async () => {
      mobile = normalize(formValue("#jbMobile"));
      if (mobile.length !== 10) return message("Enter your mobile number first.");
      await submit(async () => { await api("/api/auth?action=login-send-otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile }) }); step = "otp"; render(); });
    };
    overlay.querySelector("#jbSignup").onclick = () => { mode = "signup"; step = "form"; render(); };
    overlay.querySelector("#jbReset").onclick = () => { mode = "reset"; step = "form"; render(); };
  }

  function renderSignup() {
    if (step === "otp") {
      shell(`<div class="jb-auth-head"><p class="jb-auth-eyebrow">CREATE ACCOUNT</p><h2>Verify your mobile</h2><p>Enter the SMS OTP sent to +91 ${esc(mobile)}.</p></div><form class="jb-auth-form" id="jbAuthForm"><div class="jb-auth-field"><label>SMS OTP</label><input class="jb-auth-otp" id="jbOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></div><div id="jbAuthMsg"></div><button class="jb-auth-btn" type="submit">Verify & Create Account</button><button class="jb-auth-btn jb-auth-secondary" type="button" id="jbBack">Back</button></form>`);
      overlay.querySelector("#jbBack").onclick = () => { step = "form"; render(); };
      overlay.querySelector("#jbAuthForm").onsubmit = async e => {
        e.preventDefault(); await submit(() => api("/api/auth?action=register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile, code: formValue("#jbOtp"), fullName: sessionStorage.getItem("jbSignupName") || "", password: sessionStorage.getItem("jbSignupPassword") || "" }) }));
      };
      return;
    }
    shell(`<div class="jb-auth-head"><p class="jb-auth-eyebrow">NEW PASSENGER</p><h2>Create your account</h2><p>Register with your mobile number and password.</p></div><form class="jb-auth-form" id="jbAuthForm"><div class="jb-auth-field"><label>FULL NAME</label><input id="jbName" autocomplete="name" placeholder="Enter your full name"></div><div class="jb-auth-field"><label>MOBILE NUMBER</label><input id="jbMobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number"></div><div class="jb-auth-field"><label>PASSWORD</label><input id="jbPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div><div class="jb-auth-field"><label>CONFIRM PASSWORD</label><input id="jbConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></div><div id="jbAuthMsg"></div><button class="jb-auth-btn" type="submit">Send SMS OTP</button><button class="jb-auth-link" type="button" id="jbLogin">Already have an account? Login</button></form>`);
    overlay.querySelector("#jbAuthForm").onsubmit = async e => {
      e.preventDefault(); mobile = normalize(formValue("#jbMobile"));
      if (!formValue("#jbName")) return message("Enter your full name.");
      if (mobile.length !== 10) return message("Enter a valid 10-digit mobile number.");
      if (formValue("#jbPassword").length < 6) return message("Password must be at least 6 characters.");
      if (formValue("#jbPassword") !== formValue("#jbConfirm")) return message("Passwords do not match.");
      sessionStorage.setItem("jbSignupName", formValue("#jbName"));
      sessionStorage.setItem("jbSignupPassword", formValue("#jbPassword"));
      await submit(async () => { await api("/api/auth?action=register-send-otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile }) }); step = "otp"; render(); });
    };
    overlay.querySelector("#jbLogin").onclick = () => { sessionStorage.removeItem("jbSignupName"); sessionStorage.removeItem("jbSignupPassword"); mode = "login"; step = "form"; render(); };
  }

  function renderReset() {
    if (step === "otp") {
      shell(`<div class="jb-auth-head"><p class="jb-auth-eyebrow">RESET PASSWORD</p><h2>Set a new password</h2><p>Verify the SMS OTP sent to +91 ${esc(mobile)}.</p></div><form class="jb-auth-form" id="jbAuthForm"><div class="jb-auth-field"><label>SMS OTP</label><input class="jb-auth-otp" id="jbOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></div><div class="jb-auth-field"><label>NEW PASSWORD</label><input id="jbPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div><div class="jb-auth-field"><label>CONFIRM PASSWORD</label><input id="jbConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></div><div id="jbAuthMsg"></div><button class="jb-auth-btn" type="submit">Reset Password</button></form>`);
      overlay.querySelector("#jbAuthForm").onsubmit = async e => { e.preventDefault(); if (formValue("#jbPassword").length < 6) return message("Password must be at least 6 characters."); if (formValue("#jbPassword") !== formValue("#jbConfirm")) return message("Passwords do not match."); await submit(() => api("/api/auth?action=reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile, code: formValue("#jbOtp"), password: formValue("#jbPassword") }) })); };
      return;
    }
    shell(`<div class="jb-auth-head"><p class="jb-auth-eyebrow">ACCOUNT RECOVERY</p><h2>Reset your password</h2><p>We will send a verification code by SMS.</p></div><form class="jb-auth-form" id="jbAuthForm"><div class="jb-auth-field"><label>MOBILE NUMBER</label><input id="jbMobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number"></div><div id="jbAuthMsg"></div><button class="jb-auth-btn" type="submit">Send SMS OTP</button><button class="jb-auth-link" type="button" id="jbLogin">Back to Login</button></form>`);
    overlay.querySelector("#jbAuthForm").onsubmit = async e => { e.preventDefault(); mobile = normalize(formValue("#jbMobile")); if (mobile.length !== 10) return message("Enter a valid 10-digit mobile number."); await submit(async () => { await api("/api/auth?action=reset-send-otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: "+91" + mobile }) }); step = "otp"; render(); }); };
    overlay.querySelector("#jbLogin").onclick = () => { mode = "login"; step = "form"; render(); };
  }

  function message(text, ok = false) { const el = overlay?.querySelector("#jbAuthMsg"); if (el) el.innerHTML = `<div class="${ok ? "jb-auth-ok" : "jb-auth-error"}">${esc(text)}</div>`; }

  async function submit(fn) {
    const button = overlay?.querySelector("#jbAuthForm button[type=submit]"); if (button) button.disabled = true;
    try { const result = await fn(); if (result?.success) { sessionStorage.removeItem("jbSignupName"); sessionStorage.removeItem("jbSignupPassword"); close(); updateHeader(result.user); alert(mode === "reset" ? "Password reset successfully. You are now logged in." : "Login successful."); } } catch (e) { message(e.message); } finally { if (button) button.disabled = false; }
  }

  function updateHeader(user) {
    const nav = document.querySelector(".site-header nav"); if (!nav || !user) return;
    nav.querySelectorAll("a[href='#login'],a[href='#signup'],.jb-auth-user").forEach(x => x.remove());
    const wrap = document.createElement("span"); wrap.className = "jb-auth-user"; wrap.innerHTML = `<span class="jb-auth-account">${esc(user.full_name || user.mobile || "Account")}</span><button class="jb-auth-logout" type="button">Logout</button>`; wrap.querySelector("button").onclick = async () => { try { await api("/api/auth?action=logout", { method: "POST" }); location.reload(); } catch (e) { alert(e.message); } }; nav.appendChild(wrap);
  }

  async function loadSession() { try { const result = await api("/api/auth", { method: "GET" }); if (result.authenticated) updateHeader(result.user); } catch {} }

  document.addEventListener("DOMContentLoaded", () => {
    styles();
    document.querySelectorAll("a[href='#login']").forEach(a => a.addEventListener("click", e => { e.preventDefault(); open("login"); }));
    document.querySelectorAll("a[href='#signup']").forEach(a => a.addEventListener("click", e => { e.preventDefault(); open("signup"); }));
    loadSession();
  });
})();
