// ---------- Planberry accounts ----------
// Accounts are saved in this browser (localStorage). Passwords are stored
// scrambled (hashed), never as plain text. Each account gets its own task list.
// Note: accounts live on this device only. To log in from any device,
// this file can later be swapped for Firebase or Supabase.

const Planberry = {
  USERS_KEY: "planberry_users",
  SESSION_KEY: "planberry_session",

  getUsers: function () {
    try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || {}; }
    catch (e) { return {}; }
  },

  saveUsers: function (users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  hash: async function (text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  },

  signUp: async function (name, email, password) {
    name = name.trim();
    email = email.trim().toLowerCase();
    if (!name) throw new Error("Please enter your name.");
    if (!email.includes("@")) throw new Error("Please enter a valid email.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const users = this.getUsers();
    if (users[email]) throw new Error("An account with this email already exists. Try logging in.");

    // The very first account keeps the tasks that were saved before accounts existed
    if (Object.keys(users).length === 0) {
          ["tasks", "reminded", "streak", "categories"].forEach(function (key) {
        const old = localStorage.getItem(key);
        if (old !== null) {
          localStorage.setItem(key + ":" + email, old);
          localStorage.removeItem(key);
        }
      });
    }

    users[email] = { name: name, password: await this.hash(email + password) };
    this.saveUsers(users);
    localStorage.setItem(this.SESSION_KEY, email);
  },

  logIn: async function (email, password) {
    email = email.trim().toLowerCase();
    const user = this.getUsers()[email];
    if (!user || user.password !== await this.hash(email + password)) {
      throw new Error("Wrong email or password.");
    }
    localStorage.setItem(this.SESSION_KEY, email);
  },

  // ---------- Account settings ----------
  updateName: function (name) {
    const me = this.currentUser();
    name = name.trim();
    if (!me) throw new Error("Please log in again.");
    if (!name) throw new Error("Please enter your name.");
    const users = this.getUsers();
    users[me.email].name = name;
    this.saveUsers(users);
  },

  changePassword: async function (current, next) {
    const me = this.currentUser();
    if (!me) throw new Error("Please log in again.");
    const users = this.getUsers();
    if (users[me.email].password !== await this.hash(me.email + current)) {
      throw new Error("Your current password is wrong.");
    }
    if (next.length < 6) throw new Error("New password must be at least 6 characters.");
    users[me.email].password = await this.hash(me.email + next);
    this.saveUsers(users);
  },

  deleteAccount: async function (password) {
    const me = this.currentUser();
    if (!me) throw new Error("Please log in again.");
    const users = this.getUsers();
    if (users[me.email].password !== await this.hash(me.email + password)) {
      throw new Error("Wrong password, so nothing was deleted.");
    }
    ["tasks", "reminded", "streak"].forEach(function (key) {
      localStorage.removeItem(key + ":" + me.email);
    });
    delete users[me.email];
    this.saveUsers(users);
    localStorage.removeItem(this.SESSION_KEY);
  },

  logOut: function () {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = "landing.html";
  },

  currentUser: function () {
    const email = localStorage.getItem(this.SESSION_KEY);
    const user = email && this.getUsers()[email];
    return user ? { email: email, name: user.name } : null;
  },

  // Used by the to-do page: sends logged-out visitors to the landing page
  requireUser: function () {
    const user = this.currentUser();
    if (!user) {
      window.location.replace("landing.html");
      throw new Error("Not logged in"); // stops the rest of the page's script
    }
    return user;
  }
};

// Shared code for the sign-up and login forms
function setupAuthForm(formId, action) {
  const form = document.getElementById(formId);
  const error = document.getElementById("Auth-error");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    error.classList.add("d-none");
    try {
      await action(new FormData(form));
      window.location.href = "index.html";
    } catch (e) {
      error.textContent = e.message;
      error.classList.remove("d-none");
    }
  });
}