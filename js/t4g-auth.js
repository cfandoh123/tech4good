/* ============================================================
   Tech4Good — student auth + progress (first name + last name + PIN)
   ------------------------------------------------------------
   Requires the Supabase JS library to be loaded FIRST on the page:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/t4g-auth.js"></script>

   HOW LOGIN WORKS (kid-friendly, no email needed):
   The student types a first name, a last name, and a 4-digit PIN.
   Under the hood we turn that into a synthetic account Supabase can
   handle: a fake email built from their full name, and a password built
   from the PIN. The kid never sees the email — they only ever type
   first name + last name + PIN.
   ============================================================ */

/* ------------------------------------------------------------------
   1) PASTE YOUR SUPABASE PROJECT VALUES HERE
   Find them in: Supabase Dashboard → Project Settings → API
   ------------------------------------------------------------------ */
const SUPABASE_URL      = 'https://qpwwmxiwnrqiumlrnbjw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oaJg6qm7mJqGSRo9u-Pq9A_RzHtxaR0';
/* ------------------------------------------------------------------ */

(function () {
  'use strict';

  const CONFIGURED =
    SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1 &&
    SUPABASE_ANON_KEY.indexOf('YOUR-ANON') === -1;

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[T4G] Supabase library not found. Add the CDN <script> before t4g-auth.js.');
    return;
  }

  const client = CONFIGURED
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // Synthetic-account plumbing (kids never see this) ----------------
  const EMAIL_DOMAIN = 'students.tech4good.live';

  function slug(str) {
    return String(str).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '.')   // spaces / punctuation -> dot
      .replace(/^\.+|\.+$/g, '');    // trim leading/trailing dots
  }
  // Identity = the student's full name (first + last). No class code — kept simple.
  function emailFor(name) {
    return slug(name) + '@' + EMAIL_DOMAIN;
  }
  // Join first + last into the single display/identity string the email is built from.
  function fullName(first, last) {
    return (String(first || '').trim() + ' ' + String(last || '').trim()).trim();
  }
  // Password must be >= 6 chars for Supabase, so we pad the 4-digit PIN.
  function passwordFor(pin) {
    return 't4g-' + String(pin);
  }

  // Serialises badge writes so concurrent award() calls can't clobber each other.
  let _chain = Promise.resolve();

  function ensureReady() {
    if (!CONFIGURED || !client) {
      throw new Error('Login is not set up yet. Add your Supabase keys in js/t4g-auth.js — see SETUP-LOGIN.md.');
    }
  }

  // ---- Public API -------------------------------------------------
  const T4G = {
    client,
    isConfigured: CONFIGURED,

    // Create a new student account, then their profile row.
    async signUp({ firstName, lastName, pin }) {
      ensureReady();
      const first = String(firstName || '').trim();
      const last  = String(lastName  || '').trim();
      const name  = fullName(first, last);

      // Create the auth user.
      const { data, error } = await client.auth.signUp({
        email: emailFor(name),
        password: passwordFor(pin),
      });
      if (error) {
        if (/already registered|already exists/i.test(error.message)) {
          throw new Error('That first and last name is already taken. Try adding your middle initial.');
        }
        throw error;
      }
      if (!data.session) {
        // Email confirmation is still ON in Supabase — logins can't work with fake emails.
        throw new Error('Almost there — but the site owner still needs to turn OFF "Confirm email" in Supabase (see SETUP-LOGIN.md).');
      }

      // Create their profile row.
      const { error: pErr } = await client.from('profiles').insert({
        id: data.user.id,
        first_name: first,
        last_name: last,
        display_name: name,
        badges: [],
      });
      if (pErr) throw pErr;
      return data.user;
    },

    // Sign an existing student in.
    async login({ firstName, lastName, pin }) {
      ensureReady();
      const name = fullName(firstName, lastName);
      const { data, error } = await client.auth.signInWithPassword({
        email: emailFor(name),
        password: passwordFor(pin),
      });
      if (error) {
        throw new Error('We could not find that. Double-check your first and last name, and PIN.');
      }
      return data.user;
    },

    async logout() {
      if (!client) return;
      await client.auth.signOut();
    },

    // The current auth user, or null.
    async currentUser() {
      if (!client) return null;
      const { data } = await client.auth.getUser();
      return data ? data.user : null;
    },

    // The current student's profile row, or null.
    async getProfile() {
      if (!client) return null;
      const user = await this.currentUser();
      if (!user) return null;
      const { data, error } = await client
        .from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) { console.error('[T4G] getProfile', error); return null; }
      return data;
    },

    // Record a newly-earned badge. No-op if not logged in or already earned.
    // Writes are serialised (see _chain) so fast scrolling can't drop a badge.
    // Returns the updated badge list (or null if not saved).
    addBadge(key) {
      if (!client) return Promise.resolve(null);
      _chain = _chain.then(async () => {
        const profile = await this.getProfile();
        if (!profile) return null;
        const badges = Array.isArray(profile.badges) ? profile.badges : [];
        if (badges.includes(key)) return badges;
        const next = badges.concat(key);
        const { error } = await client.from('profiles')
          .update({ badges: next, updated_at: new Date().toISOString() })
          .eq('id', profile.id);
        if (error) { console.error('[T4G] addBadge', error); return badges; }
        return next;
      }).catch((e) => { console.error('[T4G] addBadge', e); return null; });
      return _chain;
    },

    // Redirect to login unless signed in. Call at the top of protected pages.
    async requireAuth(redirectTo) {
      const user = await this.currentUser();
      if (!user) {
        const back = encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
        location.href = (redirectTo || 'login.html') + '?next=' + back;
        return null;
      }
      return user;
    },

    // Swap the "Log in" nav link for "Hi, <name> · Log out" once signed in.
    // Works with both nav styles on the site (.nav-links and .tnav).
    async renderNav() {
      const nav = document.querySelector('.nav-links') || document.querySelector('.tnav');
      if (!nav) return;

      let link = nav.querySelector('[data-t4g-auth]');
      if (!link) {
        link = document.createElement('a');
        link.setAttribute('data-t4g-auth', '');
        nav.appendChild(link);
      }

      const profile = await this.getProfile();
      if (profile) {
        link.textContent = 'Hi, ' + (profile.display_name.split(' ')[0]);
        link.href = 'profile.html';
        link.style.fontWeight = '700';

        let out = nav.querySelector('[data-t4g-logout]');
        if (!out) {
          out = document.createElement('a');
          out.setAttribute('data-t4g-logout', '');
          out.textContent = 'Log out';
          out.href = '#';
          out.style.cursor = 'pointer';
          out.addEventListener('click', async (e) => {
            e.preventDefault();
            await T4G.logout();
            location.href = 'index.html';
          });
          nav.appendChild(out);
        }
      } else {
        link.textContent = 'Log in';
        link.href = 'login.html';
      }
    },
  };

  window.T4G = T4G;

  // Auto-render nav auth state on every page that loads this script.
  if (document.readyState !== 'loading') T4G.renderNav();
  else document.addEventListener('DOMContentLoaded', () => T4G.renderNav());
})();
