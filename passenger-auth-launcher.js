(() => {
  const AUTH_SRC = 'passenger-auth-lite.js?v=20260816-3';
  let loading;

  function showLaunchError(message) {
    let box = document.getElementById('jb-auth-launch-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'jb-auth-launch-error';
      box.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;background:#fff0f0;color:#9d2525;border:1px solid #f2b8b8;border-radius:10px;padding:12px 16px;font:600 14px Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.18);max-width:90vw;text-align:center;';
      document.body.appendChild(box);
    }
    box.textContent = message;
    setTimeout(() => box.remove(), 5000);
  }

  function loadAuth() {
    if (window.JanbahonPassengerAuth && typeof window.JanbahonPassengerAuth.open === 'function') return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = AUTH_SRC;
      script.async = false;
      script.onload = () => {
        if (window.JanbahonPassengerAuth && typeof window.JanbahonPassengerAuth.open === 'function') resolve();
        else reject(new Error('Passenger authentication module did not initialise.'));
      };
      script.onerror = () => reject(new Error('Passenger authentication module could not be loaded.'));
      document.head.appendChild(script);
    });
    return loading;
  }

  async function open(mode) {
    try {
      await loadAuth();
      window.JanbahonPassengerAuth.open(mode === 'signup' ? 'signup' : 'login');
    } catch (err) {
      showLaunchError(err.message || 'Passenger login is temporarily unavailable.');
      console.error('[JANBAHON passenger auth]', err);
    }
  }

  window.jbOpenPassengerAuth = open;

  function bind() {
    const login = document.getElementById('jbPassengerLogin');
    const signup = document.getElementById('jbPassengerSignup');
    if (login) login.onclick = e => { e.preventDefault(); open('login'); };
    if (signup) signup.onclick = e => { e.preventDefault(); open('signup'); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
