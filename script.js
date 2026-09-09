/*
=========================================================
 FLOWW
 Movie / Series App
 TMDB + session-only library
=========================================================

=========================================================
*/


/* =======================================================
   CONFIG
======================================================= */

const API_KEY = "e521383cf50f1d7e5df3396bf83bf119";

const gaysjorn = "7.0";
const gaytekst = "🔒";


/* =======================================================
   GLOBAL STATE
======================================================= */

let currentItem = null;
let currentAgeRating = "NR";
let currentSeason = 1;
let currentEpisode = 1;

let prevPage = "browsePage";

let autoplayTimer = null;
let autoplaySecondsLeft = 5;
let autoplayNextSeason = 1;
let autoplayNextEpisode = 1;

let totalEpisodesInSeason = 0;
let totalSeasons = 0;

let menuOpen = false;
let infinitePage = 1;
let infiniteLoading = false;
let infiniteObserver = null;
let categoryPage = 1;
let categoryLoading = false;
let activeCategoryId = 28;
let activeCategoryName = "Action";
let episodeRequestId = 0;
let sessionFavorites = [];
let sessionContinue = [];
let sessionWatched = {};
let sessionTheme = "dark";

function loadContinueFromStorage() {
  try {
    const raw = localStorage.getItem("cine_continue_watching");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

sessionContinue = loadContinueFromStorage();
let sessionLang = "en";
let ageVerified = false;
let playerLoadTimer = null;
let playerUrl = "";
let playerAttempt = 0;
let featuredCarouselTimer = null;


/* =======================================================
   LOCAL DATA
======================================================= */

function getFavorites() {
  return sessionFavorites;
}


function saveFavorites(favorites) {

  sessionFavorites = favorites;

}


function isFavorite(id) {

  return getFavorites().some(
    f => String(f.id) === String(id)
  );

}


/* =======================================================
   CONTINUE WATCHING
======================================================= */

function getContinue() {
  return Array.isArray(sessionContinue) ? sessionContinue : [];

}


function saveContinue(arr) {

  sessionContinue = Array.isArray(arr) ? arr : [];

  try {
    localStorage.setItem("cine_continue_watching", JSON.stringify(sessionContinue));
  } catch (error) {
    // localStorage may be unavailable in some environments; ignore gracefully.
  }

}


function addToContinue(item) {

  let arr = getContinue();

  if (item.type === "tv") {

    arr = arr.filter(
      x =>
        !(
          String(x.id) === String(item.id) &&
          x.type === "tv"
        )
    );

  } else {

    arr = arr.filter(
      x =>
        !(
          String(x.id) === String(item.id) &&
          x.type === "movie"
        )
    );

  }

  arr.unshift(item);

  if (arr.length > 20) {
    arr = arr.slice(0, 20);
  }

  saveContinue(arr);
}


function removeFromContinue(id, type) {

  let arr = getContinue();

  arr = arr.filter(
    x =>
      !(
        String(x.id) === String(id) &&
        x.type === type
      )
  );

  saveContinue(arr);
}


/* =======================================================
   WATCHED EPISODES
======================================================= */

function getWatched() {
  return sessionWatched;

}


function saveWatched(watched) {

  sessionWatched = watched;

}


function markEpisodeWatched(
  tvId,
  season,
  episode
) {

  const watched = getWatched();

  const key = String(tvId);

  if (!watched[key]) {
    watched[key] = {};
  }

  const seasonKey = String(season);

  if (!watched[key][seasonKey]) {
    watched[key][seasonKey] = [];
  }

  if (
    !watched[key][seasonKey].includes(episode)
  ) {
    watched[key][seasonKey].push(episode);
  }

  saveWatched(watched);
}


function hasWatchedEpisode(
  tvId,
  season,
  episode
) {

  const watched = getWatched();

  const key = String(tvId);

  return !!(
    watched[key] &&
    watched[key][String(season)] &&
    watched[key][String(season)].includes(episode)
  );

}


function hasWatchedWholeSeason(
  tvId,
  season,
  totalEps
) {

  const watched = getWatched();

  const key = String(tvId);

  const episodes =
    watched[key] &&
    watched[key][String(season)];

  if (!episodes) {
    return false;
  }

  return episodes.length >= totalEps;
}

function loadPlayerFrame() {
  const playerFrame = document.getElementById("playerFrame");
  if (!playerFrame || !playerUrl) return;

  clearTimeout(playerLoadTimer);

  if (!navigator.onLine) {
    playerFrame.innerHTML = `<div class="provider-error offline-error"><strong>No internet connection</strong><span>Cine cannot reach the video provider right now. Check your connection, then try again.</span><button onclick="retryPlayerLoad()">Try again</button><button class="provider-secondary" onclick="goBackToDetail()">Return to title</button></div>`;
    return;
  }

  playerFrame.innerHTML = `
    <iframe
      src="${playerUrl}"
      width="100%"
      height="100%"
      frameborder="0"
      allowfullscreen
    ></iframe>

  `;

}

/* =======================================================
  THEME
======================================================= */
function retryPlayerLoad() {
  playerAttempt += 1;
  if (playerAttempt > 2) playerAttempt = 2;
  loadPlayerFrame();
}
window.addEventListener("online", () => {
  if (document.getElementById("playerPage")?.classList.contains("active")) {
    retryPlayerLoad();
  }
});

function applyTheme(light) {
  document.body.classList.toggle("light-theme", light);
  sessionTheme = light ? "light" : "dark";

  const toggle =
    document.getElementById("themeToggle");

  if (toggle) {
    toggle.checked = light;
  }
}


function toggleTheme() {

  const toggle =
    document.getElementById("themeToggle");

  if (!toggle) {
    return;
  }

  applyTheme(toggle.checked);
}


/* =======================================================
   SETTINGS
======================================================= */

function openSettings() {

  closeMenu();

  document
    .getElementById("settingsModal")
    .classList.add("open");

}


function closeSettings() {

  document
    .getElementById("settingsModal")
    .classList.remove("open");

}


function closeSettingsOutside(event) {

  if (
    event.target ===
    document.getElementById("settingsModal")
  ) {

    closeSettings();

  }

}


/* =======================================================
   AUTH MODAL
======================================================= */

function openAuth() {

  closeMenu();

  const modal =
    document.getElementById("authModal");

  if (!modal) {
    return;
  }

  modal.classList.add("open");

  renderAuthState();
}


function closeAuth() {

  const modal =
    document.getElementById("authModal");

  if (modal) {
    modal.classList.remove("open");
  }

}


function closeAuthOutside(event) {

  const modal =
    document.getElementById("authModal");

  if (
    modal &&
    event.target === modal
  ) {
    closeAuth();
  }

}


/* =======================================================
   AUTH UI
======================================================= */

function switchAuthMode(mode) {

  const login =
    mode === "login";

  const loginTab =
    document.getElementById("loginTab");

  const signupTab =
    document.getElementById("signupTab");

  const loginForm =
    document.getElementById("loginForm");

  const signupForm =
    document.getElementById("signupForm");

  if (loginTab) {
    loginTab.classList.toggle(
      "active",
      login
    );
  }

  if (signupTab) {
    signupTab.classList.toggle(
      "active",
      !login
    );
  }

  if (loginForm) {
    loginForm.style.display =
      login ? "flex" : "none";
  }

  if (signupForm) {
    signupForm.style.display =
      login ? "none" : "flex";
  }

  setAuthMessage("");

}


function setAuthMessage(
  message,
  error = false
) {

  const element =
    document.getElementById(
      "authMessage"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message || "";

  element.style.color =
    error
      ? "#fca5a5"
      : "#a7f3d0";

}


function setAccountMessage(
  message,
  error = false
) {

  const element =
    document.getElementById(
      "accountMessage"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message || "";

  element.style.color =
    error
      ? "#fca5a5"
      : "#a7f3d0";

}


/* =======================================================
   SUPABASE READY
======================================================= */

function cloudReady() {
  return false;

}


/* =======================================================
   AUTH INITIALIZATION
======================================================= */

async function initFlowwAuth() {

  return;

  if (!supabaseClient) {

    updateAccountButton();

    return;

  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (!error) {

      currentUser =
        data?.session?.user ||
        null;

    }

  } catch (error) {

    console.error(
      "Supabase session error:",
      error
    );

  }

  updateAccountButton();
  renderAuthState();

  if (currentUser) {

    await ensureProfile();
    await loadCloudData();

  }


  supabaseClient.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      currentUser =
        session?.user ||
        null;

      updateAccountButton();
      renderAuthState();

      if (currentUser) {

        await ensureProfile();
        await loadCloudData();

      }

    }
  );

}


/* =======================================================
   ACCOUNT BUTTON
======================================================= */

function updateAccountButton() {

  const label =
    document.getElementById(
      "accountBtnLabel"
    );

  if (!label) {
    return;
  }

  label.textContent =
    currentUser
      ? "Konto"
      : "Log in";

}


/* =======================================================
   AUTH STATE UI
======================================================= */

function renderAuthState() {

  const loggedOut = document.getElementById("authLoggedOut");
  const loggedIn = document.getElementById("authLoggedIn");

  if (!loggedOut || !loggedIn) {
    return;
  }

  if (!currentUser) {
    loggedOut.style.display = "block";
    loggedIn.style.display = "none";
    return;
  }

  loggedOut.style.display = "none";
  loggedIn.style.display = "block";

  const username =
    currentUser.user_metadata?.username ||
    currentUser.user_metadata?.name ||
    currentUser.email?.split("@")[0] ||
    "Cine user";

  const name = document.getElementById("accountName");
  const email = document.getElementById("accountEmail");
  const avatar = document.getElementById("accountAvatar");

  if (name) {
    name.textContent = username;
  }

  if (email) {
    email.textContent = currentUser.email || "";
  }

  if (avatar) {
    avatar.textContent =
      currentUser.user_metadata?.emoji ||
      username.charAt(0).toUpperCase();
  }

  const emojiInput = document.getElementById("accountEmoji");

  if (emojiInput) {
    emojiInput.value = currentUser.user_metadata?.emoji || "";
  }

}

async function updateProfileEmoji() {

  if (!currentUser || !supabaseClient) {
    return;
  }

  const input = document.getElementById("accountEmoji");
  const emoji = input?.value.trim() || "";

  if (emoji && Array.from(emoji).length !== 1) {
    setAccountMessage("Use only one emoji for your profile picture.", true);
    return;
  }

  const { data, error } = await supabaseClient.auth.updateUser({
    data: { emoji }
  });

  if (error) {
    setAccountMessage(error.message, true);
    return;
  }

  currentUser = data.user;
  renderAuthState();
  setAccountMessage("Profile emoji updated.");
}


/* =======================================================
   SIGN UP
======================================================= */

async function signupUser() {

  if (!supabaseClient) {

    setAuthMessage(
      "Cine is not connected to an account service.",
      true
    );

    return;

  }


  const username =
    document
      .getElementById(
        "signupUsername"
      )
      .value
      .trim();

  const emoji =
    document
      .getElementById("signupEmoji")
      ?.value
      .trim() || "";

  const email =
    document
      .getElementById(
        "signupEmail"
      )
      .value
      .trim();

  const password =
    document
      .getElementById(
        "signupPassword"
      )
      .value;


  if (!username) {
    setAuthMessage("Enter a username.", true);
    return;
  }

  if (emoji && Array.from(emoji).length !== 1) {
    setAuthMessage("Use only one emoji for your profile picture.", true);
    return;
  }

  if (!email) {
    setAuthMessage("Enter an email address.", true);
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setAuthMessage("Enter a valid email address.", true);
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", true);
    return;
  }


  setAuthMessage(
    "Creating account…"
  );


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.signUp({

        email,
        password,

        options: {
          data: {
            username,
            emoji
          }
        }

      });


    if (error) {

      setAuthMessage(
        error.message,
        true
      );

      return;

    }


    currentUser =
      data?.user ||
      null;


    if (currentUser) {

      await ensureProfile(
        username
      );

    }


    updateAccountButton();


    if (data?.session) {

      await loadCloudData();

      setAuthMessage(
        "Kontoen er opprettet og du er logget inn."
      );

      renderAuthState();

      if (document.getElementById("landingPage")) {
        redirectToApp();
      }

    } else {

      setAuthMessage(
        `VERIFY YOUR EMAIL\n\nA verification email with a link has been sent to ${email}. Then log in.`
      );

    }

  } catch (error) {

    console.error(error);

    setAuthMessage(
      "Noe gikk galt ved oppretting av konto.",
      true
    );

  }

}


/* =======================================================
   LOGIN
======================================================= */

async function loginUser() {

  if (!supabaseClient) {

    setAuthMessage(
      "Cine is not connected to Supabase yet.",
      true
    );

    return;

  }


  const email =
    document
      .getElementById(
        "loginEmail"
      )
      .value
      .trim();

  const password =
    document
      .getElementById(
        "loginPassword"
      )
      .value;


  if (!email || !password) {

    setAuthMessage(
      "Skriv inn e-post og passord.",
      true
    );

    return;

  }


  setAuthMessage(
    "Logger inn…"
  );


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({

        email,
        password

      });


    if (error) {

      setAuthMessage(
        error.message,
        true
      );

      return;

    }


    currentUser =
      data.user;


    await ensureProfile();
    await loadCloudData();

    updateAccountButton();
    renderAuthState();

    setAuthMessage(
      "Innlogget."
    );

    if (document.getElementById("landingPage")) {
      redirectToApp();
    }

  } catch (error) {

    console.error(error);

    setAuthMessage(
      "Noe gikk galt ved innlogging.",
      true
    );

  }

}


/* =======================================================
   LOGOUT
======================================================= */

async function logoutUser() {

  try {

    if (supabaseClient) {

      await supabaseClient.auth.signOut();

    }

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }


  currentUser = null;


  updateAccountButton();
  renderAuthState();

  setAccountMessage(
    "Logget ut."
  );

  loadTrending();

}


/* =======================================================
   PROFILE
======================================================= */

async function ensureProfile(
  usernameOverride = null
) {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  const username =
    usernameOverride ||
    currentUser.user_metadata?.username ||
    currentUser.email?.split("@")[0] ||
    `floww_${currentUser.id.slice(0, 8)}`;


  const {
    error
  } =
    await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: currentUser.id,
          username,
          updated_at:
            new Date().toISOString()
        },
        {
          onConflict: "id"
        }
      );


  if (error) {

    console.warn(
      "Profile sync:",
      error.message
    );

  }

}


/* =======================================================
   CLOUD SYNC
======================================================= */

async function syncCurrentUser() {

  if (!cloudReady()) {

    setAccountMessage(
      "You must be logged in with Supabase configured.",
      true
    );

    return;

  }


  setAccountMessage(
    "Syncing…"
  );


  try {

    await syncAllToCloud();

    setAccountMessage(
      "Everything is synced with Supabase."
    );

  } catch (error) {

    console.error(error);

    setAccountMessage(
      "Could not sync right now.",
      true
    );

  }

}


/* =======================================================
   SYNC ALL DATA TO SUPABASE
======================================================= */

async function syncAllToCloud() {

  if (
    !cloudReady() ||
    cloudSyncInProgress
  ) {
    return;
  }


  cloudSyncInProgress = true;


  try {

    await ensureProfile();


    const favorites =
      getFavorites();

    const continueWatching =
      getContinue();

    const watched =
      getWatched();


    /* -----------------------------------------------
       FAVORITES
    ----------------------------------------------- */

    const {
      error: favoriteDeleteError
    } =
      await supabaseClient
        .from("favorites")
        .delete()
        .eq(
          "user_id",
          currentUser.id
        );


    if (favoriteDeleteError) {
      throw favoriteDeleteError;
    }


    if (favorites.length) {

      const rows =
        favorites.map(
          item => ({

            user_id:
              currentUser.id,

            media_id:
              String(item.id),

            media_type:
              item.media_type ||
              item.type ||
              "movie",

            title:
              item.title ||
              item.name ||
              "",

            poster_path:
              item.poster_path ||
              item.poster ||
              null,

            backdrop_path:
              item.backdrop_path ||
              item.backdrop ||
              null

          })
        );


      const {
        error
      } =
        await supabaseClient
          .from("favorites")
          .insert(rows);


      if (error) {
        throw error;
      }

    }


    /* -----------------------------------------------
       CONTINUE WATCHING
    ----------------------------------------------- */

    const {
      error:
        continueDeleteError
    } =
      await supabaseClient
        .from("continue_watching")
        .delete()
        .eq(
          "user_id",
          currentUser.id
        );


    if (continueDeleteError) {
      throw continueDeleteError;
    }


    if (continueWatching.length) {

      const rows =
        continueWatching.map(
          item => ({

            user_id:
              currentUser.id,

            media_id:
              String(item.id),

            media_type:
              item.type ||
              "movie",

            title:
              item.title ||
              "",

            poster_path:
              item.poster ||
              null,

            backdrop_path:
              item.backdrop ||
              null,

            season:
              item.season ||
              null,

            episode:
              item.episode ||
              null

          })
        );


      const {
        error
      } =
        await supabaseClient
          .from("continue_watching")
          .insert(rows);


      if (error) {
        throw error;
      }

    }


    /* -----------------------------------------------
       WATCHED EPISODES
    ----------------------------------------------- */

    const {
      error:
        watchedDeleteError
    } =
      await supabaseClient
        .from("watched_episodes")
        .delete()
        .eq(
          "user_id",
          currentUser.id
        );


    if (watchedDeleteError) {
      throw watchedDeleteError;
    }


    const watchedRows = [];


    Object.entries(
      watched
    ).forEach(
      (
        [mediaId, seasons]
      ) => {

        if (
          !seasons ||
          typeof seasons !==
            "object"
        ) {
          return;
        }


        Object.entries(
          seasons
        ).forEach(
          (
            [season, episodes]
          ) => {

            if (
              !/^\d+$/.test(
                season
              )
            ) {
              return;
            }


            if (
              !Array.isArray(
                episodes
              )
            ) {
              return;
            }


            episodes.forEach(
              episode => {

                watchedRows.push({

                  user_id:
                    currentUser.id,

                  media_id:
                    String(mediaId),

                  season:
                    Number(season),

                  episode:
                    Number(episode)

                });

              }
            );

          }
        );

      }
    );


    if (watchedRows.length) {

      const {
        error
      } =
        await supabaseClient
          .from("watched_episodes")
          .insert(
            watchedRows
          );


      if (error) {
        throw error;
      }

    }

  } finally {

    cloudSyncInProgress =
      false;

  }

}


/* =======================================================
   LOAD CLOUD DATA
======================================================= */

async function loadCloudData() {

  if (!cloudReady()) {
    return;
  }


  try {

    const [
      favoritesResult,
      continueResult,
      watchedResult
    ] =
      await Promise.all([

        supabaseClient
          .from("favorites")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false
            }
          ),

        supabaseClient
          .from("continue_watching")
          .select("*")
          .order(
            "updated_at",
            {
              ascending: false
            }
          ),

        supabaseClient
          .from("watched_episodes")
          .select("*")

      ]);


    /* -----------------------------------------------
       FAVORITES
    ----------------------------------------------- */

    if (
      !favoritesResult.error
    ) {

      suppressCloudSync =
        true;


      const favorites =
        (
          favoritesResult.data ||
          []
        ).map(
          item => ({

            id:
              item.media_id,

            media_type:
              item.media_type,

            title:
              item.title,

            name:
              item.title,

            poster_path:
              item.poster_path,

            backdrop_path:
              item.backdrop_path

          })
        );


      suppressCloudSync =
        false;

    }


    /* -----------------------------------------------
       CONTINUE WATCHING
    ----------------------------------------------- */

    if (
      !continueResult.error
    ) {

      suppressCloudSync =
        true;


      const continueWatching =
        (
          continueResult.data ||
          []
        ).map(
          item => ({

            id:
              item.media_id,

            type:
              item.media_type,

            title:
              item.title,

            poster:
              item.poster_path,

            backdrop:
              item.backdrop_path,

            season:
              item.season,

            episode:
              item.episode

          })
        );


      suppressCloudSync =
        false;

    }


    /* -----------------------------------------------
       WATCHED
    ----------------------------------------------- */

    if (
      !watchedResult.error
    ) {

      const watched = {};


      (
        watchedResult.data ||
        []
      ).forEach(
        item => {

          const mediaId =
            String(
              item.media_id
            );

          const season =
            String(
              item.season
            );


          if (!watched[mediaId]) {
            watched[mediaId] = {};
          }


          if (
            !watched[mediaId][season]
          ) {
            watched[mediaId][season] =
              [];
          }


          if (
            !watched[mediaId][season]
              .includes(
                item.episode
              )
          ) {

            watched[mediaId][season]
              .push(
                item.episode
              );

          }

        }
      );


      suppressCloudSync =
        true;


      suppressCloudSync =
        false;

    }

  } catch (error) {

    console.error(
      "Could not load cloud data:",
      error
    );

  }

}


/* =======================================================
   SEARCH HISTORY
======================================================= */

async function recordSearch(
  query
) {

  if (
    !cloudReady() ||
    !query
  ) {
    return;
  }


  try {

    await supabaseClient
      .from("search_history")
      .insert({

        user_id:
          currentUser.id,

        query:
          query

      });

  } catch (error) {

    console.warn(
      "Search history error:",
      error
    );

  }

}


/* =======================================================
   FAVORITES UI
======================================================= */

function updateFavButton() {

  const button =
    document.getElementById(
      "favBtn"
    );

  if (
    !currentItem ||
    !button
  ) {
    return;
  }


  if (
    isFavorite(
      currentItem.id
    )
  ) {

    button.classList.add(
      "active"
    );

    button.innerHTML =
      "❤";

  } else {

    button.classList.remove(
      "active"
    );

    button.innerHTML =
      "♡";

  }

}


function createHeartExplosion() {

  const button =
    document.getElementById(
      "favBtn"
    );

  if (!button) {
    return;
  }


  for (
    let i = 0;
    i < 10;
    i++
  ) {

    const heart =
      document.createElement(
        "div"
      );

    heart.className =
      "heart-pop";

    heart.innerHTML =
      "❤";

    heart.style.left =
      `calc(50% + ${
        Math.random() * 80 - 40
      }px)`;

    heart.style.top =
      `calc(50% + ${
        Math.random() * 30 - 15
      }px)`;


    button.appendChild(
      heart
    );


    setTimeout(
      () => heart.remove(),
      1000
    );

  }

}


function toggleFavorite() {

  if (!currentItem) {
    return;
  }


  let favorites =
    getFavorites();


  const exists =
    favorites.find(
      f =>
        String(f.id) ===
        String(currentItem.id)
    );


  if (exists) {

    favorites =
      favorites.filter(
        f =>
          String(f.id) !==
          String(currentItem.id)
      );

  } else {

    favorites.push({

      id:
        currentItem.id,

      media_type:
        currentItem.type,

      title:
        currentItem.title,

      name:
        currentItem.title,

      poster_path:
        currentItem.poster,

      backdrop_path:
        currentItem.backdrop

    });


    createHeartExplosion();

  }


  saveFavorites(
    favorites
  );

  updateFavButton();

}


/* =======================================================
   SEARCH EVENTS
======================================================= */

const searchInput =
  document.getElementById(
    "search"
  );

if (searchInput) {

  searchInput.addEventListener(
    "keypress",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        search();

      }

    }
  );

}


const searchInput2 =
  document.getElementById(
    "search2"
  );

if (searchInput2) {

  searchInput2.addEventListener(
    "keypress",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        search2();

      }

    }
  );

}


function search2() {

  const input =
    document.getElementById(
      "search2"
    );

  if (!input) {
    return;
  }


  const query =
    input.value.trim();


  if (!query) {
    return;
  }


  const firstSearch =
    document.getElementById(
      "search"
    );

  if (firstSearch) {
    firstSearch.value =
      query;
  }


  showPage(
    "browsePage"
  );

  searchQuery(
    query
  );

}


/* =======================================================
   LOADER
======================================================= */

function showLoader() {

  const loader =
    document.getElementById(
      "spinnerOverlay"
    );

  if (loader) {
    loader.classList.add(
      "active"
    );
  }

}


function hideLoader() {

  const loader =
    document.getElementById(
      "spinnerOverlay"
    );

  if (loader) {
    loader.classList.remove(
      "active"
    );
  }

}


/* =======================================================
   PAGES
======================================================= */

function stopPlayer() {
  const playerFrame = document.getElementById("playerFrame");
  if (!playerFrame) return;

  const iframe = playerFrame.querySelector("iframe");
  if (iframe) {
    iframe.src = "";
    iframe.remove();
  }

  playerFrame.innerHTML = "";
  playerUrl = "";
}

function showPage(id) {

  const currentPage = document.querySelector(".page.active")?.id;
  if (currentPage === "playerPage" && id !== "playerPage") {
    stopPlayer();
  }

  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      page =>
        page.classList.remove(
          "active"
        )
    );


  const page =
    document.getElementById(
      id
    );

  if (page) {
    page.classList.add(
      "active"
    );
  }


  window.scrollTo(
    0,
    0
  );

}


/* =======================================================
   MENU
======================================================= */

function toggleMenu() {

  if (
    document.body.classList.contains(
      "terms-declined"
    )
  ) {

    openSettings();

    return;

  }


  menuOpen =
    !menuOpen;


  const menu =
    document.getElementById(
      "menu"
    );

  const overlay =
    document.getElementById(
      "overlay"
    );


  if (menu) {

    menu.style.left =
      menuOpen
        ? "0px"
        : "-320px";

  }


  if (overlay) {

    overlay.style.display =
      menuOpen
        ? "block"
        : "none";

  }

}


function closeMenu() {

  menuOpen =
    false;


  const menu =
    document.getElementById(
      "menu"
    );

  const overlay =
    document.getElementById(
      "overlay"
    );


  if (menu) {
    menu.style.left =
      "-320px";
  }


  if (overlay) {
    overlay.style.display =
      "none";
  }

}


/* =======================================================
   NAVIGATION
======================================================= */

const categoryOptions = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" }
];

function buildCategoryMenu(activeName = "Action") {
  const buttons = categoryOptions.map(genre => {
    const isActive = genre.name === activeName ? "active" : "";
    return `
      <button
        class="category-btn ${isActive}"
        data-genre-id="${genre.id}"
        data-genre-name="${genre.name}"
        onclick="loadCategory(${genre.id}, '${escapeAttr(genre.name)}')"
      >
        ${genre.name}
      </button>
    `;
  }).join("");

  return `
    <div class="section-title">Categories</div>
    <div class="category-row">
      ${buttons}
    </div>
  `;
}

async function loadCategory(genreId, genreName, reset = true) {
  const content = document.getElementById("content");
  if (!content || categoryLoading) return;

  activeCategoryId = genreId;
  activeCategoryName = genreName;

  if (reset) {
    categoryPage = 1;
    content.innerHTML = `
      ${buildCategoryMenu(genreName)}
      <div id="categoryGrid" class="row"></div>
      <div id="categoryStatus" class="infinite-status">Loading more picks...</div>
    `;
  }

  const grid = document.getElementById("categoryGrid");
  const status = document.getElementById("categoryStatus");
  if (!grid || !status) return;

  showLoader();
  categoryLoading = true;

  try {
    const [movieResponse, seriesResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${categoryPage}&sort_by=popularity.desc${langParam()}`),
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&page=${categoryPage}&sort_by=popularity.desc${langParam()}`)
    ]);

    if (!movieResponse.ok || !seriesResponse.ok) {
      throw new Error("Category request failed");
    }

    const [movieData, seriesData] = await Promise.all([
      movieResponse.json(),
      seriesResponse.json()
    ]);

    const items = [
      ...(movieData.results || []).map(item => ({ ...item, media_type: "movie" })),
      ...(seriesData.results || []).map(item => ({ ...item, media_type: "tv" }))
    ].filter(item => item.poster_path && (item.title || item.name));

    if (!items.length) {
      status.textContent = "No titles found in this category.";
      return;
    }

    const merged = items
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildGrid(merged, "");
    const row = wrapper.querySelector(".row");

    if (row) {
      if (reset) {
        grid.innerHTML = row.innerHTML;
      } else {
        grid.insertAdjacentHTML("beforeend", row.innerHTML);
      }
    }

    categoryPage += 1;
    status.textContent = "Keep scrolling for more";

  } catch (error) {
    console.error("Category error:", error);
    status.textContent = "Could not load this category right now.";

  } finally {
    hideLoader();
    categoryLoading = false;
  }
}

function nav(type) {

  closeMenu();

  document.querySelectorAll("[data-sidebar-nav]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarNav === type);
  });

  showPage(
    "browsePage"
  );


  if (
    type ===
    "trending"
  ) {

    loadTrending();

  } else if (
    type ===
    "movies"
  ) {

    loadMovies();

  } else if (
    type ===
    "series"
  ) {

    loadSeries();

  } else if (
    type ===
    "categories"
  ) {

    loadCategory(activeCategoryId, activeCategoryName, true);

  } else if (
    type ===
    "continue"
  ) {

    showContinue();

  } else if (
    type ===
    "infinite"
  ) {

    showInfinite();

  } else if (
    type ===
    "fav"
  ) {

    showFav();

  }

}

function enterBrowse() {

  if (
    document.getElementById("landingPage") &&
    !document.getElementById("browsePage")
  ) {

    redirectToApp();
    return;
  }

  nav("trending");
}

function focusSearch() {
  const input = document.querySelector(".page.active .search-wrap input");
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function redirectToApp() {
  window.location.href = "index.html";
}


/* =======================================================
   LANGUAGE
======================================================= */

function getLang() {
  return "en";

}


const LANG = {

  no: {

    home:
      "Hjem",

    movies:
      "Filmer",

    series:
      "Serier",

    favorites:
      "Favoritter",

    settings:
      "Innstillinger",

    search:
      "Søk filmer og serier…",

    searchBtn:
      "Søk",

    trending:
      "Trender akkurat nå",

    popularMovies:
      "Populære filmer",

    popularSeries:
      "Populære serier",

    favTitle:
      "Favoritter",

    noFav:
      "Ingen favoritter lagret ennå.",

    noResults:
      "Ingen resultater funnet.",

    continueWatching:
      "Fortsett å se",

    back:
      "← Tilbake",

    playMovie:
      "▶ Spill av film",

    playEp:
      "▶ Spill av episode",

    season:
      "Sesong",

    episode:
      "Episode",

    loading:
      "Laster…",

    lightTheme:
      "Lyst tema",

    lightSub:
      "Bytt mellom mørkt og lyst",

    language:
      "Språk",

    langSub:
      "Titler og beskrivelser",

    deleteData:
      "🗑 Slett all data",

    close:
      "Lukk",

    confirmDelete:
      "Er du sikker? All data slettes.",

    film:
      "Film",

    serie:
      "Serie",

    nextEp:
      "Neste episode",

    playNow:
      "▶ Spill nå",

    cancelBtn:
      "Avbryt",

    version:
      "Versjon",

    terms:
      "Vilkår"

  },


  en: {

    home:
      "Home",

    movies:
      "Movies",

    series:
      "Series",

    favorites:
      "Favorites",

    settings:
      "Settings",

    search:
      "Search movies and series…",

    searchBtn:
      "Search",

    trending:
      "Trending now",

    popularMovies:
      "Popular movies",

    popularSeries:
      "Popular series",

    favTitle:
      "Favorites",

    noFav:
      "No favorites saved yet.",

    noResults:
      "No results found.",

    continueWatching:
      "Continue watching",

    back:
      "← Back",

    playMovie:
      "▶ Play movie",

    playEp:
      "▶ Play episode",

    season:
      "Season",

    episode:
      "Episode",

    loading:
      "Loading…",

    lightTheme:
      "Light theme",

    lightSub:
      "Switch between dark and light",

    language:
      "Language",

    langSub:
      "Titles and descriptions",

    deleteData:
      "🗑 Delete all data",

    close:
      "Close",

    confirmDelete:
      "Are you sure? All data will be deleted.",

    film:
      "Movie",

    serie:
      "Series",

    nextEp:
      "Next episode",

    playNow:
      "▶ Play now",

    cancelBtn:
      "Cancel",

    version:
      "Version",

    terms:
      "Terms"

  },


  es: {

    home:
      "Inicio",

    movies:
      "Películas",

    series:
      "Series",

    favorites:
      "Favoritos",

    settings:
      "Ajustes",

    search:
      "Buscar películas y series…",

    searchBtn:
      "Buscar",

    trending:
      "Tendencias ahora",

    popularMovies:
      "Películas populares",

    popularSeries:
      "Series populares",

    favTitle:
      "Favoritos",

    noFav:
      "No hay favoritos guardados.",

    noResults:
      "No se encontraron resultados.",

    continueWatching:
      "Continuar viendo",

    back:
      "← Volver",

    playMovie:
      "▶ Ver película",

    playEp:
      "▶ Ver episodio",

    season:
      "Temporada",

    episode:
      "Episodio",

    loading:
      "Cargando…",

    lightTheme:
      "Tema claro",

    lightSub:
      "Cambiar entre oscuro y claro",

    language:
      "Idioma",

    langSub:
      "Títulos y descripciones",

    deleteData:
      "🗑 Borrar todos los datos",

    close:
      "Cerrar",

    confirmDelete:
      "¿Estás seguro? Se borrarán todos los datos.",

    film:
      "Película",

    serie:
      "Serie",

    nextEp:
      "Siguiente episodio",

    playNow:
      "▶ Ver ahora",

    cancelBtn:
      "Cancelar",

    version:
      "Versión",

    terms:
      "Términos"

  },


  de: {

    home:
      "Startseite",

    movies:
      "Filme",

    series:
      "Serien",

    favorites:
      "Favoriten",

    settings:
      "Einstellungen",

    search:
      "Filme und Serien suchen…",

    searchBtn:
      "Suchen",

    trending:
      "Aktuell im Trend",

    popularMovies:
      "Beliebte Filme",

    popularSeries:
      "Beliebte Serien",

    favTitle:
      "Favoriten",

    noFav:
      "Keine Favoriten gespeichert.",

    noResults:
      "Keine Ergebnisse gefunden.",

    continueWatching:
      "Weiterschauen",

    back:
      "← Zurück",

    playMovie:
      "▶ Film abspielen",

    playEp:
      "▶ Episode abspielen",

    season:
      "Staffel",

    episode:
      "Episode",

    loading:
      "Lädt…",

    lightTheme:
      "Helles Design",

    lightSub:
      "Zwischen hell und dunkel wechseln",

    language:
      "Sprache",

    langSub:
      "Titel und Beschreibungen",

    deleteData:
      "🗑 Alle Daten löschen",

    close:
      "Schließen",

    confirmDelete:
      "Bist du sicher? Alle Daten werden gelöscht.",

    film:
      "Film",

    serie:
      "Serie",

    nextEp:
      "Nächste Episode",

    playNow:
      "▶ Jetzt abspielen",

    cancelBtn:
      "Abbrechen",

    version:
      "Version",

    terms:
      "Nutzungsbedingungen"

  },


  fr: {

    home:
      "Accueil",

    movies:
      "Films",

    series:
      "Séries",

    favorites:
      "Favoris",

    settings:
      "Paramètres",

    search:
      "Rechercher films et séries…",

    searchBtn:
      "Rechercher",

    trending:
      "Tendances du moment",

    popularMovies:
      "Films populaires",

    popularSeries:
      "Séries populaires",

    favTitle:
      "Favoris",

    noFav:
      "Aucun favori enregistré.",

    noResults:
      "Aucun résultat trouvé.",

    continueWatching:
      "Continuer à regarder",

    back:
      "← Retour",

    playMovie:
      "▶ Regarder le film",

    playEp:
      "▶ Regarder l'épisode",

    season:
      "Saison",

    episode:
      "Épisode",

    loading:
      "Chargement…",

    lightTheme:
      "Thème clair",

    lightSub:
      "Basculer entre sombre et clair",

    language:
      "Langue",

    langSub:
      "Titres et descriptions",

    deleteData:
      "🗑 Supprimer toutes les données",

    close:
      "Fermer",

    confirmDelete:
      "Êtes-vous sûr ? Toutes les données seront supprimées.",

    film:
      "Film",

    serie:
      "Série",

    nextEp:
      "Épisode suivant",

    playNow:
      "▶ Lire maintenant",

    cancelBtn:
      "Annuler",

    version:
      "Version",

    terms:
      "Conditions"

  }

};


function t(key) {

  const lang =
    getLang();


  return (
    LANG[lang]?.[key] ||
    LANG.en[key] ||
    key
  );

}


function applyLang() {

  const menuButtons =
    document.querySelectorAll(
      "#menu button"
    );


  if (menuButtons[0]) {
    menuButtons[0].querySelector("span").textContent = t("home");
  }

  if (menuButtons[1]) {
    menuButtons[1].querySelector("span").textContent = t("movies");
  }

  if (menuButtons[2]) {
    menuButtons[2].querySelector("span").textContent = t("series");
  }

  if (menuButtons[3]) {
    menuButtons[3].querySelector("span").textContent = "Categories";
  }


  document
    .querySelectorAll(
      ".search-wrap input"
    )
    .forEach(
      input =>
        input.placeholder =
          t("search")
    );

  document
    .querySelectorAll(
      ".search-wrap button"
    )
    .forEach(
      button => {
        button.innerHTML = `<i data-lucide="search"></i>`;
        button.title = t("searchBtn");
      }
    );

  window.lucide?.createIcons();


  const backButton =
    document.getElementById(
      "backBtn"
    );

  if (backButton) {
    backButton.textContent =
      t("back");
  }


  const moviePlayButton =
    document.getElementById(
      "moviePlayBtn"
    );

  if (moviePlayButton) {
    moviePlayButton.textContent =
      t("playMovie");
  }


  const tvPlayButton =
    document.getElementById(
      "tvPlayBtn"
    );

  if (tvPlayButton) {
    tvPlayButton.textContent =
      t("playEp");
  }


  const pickerLabels =
    document.querySelectorAll(
      ".picker-section-label"
    );


  if (pickerLabels[0]) {
    pickerLabels[0].textContent =
      t("season");
  }

  if (pickerLabels[1]) {
    pickerLabels[1].textContent =
      t("episode");
  }


  const settingsTitle =
    document.querySelector(
      ".settings-title"
    );

  if (settingsTitle) {
    settingsTitle.textContent =
      t("settings");
  }


  const settingsRows =
    document.querySelectorAll(
      ".settings-row"
    );


  if (settingsRows[0]) {

    settingsRows[0]
      .querySelector(
        ".settings-label"
      )
      .textContent =
      t("language");

    settingsRows[0]
      .querySelector(
        ".settings-sub"
      )
      .textContent =
      t("langSub");

  }


  const closeButton =
    document.querySelector(
      ".settings-close"
    );

  if (closeButton) {
    closeButton.textContent =
      t("close");
  }


  const autoplayLabel =
    document.querySelector(
      ".autoplay-label"
    );

  if (autoplayLabel) {
    autoplayLabel.textContent =
      t("nextEp");
  }


  const autoplayPlay =
    document.querySelector(
      ".autoplay-play-btn"
    );

  if (autoplayPlay) {
    autoplayPlay.textContent =
      t("playNow");
  }


  const autoplayCancel =
    document.querySelector(
      ".autoplay-cancel-btn"
    );

  if (autoplayCancel) {
    autoplayCancel.textContent =
      t("cancelBtn");
  }


  const version =
    document.getElementById(
      "settingsVersionLabel"
    );

  if (version) {
    version.textContent =
      `${t("version")} ${gaysjorn}`;
  }


  const terms =
    document.getElementById(
      "termsLabel"
    );

  if (terms) {
    terms.textContent =
      t("terms");
  }

}


function setLanguage(lang) {
  sessionLang = "en";

  applyLang();

  loadTrending();

}


function langParam() {

  return `&language=${getLang()}`;

}


/* =======================================================
   TMDB
======================================================= */

async function loadTrending() {

  showLoader();

  try {

    const response =
      await fetch(
        `https://api.themoviedb.org/3/trending/all/day?api_key=${API_KEY}${langParam()}`
      );

    const data =
      await response.json();

    renderWithContinue(
      data.results || [],
      t("trending")
    );

  } catch (error) {

    console.error(
      "Trending error:",
      error
    );

  } finally {

    hideLoader();

  }

}

async function loadLandingTrending() {

  const content =
    document.getElementById("landingTrendingContent");

  if (!content) {
    return;
  }

  try {
    const [movieResponse, seriesResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}${langParam()}`),
      fetch(`https://api.themoviedb.org/3/trending/tv/day?api_key=${API_KEY}${langParam()}`)
    ]);
    const movieData = await movieResponse.json();
    const seriesData = await seriesResponse.json();
    const movies = (movieData.results || []).slice(0, 6).map(item => ({ ...item, media_type: "movie" }));
    const series = (seriesData.results || []).slice(0, 6).map(item => ({ ...item, media_type: "tv" }));

    content.innerHTML = buildLandingMarquee(
      movies.flatMap((movie, index) => [movie, series[index]]).filter(Boolean)
    );

    await waitForLandingImages(content);
  } catch (error) {
    console.error("Landing trending error:", error);
  }
}

async function waitForLandingImages(container) {

  const images = [...container.querySelectorAll("img")];

  await Promise.all(
    images.map(image => {
      image.loading = "eager";

      if (image.complete) {
        return image.decode
          ? image.decode().catch(() => {})
          : Promise.resolve();
      }

      return new Promise(resolve => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })
  );
}

function buildLandingMarquee(items) {

  const valid = items.filter(item =>
    item.poster_path && (item.title || item.name)
  );

  if (!valid.length) {
    return "";
  }

  const cards = valid.map(item => {
    const name = item.title || item.name;
    const type = item.media_type;

    return `
      <article class="card landing-card" tabindex="0" onclick="landingCardAction()" onkeydown="if(event.key === 'Enter') landingCardAction()">
        <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" alt="${escapeAttr(name)}" loading="lazy">
        <div class="card-info">
          <h3>${escapeHtml(name)}</h3>
          <span class="badge ${type}">${type === "tv" ? "Series" : "Movie"}</span>
        </div>
      </article>
    `;
  }).join("");

  return `<div class="landing-marquee-viewport"><div class="landing-marquee-track">${cards}${cards}</div></div>`;
}

function buildLandingRow(title, items) {

  const valid = items.filter(item =>
    item.poster_path && (item.title || item.name)
  );

  if (!valid.length) {
    return "";
  }

  return `
    <div class="landing-row-title">${title}</div>
    <div class="landing-card-row">
      ${valid.map(item => {
        const name = item.title || item.name;
        const type = item.media_type;
        return `
          <article class="card landing-card" tabindex="0" onclick="landingCardAction()" onkeydown="if(event.key === 'Enter') landingCardAction()">
            <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" alt="${escapeAttr(name)}" loading="eager">
            <div class="card-info">
              <h3>${escapeHtml(name)}</h3>
              <span class="badge ${type}">${type === "tv" ? "Series" : "Movie"}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function landingCardAction() {
  enterBrowse();
}


async function loadMovies() {

  showLoader();

  try {

    const response =
      await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}${langParam()}`
      );

    if (!response.ok) {
      throw new Error(`Movies request failed (${response.status})`);
    }

    const data =
      await response.json();

    render(
      data.results || [],
      t("popularMovies")
    );

  } catch (error) {

    console.error(
      "Movies error:",
      error
    );
    document.getElementById("content").innerHTML = `<div class="empty"><span>!</span>Movies could not be loaded right now.</div>`;

  } finally {

    hideLoader();

  }

}


async function loadSeries() {

  showLoader();

  try {

    const response =
      await fetch(
        `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}${langParam()}`
      );

    if (!response.ok) {
      throw new Error(`Series request failed (${response.status})`);
    }

    const data =
      await response.json();

    render(
      data.results || [],
      t("popularSeries")
    );

  } catch (error) {

    console.error(
      "Series error:",
      error
    );
    document.getElementById("content").innerHTML = `<div class="empty"><span>!</span>Series could not be loaded right now.</div>`;

  } finally {

    hideLoader();

  }

}


async function search() {

  const input =
    document.getElementById(
      "search"
    );

  if (!input) {
    return;
  }


  const query =
    input.value.trim();


  if (!query) {
    return;
  }


  await searchQuery(
    query
  );

}


async function searchQuery(
  query
) {

  showLoader();


  try {

    const response =
      await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}${langParam()}`
      );

    const data =
      await response.json();


    render(
      data.results || [],
      `Resultater for "${escapeHtml(query)}"`
    );

  } catch (error) {

    console.error(
      "Search error:",
      error
    );

  } finally {

    hideLoader();

  }

}


/* =======================================================
   CONTINUE WATCHING UI
======================================================= */

function buildFeaturedHero(item) {
  if (!item || (!item.backdrop_path && !item.poster_path)) return "";

  const type = item.media_type || (item.name ? "tv" : "movie");
  const title = item.title || item.name || "Featured title";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const rating = Number(item.vote_average || 0).toFixed(1);
  const image = item.backdrop_path || item.poster_path;
  const overview = item.overview || "Discover your next favorite movie or series on Cine.";
  const open = `openDetail('${escapeAttr(item.id)}','${escapeAttr(type)}')`;

  return `
    <section class="featured-hero" style="--featured-image:url('https://image.tmdb.org/t/p/original${image}')" aria-label="Featured title">
      <div class="featured-hero-content">
        <h2>${escapeHtml(title)}</h2>
        <div class="featured-meta">
          ${year ? `<span>${escapeHtml(year)}</span><b>•</b>` : ""}
          <span>${type === "tv" ? "Series" : "Movie"}</span>
          <b>•</b><span class="featured-rating">★</span><span>${rating}</span>
        </div>
        <p>${escapeHtml(overview)}</p>
        <div class="featured-actions">
          <button class="featured-watch" onclick="${open}"><span>▶</span> Watch Now</button>
        </div>
      </div>
    </section>
  `;
}

function renderWithContinue(
  items,
  title
) {

  const content =
    document.getElementById(
      "content"
    );

  if (!content) {
    return;
  }


  const continueList =
    getContinue();


  let html = buildFeaturedHero(items[0]);


  if (continueList.length) {

    html +=
      `<div class="section-title">${t("continueWatching")}</div>`;

    html +=
      `<div class="continue-row" id="continueRow">`;


    continueList.forEach(
      item => {

        const image =
          item.backdrop
            ? `https://image.tmdb.org/t/p/w500${item.backdrop}`
            : (
              item.poster
                ? `https://image.tmdb.org/t/p/w300${item.poster}`
                : ""
            );


        const subtitle =
          item.type === "tv"
            ? `S${item.season} E${item.episode}`
            : t("film");


        const openFunction =
          `openDetail('${escapeAttr(item.id)}','${escapeAttr(item.type)}')`;


        const removeFunction =
          `removeFromContinueAndRender('${escapeAttr(item.id)}','${escapeAttr(item.type)}')`;


        html += `

          <div
            class="continue-card"
            tabindex="0"
            onclick="${openFunction}"
            onkeydown="if(event.key==='Enter')${openFunction}"
          >

            ${
              image
                ? `<img
                    src="${image}"
                    alt="${escapeAttr(item.title)}"
                    loading="lazy"
                  >`
                : `<div
                    style="
                      height:120px;
                      background:#222
                    "
                  ></div>`
            }

            <div class="continue-play-icon">
              ▶
            </div>

            <button
              class="continue-remove"
              onclick="event.stopPropagation();${removeFunction}"
              title="Fjern"
            >
              ✕
            </button>

            <div class="continue-card-info">

              <h3>
                ${escapeHtml(item.title)}
              </h3>

              <div class="sub">
                ${subtitle}
              </div>

            </div>

          </div>

        `;

      }
    );


    html +=
      `</div>`;

  }


  content.innerHTML =
    html;

  const dummy =
    document.createElement(
      "div"
    );


  dummy.innerHTML = buildGrid(items.slice(0, 10), "Top 10 This Week");


  while (
    dummy.firstChild
  ) {

    content.appendChild(
      dummy.firstChild
    );

  }

  setupFeaturedCarousel(items);

}

function setupFeaturedCarousel(items) {
  if (featuredCarouselTimer) {
    clearInterval(featuredCarouselTimer);
    featuredCarouselTimer = null;
  }

  const featuredItems = (items || []).filter(item => item.backdrop_path || item.poster_path).slice(0, 10);
  if (featuredItems.length < 2) return;

  let index = 0;
  featuredCarouselTimer = setInterval(() => {
    const hero = document.querySelector(".featured-hero");
    if (!hero) return;
    index = (index + 1) % featuredItems.length;
    hero.classList.add("featured-hero-changing");
    window.setTimeout(() => {
      const currentHero = document.querySelector(".featured-hero");
      if (currentHero) currentHero.outerHTML = buildFeaturedHero(featuredItems[index]);
    }, 220);
  }, 6500);
}

async function loadInfiniteSection(reset = false) {
  const grid = document.getElementById("infiniteGrid");
  const status = document.getElementById("infiniteStatus");
  if (!grid || infiniteLoading) return;
  if (reset) {
    infinitePage = 1;
    grid.innerHTML = "";
  }
  infiniteLoading = true;
  if (status) status.textContent = "Loading more picks...";
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${API_KEY}&page=${infinitePage}${langParam()}`);
    const data = await response.json();
    const temp = document.createElement("div");
    temp.innerHTML = buildGrid(data.results || []);
    const row = temp.querySelector(".row");
    if (row) grid.append(...row.children);
    infinitePage += 1;
    if (status) status.textContent = "Keep scrolling for more";
  } catch (error) {
    if (status) status.textContent = "Could not load more right now.";
    console.warn("Infinite discovery error:", error);
  } finally {
    infiniteLoading = false;
  }
}

function showInfinite() {
  const content = document.getElementById("content");
  if (!content) return;
  content.innerHTML = `<section class="infinite-section standalone-infinite" aria-label="Infinite discovery">
    <div class="infinite-intro"><div class="section-kicker">ENDLESS DISCOVERY</div><div class="section-title">Infinite</div><p>New movies and series, one page at a time.</p></div>
    <div id="infiniteGrid" class="row"></div>
    <div id="infiniteStatus" class="infinite-status">Loading more picks...</div>
  </section>`;
  loadInfiniteSection(true);
}


function removeFromContinueAndRender(
  id,
  type
) {

  removeFromContinue(
    id,
    type
  );

  const currentPage = document.querySelector(".page.active")?.id;
  if (currentPage === "browsePage") {
    const activeNav = document.querySelector("[data-sidebar-nav].active")?.dataset.sidebarNav;
    if (activeNav === "continue") {
      showContinue();
      return;
    }
  }

  loadTrending();

}


function buildContinueWatchingCards(items) {
  if (!items.length) {
    return `
      <div class="empty">
        <span>▶</span>
        No titles in your continue watching list yet.
      </div>
    `;
  }

  return `
    <div class="section-title">${t("continueWatching")}</div>
    <div class="continue-row" id="continueRow">
      ${items.map(item => {
        const image = item.backdrop
          ? `https://image.tmdb.org/t/p/w500${item.backdrop}`
          : (item.poster ? `https://image.tmdb.org/t/p/w300${item.poster}` : "");

        const subtitle = item.type === "tv"
          ? `S${item.season} E${item.episode}`
          : t("film");

        const openFunction = `openDetail('${escapeAttr(item.id)}','${escapeAttr(item.type)}')`;
        const removeFunction = `removeFromContinueAndRender('${escapeAttr(item.id)}','${escapeAttr(item.type)}')`;

        return `
          <div
            class="continue-card"
            tabindex="0"
            onclick="${openFunction}"
            onkeydown="if(event.key==='Enter')${openFunction}"
          >
            ${image ? `<img src="${image}" alt="${escapeAttr(item.title)}" loading="lazy">` : `<div style="height:120px;background:#222"></div>`}
            <div class="continue-play-icon">▶</div>
            <button class="continue-remove" onclick="event.stopPropagation();${removeFunction}" title="Fjern">✕</button>
            <div class="continue-card-info">
              <h3>${escapeHtml(item.title)}</h3>
              <div class="sub">${subtitle}</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function showContinue() {
  const content = document.getElementById("content");
  if (!content) return;

  const items = getContinue();
  content.innerHTML = buildContinueWatchingCards(items);
}


/* =======================================================
   GRID
======================================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttr(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /'/g,
      "&#39;"
    )
    .replace(
      /"/g,
      "&quot;"
    );

}


function buildGrid(
  items,
  title = ""
) {

  const valid =
    (items || [])
      .filter(
        item =>
          item.poster_path &&
          (
            item.title ||
            item.name
          )
      );


  if (!valid.length) {

    return `
      <div class="empty">
        <span>🎬</span>
        ${t("noResults")}
      </div>
    `;

  }


  const typeLabel =
    item => {

      const type =
        item.media_type ||
        (
          item.name
            ? "tv"
            : "movie"
        );


      return type === "tv"
        ? t("serie")
        : t("film");

    };


  const typeKey =
    item =>
      item.media_type ||
      (
        item.name
          ? "tv"
          : "movie"
      );

  const isTopTen = title === "Top 10 This Week";


  return `

    ${
      title
        ? `<div class="section-title">
             <span class="${title === "Top 10 This Week" ? "top10-title" : ""}">${title}</span>
           </div>`
        : ""
    }

    <div class="row${isTopTen ? " top-ten-row" : ""}">

      ${
        valid
          .map(
            (item, index) => {

              const type =
                typeKey(item);

              const name =
                item.title ||
                item.name ||
                "Ukjent";


              return `

                <div
                  class="card"
                  tabindex="0"
                  onclick="openDetail('${escapeAttr(item.id)}','${escapeAttr(type)}')"
                  onkeydown="
                    if(
                      event.key==='Enter' ||
                      event.key===' '
                    )
                    openDetail(
                      '${escapeAttr(item.id)}',
                      '${escapeAttr(type)}'
                    )
                  "
                >

                  <img
                    src="https://image.tmdb.org/t/p/w300${item.poster_path}"
                    alt="${escapeAttr(name)}"
                    loading="lazy"
                  >

                  <div class="card-info">

                    <h3>
                      ${escapeHtml(name)}
                    </h3>

                    <span
                      class="badge ${type}"
                    >
                      ${typeLabel(item)}
                    </span>
                    ${isTopTen ? `<span class="badge rank-badge">#${index + 1}</span>` : ""}
                    ${item.adult ? `<span class="badge age-badge">18+</span>` : ""}

                  </div>

                </div>

              `;

            }
          )
          .join("")
      }

    </div>

  `;

}


function render(
  items,
  title = ""
) {

  const content =
    document.getElementById(
      "content"
    );

  if (!content) {
    return;
  }


  content.innerHTML =
    buildGrid(
      items,
      title
    );

}


/* =======================================================
   DETAIL PAGE
======================================================= */

async function openDetail(
  id,
  type
) {

  prevPage =
    "browsePage";


  showPage(
    "detailPage"
  );

  showLoader();


  document.getElementById(
    "moviePlayBtn"
  ).style.display =
    "none";


  document.getElementById(
    "tvPickerDetail"
  ).style.display =
    "none";


  document.getElementById(
    "tvPlayBtn"
  ).style.display =
    "none";


  document.getElementById(
    "detailOverview"
  ).textContent =
    t("loading");


  document.getElementById(
    "detailTitle"
  ).textContent =
    "";


  document.getElementById(
    "detailTagline"
  ).textContent =
    "";


  document.getElementById(
    "detailBadges"
  ).innerHTML =
    "";


  document.getElementById(
    "detailBackdrop"
  ).src =
    "";


  document.getElementById(
    "detailPoster"
  ).src =
    "";


  const endpoint =
    type === "tv"

      ? `https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}${langParam()}`

      : `https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}${langParam()}`;


  try {

    const response =
      await fetch(
        endpoint
      );


    const data =
      await response.json();


    const title =
      data.title ||
      data.name ||
      "Ukjent";


    const year =
      (
        data.release_date ||
        data.first_air_date ||
        ""
      ).slice(
        0,
        4
      );


    const rating =
      data.vote_average
        ? data.vote_average.toFixed(1)
        : null;

    const ageRating =
      await fetchAgeRating(id, type);

    currentAgeRating = ageRating;


    const tagline =
      data.tagline ||
      "";


    const overview =
      data.overview ||
      "";


    const poster =
      data.poster_path
        ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
        : "";


    const backdrop =
      data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : "";


    currentItem = {

      id,
      type,
      title,

      poster:
        data.poster_path,

      backdrop:
        data.backdrop_path

    };


    document.getElementById(
      "detailTitle"
    ).textContent =
      title;


    document.getElementById(
      "detailTagline"
    ).textContent =
      tagline;


    document.getElementById(
      "detailOverview"
    ).textContent =
      overview;


    document.getElementById(
      "detailPoster"
    ).src =
      poster;


    document.getElementById(
      "detailPoster"
    ).alt =
      title;


    if (backdrop) {

      document.getElementById(
        "detailBackdrop"
      ).src =
        backdrop;

    }


    const badgeClass =
      type === "tv"
        ? "type-tv"
        : "type-movie";


    let badges =
      `<span class="detail-badge ${badgeClass}">
        ${
          type === "tv"
            ? t("serie")
            : t("film")
        }
      </span>`;

    badges +=
      `<span class="detail-badge age age-${ageRating.replace("+", "")}">
        ${ageRating}
      </span>`;


    if (year) {

      badges +=
        `<span class="detail-badge year">
          ${year}
        </span>`;

    }


    if (rating) {

      badges +=
        `<span class="detail-badge rating">
          ⭐ ${rating}
        </span>`;

    }


    document.getElementById(
      "detailBadges"
    ).innerHTML =
      badges;


    updateFavButton();


    if (
      type === "movie"
    ) {

      document.getElementById(
        "moviePlayBtn"
      ).style.display =
        "inline-flex";

    } else {

      document.getElementById(
        "tvPickerDetail"
      ).style.display =
        "";


      document.getElementById(
        "tvPlayBtn"
      ).style.display =
        "inline-flex";


      currentSeason =
        1;

      currentEpisode =
        1;


      const seasons =
        (
          data.seasons ||
          []
        )
        .filter(
          season =>
            season.season_number >
            0
        )
        .length ||
        5;


      buildSeasonBtns(
        id,
        seasons
      );


      await fetchAndBuildEpisodes(
        id,
        1
      );

    }

  } catch (error) {

    console.error(
      "Detail error:",
      error
    );

    document.getElementById(
      "detailOverview"
    ).textContent =
      "Could not load information.";

  } finally {

    hideLoader();

  }

}

async function fetchAgeRating(id, type) {

  const endpoint = type === "tv"
    ? `https://api.themoviedb.org/3/tv/${id}/content_ratings?api_key=${API_KEY}`
    : `https://api.themoviedb.org/3/movie/${id}/release_dates?api_key=${API_KEY}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (type === "tv") {
      const rating = data.results?.find(item => item.iso_3166_1 === "US")?.rating;
      return mapAgeRating(rating);
    }

    const dates = data.results?.find(item => item.iso_3166_1 === "US")?.release_dates || [];
    return mapAgeRating(dates.find(item => item.certification)?.certification);
  } catch (error) {
    console.warn("Age rating error:", error);
    return "NR";
  }
}

function mapAgeRating(certification) {

  const value = String(certification || "").toUpperCase();

  if (["18", "18+", "NC-17", "R", "TV-MA"].includes(value)) return "18+";
  if (["16", "16+", "TV-14"].includes(value)) return "16+";
  if (["PG-13", "TV-PG"].includes(value)) return "12+";
  if (["PG", "TV-G", "TV-Y7", "TV-Y7-FV"].includes(value)) return "7+";
  if (["G", "TV-Y"].includes(value)) return "0+";
  return "NR";
}


/* =======================================================
   SEASONS
======================================================= */

function buildSeasonBtns(
  tvId,
  count
) {

  const wrapper =
    document.getElementById(
      "seasonBtns"
    );


  if (!wrapper) {
    return;
  }


  wrapper.innerHTML =
    "";


  const watched =
    getWatched();


  const key =
    String(tvId);


  for (
    let season = 1;
    season <= count;
    season++
  ) {

    const button =
      document.createElement(
        "button"
      );


    const total =
      watched[key] &&
      watched[key][
        `_total_${season}`
      ];


    const allWatched =
      total
        ? hasWatchedWholeSeason(
            tvId,
            season,
            total
          )
        : false;


    let className =
      "picker-btn";


    if (
      season === 1
    ) {
      className +=
        " selected";
    }


    if (allWatched) {
      className +=
        " watched";
    }


    button.className =
      className;


    button.innerHTML =
      `<span class="picker-index">${String(season).padStart(2, "0")}</span><span class="picker-copy">Season ${season}</span><span class="picker-arrow">→</span>`;


    button.onclick =
      async () => {

        currentSeason =
          season;

        wrapper
          .querySelectorAll(
            ".picker-btn"
          )
          .forEach(
            button =>
              button.classList.remove(
                "selected"
              )
          );


        button.classList.add(
          "selected"
        );


        currentEpisode =
          1;


        await fetchAndBuildEpisodes(
          tvId,
          season
        );

      };


    wrapper.appendChild(
      button
    );

  }

}


/* =======================================================
   EPISODES
======================================================= */

async function fetchAndBuildEpisodes(
  tvId,
  season
) {

  const requestId = ++episodeRequestId;

  let episodesCount =
    10;


  try {

    const response =
      await fetch(
        `https://api.themoviedb.org/3/tv/${tvId}/season/${season}?api_key=${API_KEY}${langParam()}`
      );


    const data =
      await response.json();


    episodesCount =
      (
        data.episodes ||
        []
      ).length ||
      10;


    const watched =
      getWatched();


    const key =
      String(tvId);


    if (!watched[key]) {
      watched[key] = {};
    }


    watched[key][
      `_total_${season}`
    ] =
      episodesCount;


    saveWatched(
      watched
    );

  } catch (error) {

    console.warn(
      "Episode fetch error:",
      error
    );

  }

  if (requestId !== episodeRequestId || currentSeason !== season) {
    return;
  }


  buildEpisodeBtns(
    episodesCount
  );


  refreshSeasonWatchedState(
    tvId,
    season
  );

}


function refreshSeasonWatchedState(
  tvId,
  season
) {

  const wrapper =
    document.getElementById(
      "seasonBtns"
    );


  if (!wrapper) {
    return;
  }


  const watched =
    getWatched();


  const key =
    String(tvId);


  wrapper
    .querySelectorAll(
      ".picker-btn"
    )
    .forEach(
      (
        button,
        index
      ) => {

        const currentSeasonNumber =
          index + 1;


        const total =
          watched[key] &&
          watched[key][
            `_total_${currentSeasonNumber}`
          ];


        if (
          total &&
          hasWatchedWholeSeason(
            tvId,
            currentSeasonNumber,
            total
          )
        ) {

          button.classList.add(
            "watched"
          );

        } else {

          button.classList.remove(
            "watched"
          );

        }

      }
    );

}


function buildEpisodeBtns(
  count
) {

  const wrapper =
    document.getElementById(
      "episodeBtns"
    );


  if (!wrapper) {
    return;
  }


  wrapper.innerHTML =
    "";


  const tvId =
    currentItem
      ? currentItem.id
      : null;


  for (
    let episode = 1;
    episode <= count;
    episode++
  ) {

    const button =
      document.createElement(
        "button"
      );


    let className =
      "picker-btn";


    if (
      episode === 1
    ) {

      className +=
        " selected";

    }


    if (
      tvId &&
      hasWatchedEpisode(
        tvId,
        currentSeason,
        episode
      )
    ) {

      className +=
        " watched";

    }


    button.className =
      className;


    button.innerHTML =
      `<span class="picker-episode-number">${String(episode).padStart(2, "0")}</span><span class="picker-episode-copy">Episode ${episode}</span>`;


    button.onclick =
      () => {

        currentEpisode =
          episode;


        wrapper
          .querySelectorAll(
            ".picker-btn"
          )
          .forEach(
            button =>
              button.classList.remove(
                "selected"
              )
          );


        button.classList.add(
          "selected"
        );

      };


    wrapper.appendChild(
      button
    );

  }

}


/* =======================================================
   PLAYER
======================================================= */

function goToPlayer() {

  if (!currentItem) {
    return;
  }

  const itemToContinue = {
    id: currentItem.id,
    type: currentItem.type || currentItem.media_type || "movie",
    title: currentItem.title || currentItem.name || "Untitled",
    name: currentItem.name || currentItem.title || "",
    poster: currentItem.poster_path || currentItem.poster || null,
    backdrop: currentItem.backdrop_path || currentItem.backdrop || null,
    season: currentSeason,
    episode: currentEpisode
  };
  addToContinue(itemToContinue);

  if (
    ["16+", "18+"].includes(currentAgeRating) &&
    !ageVerified
  ) {
    const ageBadge = document.getElementById("ageVerificationBadge");
    const ageText = document.getElementById("ageVerificationText");
    const ageConfirm = document.querySelector(".age-verification-actions .auth-primary");
    const minimumAge = currentAgeRating.replace("+", "");

    if (ageBadge) ageBadge.textContent = currentAgeRating;
    if (ageText) {
      ageText.textContent = `This title contains mature content. Confirm that you are ${minimumAge} or older to continue watching.`;
    }
    if (ageConfirm) ageConfirm.textContent = `I am ${minimumAge} or older`;

    document.getElementById("ageVerificationModal")?.classList.add("open");
    return;
  }


  prevPage =
    prevPage ||
    "detailPage";


  let url;
  let titleLabel;


  if (
    currentItem.type ===
    "movie"
  ) {

    url =
      `https://vidcore.io/movie/${currentItem.id}`;


    titleLabel =
      currentItem.title;


  } else {

    url =
      `https://vidcore.io/tv/${currentItem.id}/${currentSeason}/${currentEpisode}`;


    titleLabel =
      `${currentItem.title} · S${currentSeason} E${currentEpisode}`;


  }


  const playerTitle =
    document.getElementById(
      "playerTitle"
    );


  if (playerTitle) {

    playerTitle.textContent =
      titleLabel;

  }


  playerUrl = url;
  playerAttempt = 0;
  showPage(
    "playerPage"
  );
  loadPlayerFrame();

}

function confirmAgeVerification() {
  ageVerified = true;
  document.getElementById("ageVerificationModal")?.classList.remove("open");
  goToPlayer();
}

function cancelAgeVerification() {
  document.getElementById("ageVerificationModal")?.classList.remove("open");
}


function goBackToDetail() {

  autoplayCancel();


  const playerFrame =
    document.getElementById(
      "playerFrame"
    );


  if (playerFrame) {

    clearTimeout(playerLoadTimer);

    playerFrame.innerHTML =
      "";

  }


  if (currentItem?.id && currentItem?.type) {
    openDetail(currentItem.id, currentItem.type);
    return;
  }

  showPage("detailPage");

}


function goBack() {

  showPage(
    "browsePage"
  );

}


/* =======================================================
   FAVORITES PAGE
======================================================= */

function showFav() {

  const favorites =
    getFavorites();


  if (!favorites.length) {

    document.getElementById(
      "content"
    ).innerHTML = `

      <div class="empty">

        <span>❤️</span>

        ${t("noFav")}

      </div>

    `;

    return;

  }


  render(
    favorites,
    t("favTitle")
  );

}


/* =======================================================
   CLEAR DATA
======================================================= */

async function clearData() {

  if (
    !confirm(
      t("confirmDelete")
    )
  ) {

    return;

  }


  sessionFavorites = [];
  sessionContinue = [];
  saveContinue([]);
  sessionWatched = {};
  sessionLang = "en";


  applyTheme(
    false
  );

  closeSettings();

  loadTrending();

}


/* =======================================================
   KEYBOARD NAVIGATION
======================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeMenu();
      closeSettings();
    }


    const focused =
      document.activeElement;


    if (
      focused &&
      [
        "INPUT",
        "BUTTON",
        "TEXTAREA"
      ].includes(
        focused.tagName
      ) &&
      focused.id !== ""
    ) {

      return;

    }


    if (
      event.key ===
        "ArrowRight" ||
      event.key ===
        "ArrowDown"
    ) {

      event.preventDefault();

      moveFocus(
        1
      );

    }


    else if (
      event.key ===
        "ArrowLeft" ||
      event.key ===
        "ArrowUp"
    ) {

      event.preventDefault();

      moveFocus(
        -1
      );

    }

  }
);


function moveFocus(
  direction
) {

  const cards =
    [
      ...document.querySelectorAll(
        ".card"
      )
    ];


  if (!cards.length) {
    return;
  }


  const index =
    cards.indexOf(
      document.activeElement
    );


  const next =
    index + direction;


  if (
    next >= 0 &&
    next < cards.length
  ) {

    cards[next].focus();

  }

  else if (
    next < 0
  ) {

    cards[0].focus();

  }

  else {

    cards[
      cards.length - 1
    ].focus();

  }

}


/* =======================================================
   AUTOPLAY
======================================================= */

function startAutoplay(
  nextSeason,
  nextEpisode
) {

  autoplayNextSeason =
    nextSeason;

  autoplayNextEpisode =
    nextEpisode;

  autoplaySecondsLeft =
    5;


  const title =
    document.getElementById(
      "autoplayTitle"
    );


  if (title) {

    title.textContent =
      `${currentItem.title} · S${nextSeason} E${nextEpisode}`;

  }


  updateAutoplayRing(
    5
  );


  const overlay =
    document.getElementById(
      "autoplayOverlay"
    );


  if (overlay) {

    overlay.classList.add(
      "active"
    );

  }


  clearInterval(
    autoplayTimer
  );


  autoplayTimer =
    setInterval(
      () => {

        autoplaySecondsLeft--;


        const count =
          document.getElementById(
            "autoplayCount"
          );


        if (count) {

          count.textContent =
            autoplaySecondsLeft;

        }


        updateAutoplayRing(
          autoplaySecondsLeft
        );


        if (
          autoplaySecondsLeft <=
          0
        ) {

          autoplayNow();

        }

      },
      1000
    );

}


function updateAutoplayRing(
  seconds
) {

  const ring =
    document.getElementById(
      "autoplayRing"
    );


  if (!ring) {
    return;
  }


  const degrees =
    (
      (5 - seconds) /
      5
    ) *
    360;


  ring.style.background =
    `conic-gradient(var(--red) ${degrees}deg, #333 ${degrees}deg)`;

}


function autoplayNow() {

  clearInterval(
    autoplayTimer
  );

  autoplayTimer =
    null;


  const overlay =
    document.getElementById(
      "autoplayOverlay"
    );


  if (overlay) {

    overlay.classList.remove(
      "active"
    );

  }


  currentSeason =
    autoplayNextSeason;

  currentEpisode =
    autoplayNextEpisode;


  const playerTitle =
    document.getElementById(
      "playerTitle"
    );


  if (playerTitle) {

    playerTitle.textContent =
      `${currentItem.title} · S${currentSeason} E${currentEpisode}`;

  }


  goToPlayer();

}


function autoplayCancel() {

  clearInterval(
    autoplayTimer
  );

  autoplayTimer =
    null;


  const overlay =
    document.getElementById(
      "autoplayOverlay"
    );


  if (overlay) {

    overlay.classList.remove(
      "active"
    );

  }

}


/* =======================================================
   CHECK NEXT EPISODE
======================================================= */

async function checkAndTriggerAutoplay() {

  if (
    !currentItem ||
    currentItem.type !==
      "tv"
  ) {

    return;

  }


  const nextEpisode =
    currentEpisode + 1;


  try {

    const response =
      await fetch(
        `https://api.themoviedb.org/3/tv/${currentItem.id}/season/${currentSeason}?api_key=${API_KEY}`
      );


    const data =
      await response.json();


    const episodes =
      (
        data.episodes ||
        []
      ).length;


    if (
      nextEpisode <=
      episodes
    ) {

      startAutoplay(
        currentSeason,
        nextEpisode
      );

      return;

    }


    const showResponse =
      await fetch(
        `https://api.themoviedb.org/3/tv/${currentItem.id}?api_key=${API_KEY}`
      );


    const showData =
      await showResponse.json();


    const seasons =
      (
        showData.seasons ||
        []
      )
      .filter(
        season =>
          season.season_number >
          0
      )
      .length;


    if (
      currentSeason <
      seasons
    ) {

      startAutoplay(
        currentSeason + 1,
        1
      );

    }

  } catch (error) {

    console.warn(
      "Autoplay check error:",
      error
    );

  }

}


/* =======================================================
   PLAYER END MESSAGE
======================================================= */

window.addEventListener(
  "message",
  event => {

    if (
      !currentItem ||
      currentItem.type !==
        "tv"
    ) {

      return;

    }


    const data =
      event.data;


    if (
      data === "ended" ||
      data?.event === "ended" ||
      data?.type === "ended" ||
      data === "complete" ||
      data?.event === "complete" ||
      data?.status === "ended"
    ) {

      checkAndTriggerAutoplay();

    }

  }
);


/* =======================================================
   INIT
======================================================= */

async function initFloww() {

  /* -----------------------------------------------
     THEME
  ----------------------------------------------- */

  const savedTheme = sessionTheme;


  if (
    savedTheme ===
    "light"
  ) {

    applyTheme(
      true
    );

  }


  /* -----------------------------------------------
     LANGUAGE
  ----------------------------------------------- */

  const savedLang = sessionLang;


  const langSelect =
    document.getElementById(
      "langSelect"
    );


  if (langSelect) {

    langSelect.value =
      savedLang;

  }


  applyLang();

  /* -----------------------------------------------
     PAGE
  ----------------------------------------------- */

  showLoader();


  const landingPage =
    document.getElementById(
      "landingPage"
    );


  if (landingPage) {
    landingPage.classList.add(
      "active"
    );

    await loadLandingTrending();
    hideLoader();
    return;

  }


  const browsePage =
    document.getElementById(
      "browsePage"
    );


  if (browsePage) {

    browsePage.classList.add(
      "active"
    );

  }


  try {

    await loadTrending();

  } finally {

    hideLoader();
  }

}


window.addEventListener("scroll", () => {
  document.getElementById("backToTop")?.classList.toggle("visible", window.scrollY > 520);
  if (document.querySelector(".standalone-infinite") && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700) {
    loadInfiniteSection();
  }
  if (document.getElementById("categoryGrid") && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700) {
    loadCategory(activeCategoryId, activeCategoryName, false);
  }
});

/* =======================================================
   FLOWW LOADER
======================================================= */

window.addEventListener(
  "load",
  () => {

    const loader =
      document.getElementById(
        "bananaLoader"
      );


    if (!loader) {
      return;
    }


    const delay =
      900 +
      Math.random() *
      900;


    setTimeout(
      () => {

        loader.style.opacity =
          "0";

        loader.style.transition =
          "opacity 0.5s";


        setTimeout(
          () => {

            loader.remove();

          },
          500
        );

      },
      delay
    );

  }
);


/* =======================================================
   START FLOWW
======================================================= */

initFloww();