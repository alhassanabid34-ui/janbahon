(() => {
  const API = '/api/auth';
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits = s => String(s || '').replace(/\D/g,'').slice(0,10);
  let modal;

  async function api(action, body) {
    const r = await fetch(API + '?action=' + encodeURIComponent(action), {method:'POST', credentials:'same-origin', headers:{'content-type':'application/json','accept':'application/json'}, body:JSON.stringify(body || {})});
    const text = await r.text();
    let d; try { d = JSON.parse(text); } catch { throw new Error('Authentication server error (' + r.status + ').'); }
    if (!r.ok) throw new Error(d.error || 'Request failed.');
    return d;
  }
  function css(){
    if(document.getElementById('jb-auth-lite-css')) return;
    const s=document.createElement('style'); s.id='jb-auth-lite-css'; s.textContent=`
      .jbal-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Arial,sans-serif}
      .jbal-card{width:min(460px,100%);background:#fff;border-radius:18px;padding:28px;box-shadow:0 20px 70px rgba(0,0,0,.35);position:relative}
      .jbal-x{position:absolute;right:12px;top:10px;border:0;background:#eee;border-radius:50%;width:36px;height:36px;font-size:22px;cursor:pointer}
      .jbal-card h2{margin:0 0 8px;color:#082b5c}.jbal-card p{color:#667085}.jbal-card label{display:block;font-size:12px;font-weight:bold;margin:13px 0 5px;color:#082b5c}.jbal-card input{width:100%;box-sizing:border-box;height:46px;border:1px solid #ccd4dd;border-radius:9px;padding:0 12px;font-size:15px}.jbal-btn{width:100%;height:48px;border:0;border-radius:9px;background:#f47b20;color:#fff;font-weight:bold;margin-top:15px;cursor:pointer}.jbal-btn:disabled{opacity:.6}.jbal-link{border:0;background:none;color:#07579b;cursor:pointer;margin-top:12px}.jbal-msg{margin-top:12px;padding:10px;border-radius:8px;background:#fff0f0;color:#9d2525;font-size:13px}.jbal-ok{background:#edf9f1;color:#176b3b}
    `; document.head.appendChild(s);
  }
  function show(html){css(); if(modal) modal.remove(); modal=document.createElement('div'); modal.className='jbal-overlay'; modal.innerHTML='<div class="jbal-card"><button type="button" class="jbal-x" aria-label="Close">×</button>'+html+'</div>'; document.body.appendChild(modal); modal.querySelector('.jbal-x').onclick=close; return modal;}
  function close(){if(modal){modal.remove();modal=null;}}
  function error(e){const m=modal&&modal.querySelector('.jbal-msg'); if(m){m.style.display='block';m.textContent=e.message||String(e);m.className='jbal-msg';}}
  function login(){
    const m=show('<h2>Passenger Login</h2><p>Login using your mobile number and password.</p><form id="jbalForm"><label>Mobile number</label><input id="jbalMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"><label>Password</label><input id="jbalPass" type="password" placeholder="Password"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Login</button></form><button type="button" class="jbal-link" id="jbalOtp">Login with SMS OTP</button><button type="button" class="jbal-link" id="jbalSignup">Create account</button><button type="button" class="jbal-link" id="jbalReset">Forgot password?</button>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();const mobile=digits(m.querySelector('#jbalMobile').value);const password=m.querySelector('#jbalPass').value;if(mobile.length!==10)return error(new Error('Enter a valid 10-digit mobile number.'));if(!password)return error(new Error('Enter your password.'));const b=e.submitter;b.disabled=true;try{const d=await api('login-password',{mobile:'+91'+mobile,password});close();window.dispatchEvent(new CustomEvent('janbahon:login',{detail:d.user}));}catch(x){error(x)}finally{b.disabled=false}};
    m.querySelector('#jbalOtp').onclick=otpLogin; m.querySelector('#jbalSignup').onclick=signup; m.querySelector('#jbalReset').onclick=reset;
  }
  function otpLogin(){
    const m=show('<h2>Login with SMS OTP</h2><p>Enter your mobile number and we will send an OTP.</p><form id="jbalForm"><label>Mobile number</label><input id="jbalMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Send OTP</button></form><button type="button" class="jbal-link" id="jbalBack">Back to password login</button>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();const mobile=digits(m.querySelector('#jbalMobile').value);if(mobile.length!==10)return error(new Error('Enter a valid 10-digit mobile number.'));try{await api('login-send-otp',{mobile:'+91'+mobile});otpVerify(mobile,'login-otp','Passenger Login');}catch(x){error(x)}};m.querySelector('#jbalBack').onclick=login;
  }
  function otpVerify(mobile,action,title){
    const m=show('<h2>'+title+'</h2><p>Enter the 6-digit SMS OTP sent to +91 '+esc(mobile)+'.</p><form id="jbalForm"><label>SMS OTP</label><input id="jbalOtp" inputmode="numeric" maxlength="6" placeholder="6-digit OTP"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Verify</button></form>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();try{const d=await api(action,{mobile:'+91'+mobile,code:m.querySelector('#jbalOtp').value.trim()});close();window.dispatchEvent(new CustomEvent('janbahon:login',{detail:d.user||{mobile:'+91'+mobile,full_name:'Passenger'}}));}catch(x){error(x)}};
  }
  function signup(){
    const m=show('<h2>Create Passenger Account</h2><p>Register with mobile OTP and a password.</p><form id="jbalForm"><label>Full name</label><input id="jbalName" maxlength="100" placeholder="Your full name"><label>Mobile number</label><input id="jbalMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"><label>Password</label><input id="jbalPass" type="password" placeholder="At least 6 characters"><label>Confirm password</label><input id="jbalConfirm" type="password" placeholder="Repeat password"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Send SMS OTP</button></form><button type="button" class="jbal-link" id="jbalLogin">Already registered? Login</button>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();const name=m.querySelector('#jbalName').value.trim(),mobile=digits(m.querySelector('#jbalMobile').value),p=m.querySelector('#jbalPass').value,c=m.querySelector('#jbalConfirm').value;if(!name)return error(new Error('Enter your full name.'));if(mobile.length!==10)return error(new Error('Enter a valid 10-digit mobile number.'));if(p.length<6)return error(new Error('Password must be at least 6 characters.'));if(p!==c)return error(new Error('Passwords do not match.'));try{await api('register-send-otp',{mobile:'+91'+mobile});signupOtp(mobile,name,p);}catch(x){error(x)}};m.querySelector('#jbalLogin').onclick=login;
  }
  function signupOtp(mobile,name,password){
    const m=show('<h2>Verify Mobile</h2><p>Enter the OTP sent to +91 '+esc(mobile)+'.</p><form id="jbalForm"><label>SMS OTP</label><input id="jbalOtp" inputmode="numeric" maxlength="6" placeholder="6-digit OTP"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Create Account</button></form>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();try{const d=await api('register',{mobile:'+91'+mobile,code:m.querySelector('#jbalOtp').value.trim(),fullName:name,password});close();window.dispatchEvent(new CustomEvent('janbahon:login',{detail:{user_id:d.userId,mobile:'+91'+mobile,full_name:name}}));}catch(x){error(x)}};
  }
  function reset(){
    const m=show('<h2>Reset Password</h2><p>We will send an SMS OTP to your registered mobile.</p><form id="jbalForm"><label>Mobile number</label><input id="jbalMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Send OTP</button></form><button type="button" class="jbal-link" id="jbalLogin">Back to login</button>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();const mobile=digits(m.querySelector('#jbalMobile').value);if(mobile.length!==10)return error(new Error('Enter a valid 10-digit mobile number.'));try{await api('reset-send-otp',{mobile:'+91'+mobile});resetOtp(mobile);}catch(x){error(x)}};m.querySelector('#jbalLogin').onclick=login;
  }
  function resetOtp(mobile){
    const m=show('<h2>Set New Password</h2><p>Enter the SMS OTP and your new password.</p><form id="jbalForm"><label>SMS OTP</label><input id="jbalOtp" inputmode="numeric" maxlength="6" placeholder="6-digit OTP"><label>New password</label><input id="jbalPass" type="password" placeholder="At least 6 characters"><label>Confirm password</label><input id="jbalConfirm" type="password" placeholder="Repeat password"><div class="jbal-msg" style="display:none"></div><button type="submit" class="jbal-btn">Reset Password</button></form>');
    m.querySelector('#jbalForm').onsubmit=async e=>{e.preventDefault();const p=m.querySelector('#jbalPass').value,c=m.querySelector('#jbalConfirm').value;if(p.length<6)return error(new Error('Password must be at least 6 characters.'));if(p!==c)return error(new Error('Passwords do not match.'));try{await api('reset-password',{mobile:'+91'+mobile,code:m.querySelector('#jbalOtp').value.trim(),password:p});close();login();}catch(x){error(x)}};
  }
  window.JanbahonPassengerAuth={open:m=>m==='signup'?signup:login,close};
})();
