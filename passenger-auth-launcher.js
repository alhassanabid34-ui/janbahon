(() => {
  function showError(message) {
    alert("JANBAHON Passenger Login\n\n" + message);
  }

  function openLogin() {
    if (
      window.JanbahonPassengerAuth &&
      typeof window.JanbahonPassengerAuth.open === "function"
    ) {
      window.JanbahonPassengerAuth.open("login");
      return;
    }

    showError(
      "Passenger authentication module is not loaded.\n\n" +
      "Please refresh the page and try again."
    );
  }

  function openSignup() {
    if (
      window.JanbahonPassengerAuth &&
      typeof window.JanbahonPassengerAuth.open === "function"
    ) {
      window.JanbahonPassengerAuth.open("signup");
      return;
    }

    showError(
      "Passenger authentication module is not loaded.\n\n" +
      "Please refresh the page and try again."
    );
  }

  window.jbOpenPassengerAuth = function (mode) {
    if (mode === "signup") {
      openSignup();
    } else {
      openLogin();
    }
  };

  function bindButtons() {
    const login = document.getElementById("jbPassengerLogin");
    const signup = document.getElementById("jbPassengerSignup");

    if (login) {
      login.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        openLogin();
      };
    }

    if (signup) {
      signup.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        openSignup();
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindButtons);
  } else {
    bindButtons();
  }
})();
