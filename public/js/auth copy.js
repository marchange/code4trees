// js/auth.js
// Gemeinsames Auth-Modul für index.html, login.html und registrieren.html.
// Session-Check, Login-/Register-Submit, Uni/Fakultät-Dropdowns, Redirects.

const AUTH_API_PATH = 'api/auth.php';
const SETUP_DATA_PATH = 'api/get_setup_data.php';

document.addEventListener('DOMContentLoaded', () => {

  const authNavBtn  = document.getElementById('authNavBtn');
  const authMessage = document.getElementById('authMessage');
  const currentPage = document.body.dataset.page || 'home'; // 'home' | 'login' | 'register'

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

    // Nickname automatisch ins Einreich-Formular übernehmen (nur auf index.html vorhanden)
    const nameField = document.getElementById('name');
    if (nameField && user.username) {
      nameField.value = user.username;
    }

    if (authNavBtn) {
      authNavBtn.textContent = `👤 ${user.username} · Logout`;
      authNavBtn.setAttribute('href', '#');
      authNavBtn.dataset.loggedIn = 'true';
    }
  }

  // Logout-Klick auf den Header-Button, nur wenn gerade eingeloggt.
  if (authNavBtn) {
    authNavBtn.addEventListener('click', async (e) => {
      if (authNavBtn.dataset.loggedIn !== 'true') return; // normale Navigation zu login.html
      e.preventDefault();
      try {
        await fetch(`${AUTH_API_PATH}?action=logout`, { method: 'POST' });
      } catch (error) {
        console.error('Logout fehlgeschlagen:', error);
      }
      window.location.href = 'index.html';
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
          const redirectTarget = params.get('redirect') || 'index.html';
          window.location.href = redirectTarget;
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
});