// js/auth.js
// Gemeinsames Auth-Modul für index.html, login.html und registrieren.html.
// Session-Check, Login-/Register-Submit, Uni/Fakultät-Dropdowns, Redirects.

const AUTH_API_PATH = 'api/auth.php';
const SETUP_DATA_PATH = 'api/get_setup_data.php';

document.addEventListener('DOMContentLoaded', () => {

  const authNavBtn     = document.getElementById('authNavBtn');
  const authNavWrapper = document.getElementById('authNavWrapper');
  const authDropdown   = document.getElementById('authDropdown');
  const logoutBtn      = document.getElementById('logoutBtn');
  const authMessage    = document.getElementById('authMessage');
  const currentPage    = document.body.dataset.page || 'home'; // 'home' | 'login' | 'register' | 'profile'

  // =====================================================================
  // --- Auth-Message Helper (auf allen Seiten identisch gestylt) ---
  // =====================================================================

  function showAuthMessage(msg, isError = false) {
    if (!authMessage) return;
    authMessage.textContent = msg;
    authMessage.style.display = 'block';
    authMessage.style.color = isError ? '#FF5F56' : 'var(--leaf)';
  }

  function clearAuthMessage() {
    if (!authMessage) return;
    authMessage.textContent = '';
    authMessage.style.display = 'none';
  }

  function setAuthBusy(formEl, busy, busyLabel, idleLabel) {
    if (!formEl) return;
    const btn = formEl.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? busyLabel : idleLabel;
  }

  // =====================================================================
  // --- Eingeloggten Zustand anwenden (Header-Button, Einreich-Formular) ---
  // =====================================================================

  function applyLoggedInUser(user) {
    if (!user) return;
    window.currentUser = user;
  
    const submitAsUserEl = document.getElementById('submitAsUser');
    if (submitAsUserEl && user.username) {
      submitAsUserEl.textContent = `👤 ${user.username}`;
    }
  

    if (authNavBtn) {
      authNavBtn.textContent = `👤 ${user.username} ▾`;
      authNavBtn.removeAttribute('href');
      authNavBtn.dataset.loggedIn = 'true';
    }
  }

  // =====================================================================
  // --- Logout (zentral, wiederverwendbar) ---
  // =====================================================================

  async function logoutUser() {
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = '🚪 Logge aus…';
    }
    try {
      await fetch(`${AUTH_API_PATH}?action=logout`, { method: 'POST' });
    } catch (error) {
      console.error('Logout fehlgeschlagen:', error);
    }
    window.location.href = 'index.html';
  }

  // =====================================================================
  // --- Auth-Modal: Öffnen / Schließen (nur auf index.html vorhanden) ---
  // =====================================================================

  const authModal    = document.getElementById('authModal');
  const closeAuthBtn = document.getElementById('closeAuthBtn');

  function openAuthModal() {
    if (!authModal) return;
    authModal.style.display = 'flex';
    authModal.setAttribute('aria-hidden', 'false');
    clearAuthMessage();
    loadSetupData(); // no-op außerhalb von registrieren.html/Modal ohne Uni-Dropdown
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.style.display = 'none';
    authModal.setAttribute('aria-hidden', 'true');
  }

  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal && authModal.style.display === 'flex') {
      closeAuthModal();
    }
  });

  // Dropdown öffnen/schließen: Klick auf den Nav-Button togglet nur, wenn eingeloggt.
  // Ist niemand eingeloggt, öffnet der Klick stattdessen das Login-Modal (index.html)
  // bzw. läuft als normale Navigation zu login.html/registrieren.html weiter.
  if (authNavBtn) {
    authNavBtn.addEventListener('click', (e) => {
      if (authNavBtn.dataset.loggedIn === 'true') {
        e.preventDefault();
        const isOpen = authDropdown && !authDropdown.hidden;
        if (authDropdown) authDropdown.hidden = isOpen;
        return;
      }
  
      window.location.href = 'registrieren.html';
    });
  }

  // Klick außerhalb schließt das Dropdown.
  document.addEventListener('click', (e) => {
    if (!authNavWrapper || !authDropdown || authDropdown.hidden) return;
    if (!authNavWrapper.contains(e.target)) authDropdown.hidden = true;
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }

  // Sicherheitsnetz: "Jetzt registrieren"-Link im index.html-Modal garantiert
  // zu registrieren.html schicken, egal was script.js sonst mit Modal-Klicks macht.
  const toRegisterLink = document.getElementById('toRegisterLink');
  if (toRegisterLink) {
    toRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'registrieren.html';
    });
  }

  // =====================================================================
  // --- Session-Check ---
  // Auf login.html/registrieren.html: bereits eingeloggte Nutzer sofort
  // weiterleiten, statt ihnen nochmal ein Formular zu zeigen.
  // =====================================================================

  async function checkExistingSession() {
    try {
      const response = await fetch(`${AUTH_API_PATH}?action=me`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.status === 'success' && data.loggedIn) {
        applyLoggedInUser(data.user);
        if (currentPage === 'login' || currentPage === 'register') {
          const params = new URLSearchParams(window.location.search);
          window.location.href = params.get('redirect') || 'index.html';
        }
      }
    } catch (error) {
      console.error('Session-Check fehlgeschlagen:', error);
    }
  }

  checkExistingSession();

  // =====================================================================
  // --- Uni/Fakultät-Dropdowns (nur auf registrieren.html vorhanden) ---
  // =====================================================================

  const regUniversitySelect = document.getElementById('regUniversity');
  const regFacultySelect    = document.getElementById('regFaculty');

  let setupDataCache = null;
  let setupDataLoaded = false;
  let setupDataLoading = false;

  async function loadSetupData() {
    if (!regUniversitySelect) return;
    if (setupDataLoaded || setupDataLoading) return;

    setupDataLoading = true;
    try {
      const response = await fetch(SETUP_DATA_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setupDataCache = {
        universities: data.universities || [],
        faculties: data.faculties || []
      };

      populateUniversityDropdown(setupDataCache.universities);
      setupDataLoaded = true;
    } catch (error) {
      console.error('Fehler beim Laden der Stammdaten (get_setup_data.php):', error);
      showAuthMessage('Universitäten konnten nicht geladen werden. Bitte später erneut versuchen.', true);
    } finally {
      setupDataLoading = false;
    }
  }

  function populateUniversityDropdown(universities) {
    if (!regUniversitySelect) return;

    regUniversitySelect.innerHTML = '<option value="" disabled selected>Universität wählen…</option>';
    universities.forEach(uni => {
      const opt = document.createElement('option');
      opt.value = uni.id;
      opt.textContent = uni.name;
      regUniversitySelect.appendChild(opt);
    });

    if (regFacultySelect) {
      regFacultySelect.innerHTML = '<option value="" disabled selected>Zuerst Universität wählen</option>';
      regFacultySelect.disabled = true;
    }
  }

  function populateFacultyDropdown(universityId) {
    if (!regFacultySelect || !setupDataCache) return;

    const filteredFaculties = setupDataCache.faculties.filter(
      f => String(f.university_id) === String(universityId)
    );

    regFacultySelect.innerHTML = '';

    if (filteredFaculties.length === 0) {
      regFacultySelect.innerHTML = '<option value="" disabled selected>Keine Fakultäten gefunden</option>';
      regFacultySelect.disabled = true;
      return;
    }

    regFacultySelect.innerHTML = '<option value="" disabled selected>Fakultät wählen…</option>';
    filteredFaculties.forEach(fac => {
      const opt = document.createElement('option');
      opt.value = fac.id;
      opt.textContent = fac.name;
      regFacultySelect.appendChild(opt);
    });
    regFacultySelect.disabled = false;
  }

  if (regUniversitySelect) {
    loadSetupData();
    regUniversitySelect.addEventListener('change', (e) => {
      populateFacultyDropdown(e.target.value);
    });
  }

  // =====================================================================
  // --- Registrierung ---
  // =====================================================================

  const registerForm = document.getElementById('registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthMessage();

      if (!registerForm.checkValidity()) {
        registerForm.reportValidity();
        return;
      }

      setAuthBusy(registerForm, true, 'Registriere…', 'Registrieren');

      try {
        const formData = new FormData(registerForm);
        const emailValue = formData.get('email');

        const response = await fetch(`${AUTH_API_PATH}?action=register`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          showAuthMessage(data.message || 'Registrierung erfolgreich!');
          registerForm.reset();
          // Kurz die Bestätigung zeigen, dann rüber zum Login (mit vorausgefüllter E-Mail).
          setTimeout(() => {
            window.location.href = `login.html?registered=1&email=${encodeURIComponent(emailValue)}`;
          }, 1800);
        } else {
          showAuthMessage(data.message || 'Registrierung fehlgeschlagen. Bitte Angaben prüfen.', true);
          setAuthBusy(registerForm, false, 'Registriere…', 'Registrieren');
        }
      } catch (error) {
        console.error('Registrierungsfehler:', error);
        showAuthMessage('Verbindungsfehler. Bitte später erneut versuchen.', true);
        setAuthBusy(registerForm, false, 'Registriere…', 'Registrieren');
      }
    });
  }

  // =====================================================================
  // --- Login ---
  // =====================================================================

  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    const params = new URLSearchParams(window.location.search);

    if (params.get('registered') === '1') {
      showAuthMessage('Registrierung erfolgreich! Bitte bestätige zuerst deine E-Mail-Adresse (Link in deinem Postfach), dann kannst du dich einloggen.');
    }

    const prefillEmail = params.get('email');
    const loginEmailField = document.getElementById('loginEmail');
    if (prefillEmail && loginEmailField) {
      loginEmailField.value = prefillEmail;
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthMessage();

      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }

      setAuthBusy(loginForm, true, 'Anmeldung läuft…', 'Einloggen');

      try {
        const formData = new FormData(loginForm);
        const response = await fetch(`${AUTH_API_PATH}?action=login`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          applyLoggedInUser(data.user);
          showAuthMessage(data.message || 'Login erfolgreich!');
          if (currentPage === 'home' && authModal) {
            // Im Modal auf index.html: nur schließen, keine harte Navigation nötig.
            setTimeout(closeAuthModal, 700);
            setAuthBusy(loginForm, false, 'Anmeldung läuft…', 'Einloggen');
          } else {
            const redirectTarget = params.get('redirect') || 'index.html';
            window.location.href = redirectTarget;
          }
        } else {
          showAuthMessage(data.message || 'Login fehlgeschlagen. Bitte Zugangsdaten prüfen.', true);
          setAuthBusy(loginForm, false, 'Anmeldung läuft…', 'Einloggen');
        }
      } catch (error) {
        console.error('Login-Fehler:', error);
        showAuthMessage('Verbindungsfehler. Bitte später erneut versuchen.', true);
        setAuthBusy(loginForm, false, 'Anmeldung läuft…', 'Einloggen');
      }
    });
  }

  // =====================================================================
  // --- Profilseite (profil.html) ---
  // Nicht eingeloggte Nutzer werden zum Login geschickt. Eingeloggte Nutzer
  // bekommen ihre aktuellen Daten vorausgefüllt und können sie ändern.
  // =====================================================================

  if (currentPage === 'profile') {
    const profileForm     = document.getElementById('profileForm');
    const passwordForm     = document.getElementById('passwordForm');
    const profileUniversitySelect = document.getElementById('profileUniversity');
    const profileFacultySelect    = document.getElementById('profileFaculty');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    async function loadProfile() {
      try {
        const response = await fetch(`${AUTH_API_PATH}?action=me`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || data.status !== 'success' || !data.loggedIn) {
          const target = encodeURIComponent('profil.html');
          window.location.href = `login.html?redirect=${target}`;
          return;
        }

        applyLoggedInUser(data.user);
        fillProfileForm(data.user);
      } catch (error) {
        console.error('Profil konnte nicht geladen werden:', error);
        showAuthMessage('Profil konnte nicht geladen werden. Bitte Seite neu laden.', true);
      }
    }

    function fillProfileForm(user) {
      if (!profileForm) return;
      const usernameField = document.getElementById('profileUsername');
      const emailField     = document.getElementById('profileEmail');
      const treeCountField = document.getElementById('profileTreeCount');

      if (usernameField) usernameField.value = user.username || '';
      if (emailField)     emailField.value = user.email || '';
      if (treeCountField) treeCountField.textContent = user.tree_count ?? '0';

      // Uni/Fakultät-Dropdowns mit denselben Stammdaten füllen wie bei der Registrierung.
      if (profileUniversitySelect) {
        loadSetupDataForProfile().then(() => {
          if (user.university_id) {
            profileUniversitySelect.value = user.university_id;
            populateFacultyDropdownGeneric(profileFacultySelect, user.university_id);
            if (profileFacultySelect && user.faculty_id) {
              profileFacultySelect.value = user.faculty_id;
            }
          }
        });
      }
    }

    // Stammdaten laden (falls noch nicht über die Registrierung geladen) und Uni-Dropdown füllen.
    async function loadSetupDataForProfile() {
      if (!setupDataCache) {
        try {
          const response = await fetch(SETUP_DATA_PATH, { cache: 'no-store' });
          const data = await response.json();
          setupDataCache = { universities: data.universities || [], faculties: data.faculties || [] };
        } catch (error) {
          console.error('Stammdaten für Profil konnten nicht geladen werden:', error);
          return;
        }
      }
      if (profileUniversitySelect) {
        profileUniversitySelect.innerHTML = '<option value="" disabled>Universität wählen…</option>';
        setupDataCache.universities.forEach(uni => {
          const opt = document.createElement('option');
          opt.value = uni.id;
          opt.textContent = uni.name;
          profileUniversitySelect.appendChild(opt);
        });
      }
    }

    function populateFacultyDropdownGeneric(selectEl, universityId) {
      if (!selectEl || !setupDataCache) return;
      const filtered = setupDataCache.faculties.filter(f => String(f.university_id) === String(universityId));
      selectEl.innerHTML = filtered.length
        ? '<option value="" disabled>Fakultät wählen…</option>'
        : '<option value="" disabled>Keine Fakultäten gefunden</option>';
      filtered.forEach(fac => {
        const opt = document.createElement('option');
        opt.value = fac.id;
        opt.textContent = fac.name;
        selectEl.appendChild(opt);
      });
      selectEl.disabled = filtered.length === 0;
    }

    if (profileUniversitySelect) {
      profileUniversitySelect.addEventListener('change', (e) => {
        populateFacultyDropdownGeneric(profileFacultySelect, e.target.value);
      });
    }

    // Stammdaten speichern (Nickname, E-Mail, Uni, Fakultät).
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAuthMessage();

        if (!profileForm.checkValidity()) {
          profileForm.reportValidity();
          return;
        }

        setAuthBusy(profileForm, true, 'Speichere…', 'Änderungen speichern');

        try {
          const formData = new FormData(profileForm);
          const response = await fetch(`${AUTH_API_PATH}?action=update_profile`, {
            method: 'POST',
            body: formData
          });
          const data = await response.json();

          if (response.ok && data.status === 'success') {
            showAuthMessage(data.message || 'Profil aktualisiert!');
            if (data.user) applyLoggedInUser(data.user);
          } else {
            showAuthMessage(data.message || 'Profil konnte nicht gespeichert werden.', true);
          }
        } catch (error) {
          console.error('Profil-Update fehlgeschlagen:', error);
          showAuthMessage('Verbindungsfehler. Bitte später erneut versuchen.', true);
        } finally {
          setAuthBusy(profileForm, false, 'Speichere…', 'Änderungen speichern');
        }
      });
    }

    // Passwort ändern (separates Formular, eigener Endpoint).
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAuthMessage();

        if (!passwordForm.checkValidity()) {
          passwordForm.reportValidity();
          return;
        }

        const newPw = passwordForm.querySelector('[name="new_password"]').value;
        const repeatPw = passwordForm.querySelector('[name="new_password_repeat"]').value;
        if (newPw !== repeatPw) {
          showAuthMessage('Die neuen Passwörter stimmen nicht überein.', true);
          return;
        }

        setAuthBusy(passwordForm, true, 'Ändere Passwort…', 'Passwort ändern');

        try {
          const formData = new FormData(passwordForm);
          const response = await fetch(`${AUTH_API_PATH}?action=update_password`, {
            method: 'POST',
            body: formData
          });
          const data = await response.json();

          if (response.ok && data.status === 'success') {
            showAuthMessage(data.message || 'Passwort erfolgreich geändert!');
            passwordForm.reset();
          } else {
            showAuthMessage(data.message || 'Passwort konnte nicht geändert werden.', true);
          }
        } catch (error) {
          console.error('Passwort-Update fehlgeschlagen:', error);
          showAuthMessage('Verbindungsfehler. Bitte später erneut versuchen.', true);
        } finally {
          setAuthBusy(passwordForm, false, 'Ändere Passwort…', 'Passwort ändern');
        }
      });
    }

    // Account löschen — fragt vorher nach, ruft dann den Endpoint auf.
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', async () => {
        const sure = window.confirm('Account wirklich unwiderruflich löschen? Dein digitaler Wald bleibt, dein Zugang geht verloren.');
        if (!sure) return;

        try {
          const response = await fetch(`${AUTH_API_PATH}?action=delete_account`, { method: 'POST' });
          const data = await response.json();
          if (response.ok && data.status === 'success') {
            window.location.href = 'index.html';
          } else {
            showAuthMessage(data.message || 'Account konnte nicht gelöscht werden.', true);
          }
        } catch (error) {
          console.error('Account-Löschung fehlgeschlagen:', error);
          showAuthMessage('Verbindungsfehler. Bitte später erneut versuchen.', true);
        }
      });
    }

    loadProfile();
  }
});