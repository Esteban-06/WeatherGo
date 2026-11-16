(function () {
  "use strict";

  var STORAGE_KEY = "weathergo-state-v1";
  var WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
  var GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  var defaultItems = [
    { id: "demo-1", name: "Sunday best trench", category: "Outerwear", color: "Sage green", emoji: "🧥", warmth: 4, waterproof: true, weather: ["rainy", "windy", "mild"] },
    { id: "demo-2", name: "Soft cotton tee", category: "Tops", color: "Warm white", emoji: "👕", warmth: 1, waterproof: false, weather: ["sunny", "mild"] },
    { id: "demo-3", name: "Favorite straight-leg jeans", category: "Bottoms", color: "Classic blue", emoji: "👖", warmth: 2, waterproof: false, weather: ["sunny", "mild", "windy"] },
    { id: "demo-4", name: "Everyday sneakers", category: "Shoes", color: "Cream & green", emoji: "👟", warmth: 2, waterproof: false, weather: ["sunny", "mild"] },
    { id: "demo-5", name: "Chunky knit sweater", category: "Tops", color: "Oatmeal", emoji: "🧶", warmth: 5, waterproof: false, weather: ["cold", "windy"] },
    { id: "demo-6", name: "Little raincloud umbrella", category: "Accessories", color: "Forest green", emoji: "☂️", warmth: 1, waterproof: true, weather: ["rainy"] },
    { id: "demo-7", name: "Weekend baseball cap", category: "Accessories", color: "Butter yellow", emoji: "🧢", warmth: 1, waterproof: false, weather: ["sunny"] }
  ];

  var state = {
    user: null,
    items: defaultItems.slice(),
    location: { name: "Portland", country: "United States", latitude: 45.5152, longitude: -122.6784 },
    weather: null,
    outfitOffset: 0
  };
  var toastTimer;
  var weatherRequest = 0;

  function loadState() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      var parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.items)) state.items = parsed.items;
      if (parsed && parsed.user && typeof parsed.user.name === "string") state.user = parsed.user;
      if (parsed && parsed.location && Number.isFinite(parsed.location.latitude) && Number.isFinite(parsed.location.longitude)) state.location = parsed.location;
    } catch (error) {
      console.warn("WeatherGo could not restore saved data.", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: state.user,
        items: state.items,
        location: state.location
      }));
    } catch (error) {
      console.warn("WeatherGo could not save your changes.", error);
      showToast("Your browser couldn't save this change.");
    }
  }

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function showToast(message) {
    var toast = byId("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  function displayName() { return state.user ? state.user.name : "Alex Morgan"; }

  function setAvatar(element, user) {
    if (!element) return;
    if (user && user.photo) {
      element.innerHTML = '<img src="' + escapeHtml(user.photo) + '" alt="">';
    } else {
      element.textContent = displayName().trim().charAt(0).toUpperCase() || "A";
    }
  }

  function renderProfile() {
    var name = displayName();
    var firstName = name.trim().split(/\s+/)[0] || name;
    byId("sidebar-name").textContent = name;
    byId("welcome-name").innerHTML = "Hello, " + escapeHtml(firstName) + ' <span>✳</span>';
    setAvatar(byId("sidebar-avatar"), state.user);
    setAvatar(byId("profile-avatar"), state.user);
    updateCount();
  }

  function updateCount() {
    var count = state.items.length;
    byId("item-count").textContent = String(count);
    byId("wardrobe-count").textContent = count
      ? count + " thoughtful " + (count === 1 ? "piece" : "pieces") + " in your wardrobe, ready for the day."
      : "Your wardrobe is waiting for its first favorite piece.";
  }

  function showApp() {
    byId("login-screen").classList.add("hidden");
    byId("app-shell").classList.remove("hidden");
    renderProfile();
    renderWardrobe();
    updateDate();
    showPage("overview");
    loadWeather(state.location);
  }

  function updateDate() {
    var date = new Date();
    byId("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
  }

  function showPage(page) {
    var valid = ["overview", "weather", "add"];
    if (valid.indexOf(page) === -1) return;
    document.querySelectorAll(".page").forEach(function (element) {
      element.classList.toggle("active", element.id === "page-" + page);
    });
    document.querySelectorAll(".nav-link").forEach(function (element) {
      element.classList.toggle("active", element.getAttribute("data-page") === page);
    });
    var titles = { overview: "My wardrobe", weather: "Weather & outfit", add: "Add to wardrobe" };
    byId("page-crumb").textContent = titles[page];
    if (page === "weather") loadWeather(state.location);
    if (page === "weather") updateOutfit();
    if (page === "overview") renderWardrobe();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderWardrobe() {
    var grid = byId("wardrobe-grid");
    var filter = byId("category-filter").value;
    var items = state.items.filter(function (item) { return filter === "all" || item.category === filter; });
    byId("item-count").textContent = String(state.items.length);
    byId("empty-state").classList.toggle("hidden", state.items.length > 0);
    grid.classList.toggle("hidden", state.items.length === 0);
    grid.innerHTML = items.map(function (item, index) {
      var tags = [];
      (item.weather || []).slice(0, 2).forEach(function (type) {
        tags.push('<span class="item-tag">' + escapeHtml(type.charAt(0).toUpperCase() + type.slice(1)) + "</span>");
      });
      if (item.waterproof) tags.push('<span class="item-tag waterproof-tag">Waterproof</span>');
      if (!tags.length) tags.push('<span class="item-tag">Everyday</span>');
      return '<article class="item-card"><div class="item-art tone-' + (index % 5) + '"><span class="item-category-tag">' + escapeHtml(item.category) + '</span><button class="delete-item" data-delete="' + escapeHtml(item.id) + '" aria-label="Remove ' + escapeHtml(item.name) + '" title="Remove from wardrobe">×</button><span class="item-emoji" aria-hidden="true">' + escapeHtml(item.emoji || "👕") + '</span></div><div class="item-details"><h3 class="item-name">' + escapeHtml(item.name) + '</h3><p class="item-color">' + escapeHtml(item.color) + '</p><div class="item-tags">' + tags.join("") + "</div></div></article>";
    }).join("");
    updateCount();
  }

  function conditionForWeather(weather) {
    if (!weather) return "mild";
    if (weather.precipitation > 0.1 || weather.code === 51 || weather.code === 53 || weather.code === 55 || weather.code === 61 || weather.code === 63 || weather.code === 65 || weather.code === 80 || weather.code === 81 || weather.code === 82 || weather.code === 95 || weather.code === 96 || weather.code === 99) return "rainy";
    if (weather.wind >= 16) return "windy";
    if (weather.temperature <= 50) return "cold";
    if (weather.temperature >= 74) return "sunny";
    return "mild";
  }

  function itemScore(item, condition, temp, precipitation) {
    var score = (item.weather || []).indexOf(condition) >= 0 ? 4 : 0;
    if (condition === "rainy" && item.waterproof) score += 5;
    if (temp <= 50) score += Math.max(0, Number(item.warmth) - 2) * 1.5;
    if (temp >= 75) score += Math.max(0, 3 - Number(item.warmth)) * 0.7;
    if (precipitation > 0.2 && item.waterproof) score += 1;
    return score;
  }

  function chooseOutfit() {
    if (!state.items.length) return [];
    var weather = state.weather;
    var condition = conditionForWeather(weather && weather.current);
    var temp = weather ? weather.current.temperature : 63;
    var precipitation = weather && weather.current ? weather.current.precipitation / 10 : 0;
    var byCategory = {};
    state.items.forEach(function (item) {
      var score = itemScore(item, condition, temp, precipitation);
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push({ item: item, score: score });
    });
    Object.keys(byCategory).forEach(function (category) {
      byCategory[category].sort(function (a, b) {
        return b.score - a.score || (b.item.warmth || 0) - (a.item.warmth || 0);
      });
    });
    function pick(category) {
      var choices = byCategory[category];
      return choices && choices[state.outfitOffset % choices.length].item;
    }
    var selected = [];
    var tops = pick("Tops");
    var bottoms = pick("Bottoms");
    var outerwear = pick("Outerwear");
    var shoes = pick("Shoes");
    var accessories = pick("Accessories");
    if (tops) selected.push(tops);
    if (bottoms) selected.push(bottoms);
    if (outerwear && (temp < 69 || condition === "rainy" || condition === "windy")) selected.push(outerwear);
    if (shoes) selected.push(shoes);
    if (accessories && (condition === "rainy" || condition === "sunny" || temp < 41)) selected.push(accessories);
    return selected;
  }

  function outfitReason(item) {
    var weather = state.weather;
    var condition = conditionForWeather(weather && weather.current);
    if (condition === "rainy" && item.waterproof) return "Rain ready";
    if (condition === "cold" && item.warmth >= 4) return "Keeps you cozy";
    if ((item.weather || []).indexOf(condition) >= 0) {
      return { sunny: "Made for sunshine", mild: "Just right today", cold: "Good for the cold", rainy: "A rainy-day pick", windy: "Wind-friendly" }[condition];
    }
    return item.warmth >= 4 ? "A cozy layer" : "Everyday favorite";
  }

  function updateOutfit() {
    var items = chooseOutfit();
    var list = byId("outfit-items");
    var empty = items.length === 0;
    list.classList.toggle("hidden", empty);
    byId("outfit-note").classList.toggle("hidden", empty);
    byId("refresh-outfit").classList.toggle("hidden", empty || items.length < 2);
    byId("outfit-empty").classList.toggle("hidden", !empty);
    if (empty) return;
    list.innerHTML = items.map(function (item, index) {
      return '<div class="outfit-item"><span class="outfit-item-art">' + escapeHtml(item.emoji || "👕") + '</span><span class="outfit-item-copy"><strong>' + escapeHtml(item.name) + '</strong><span>' + escapeHtml(item.category) + " · " + escapeHtml(item.color) + '</span></span><span class="outfit-item-reason">' + escapeHtml(outfitReason(item)) + "</span></div>";
    }).join("");
    var condition = conditionForWeather(state.weather && state.weather.current);
    var intros = {
      sunny: "A little sunshine calls for breathable favorites and an easy layer.",
      mild: "An easy, comfortable combination for a just-right kind of day.",
      cold: "Warm, cozy layers to make the outside feel a little nicer.",
      rainy: "A rain-ready look to keep you comfortable, whatever the clouds decide.",
      windy: "A considered layer-up for a breezy day."
    };
    byId("outfit-intro").textContent = intros[condition];
    byId("outfit-weather-tag").textContent = condition.toUpperCase() + " DAY";
  }

  function weatherDetails(code) {
    if (code === 0) return { text: "Clear sky", icon: "☀", kind: "sunny" };
    if (code === 1) return { text: "Mostly clear", icon: "🌤", kind: "sunny" };
    if (code === 2) return { text: "Partly cloudy", icon: "⛅", kind: "mild" };
    if (code === 3) return { text: "Overcast", icon: "☁", kind: "mild" };
    if (code === 45 || code === 48) return { text: "Misty", icon: "🌫", kind: "mild" };
    if (code >= 51 && code <= 57) return { text: "Drizzle", icon: "🌦", kind: "rainy" };
    if (code >= 61 && code <= 67) return { text: "Rain showers", icon: "🌧", kind: "rainy" };
    if (code >= 71 && code <= 77) return { text: "Snow", icon: "❄", kind: "cold" };
    if (code >= 80 && code <= 82) return { text: "Rain showers", icon: "🌦", kind: "rainy" };
    if (code >= 85 && code <= 86) return { text: "Snow showers", icon: "🌨", kind: "cold" };
    if (code >= 95) return { text: "Thunderstorms", icon: "⛈", kind: "rainy" };
    return { text: "Partly cloudy", icon: "⛅", kind: "mild" };
  }

  function setWeatherError(message) {
    var element = byId("weather-error");
    element.textContent = message;
    element.classList.remove("hidden");
  }

  function renderWeather(data) {
    var current = data.current;
    var detail = weatherDetails(current.weather_code);
    var temp = Math.round(current.temperature_2m);
    var feels = Math.round(current.apparent_temperature);
    var rain = data.daily.precipitation_probability_max[0] || 0;
    state.weather = {
      current: {
        temperature: temp,
        feelsLike: feels,
        code: current.weather_code,
        precipitation: current.precipitation,
        wind: current.wind_speed_10m,
        condition: detail.kind
      },
      daily: data.daily
    };
    byId("current-city").textContent = state.location.name + (state.location.country ? ", " + state.location.country : "");
    byId("forecast-location").textContent = byId("current-city").textContent;
    byId("current-emoji").textContent = detail.icon;
    byId("current-temp").textContent = temp + "°F";
    byId("current-description").textContent = detail.text;
    byId("feels-like").textContent = feels + "°F";
    byId("stat-feels").textContent = feels + "°F";
    byId("humidity").textContent = Math.round(current.relative_humidity_2m) + "%";
    byId("wind-speed").innerHTML = Math.round(current.wind_speed_10m) + ' <small>mph</small>';
    byId("rain-chance").textContent = rain + "%";
    byId("current-summary").textContent = rain > 40
      ? "An umbrella might be your favorite accessory today."
      : temp < 50
        ? "A cozy extra layer could make all the difference."
        : temp >= 74
          ? "A lovely day to keep things light and breathable."
          : "Local weather, thoughtfully paired with your wardrobe.";
    byId("banner-temp").textContent = temp + "°F";
    byId("banner-weather-description").textContent = detail.text + " in " + state.location.name;
    byId("top-weather-temp").textContent = temp + "°F";
    byId("top-weather-icon").textContent = detail.icon;
    byId("top-weather-city").textContent = state.location.name;
    renderForecast(data.daily);
    updateRadar(state.location);
    updateOutfit();
  }

  function renderForecast(daily) {
    var grid = byId("forecast-grid");
    var formatter = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" });
    grid.innerHTML = daily.time.slice(0, 7).map(function (date, index) {
      var parts = date.split("-").map(Number);
      var localDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      var name = index === 0 ? "Today" : formatter.format(localDate);
      var detail = weatherDetails(daily.weather_code[index]);
      var rain = daily.precipitation_probability_max[index] || 0;
      return '<div class="forecast-day' + (index === 0 ? " today" : "") + '"><span>' + name + '</span><span class="forecast-icon">' + detail.icon + '</span><strong>' + Math.round(daily.temperature_2m_max[index]) + '°</strong><small>' + Math.round(daily.temperature_2m_min[index]) + '°</small><em>' + (rain ? rain + "% rain" : "—") + "</em></div>";
    }).join("");
  }

  function updateRadar(location) {
    var lat = Number(location.latitude).toFixed(2);
    var lon = Number(location.longitude).toFixed(2);
    byId("radar-frame").src = "https://embed.windy.com/embed2.html?lat=" + lat + "&lon=" + lon + "&detailLat=" + lat + "&detailLon=" + lon + "&width=650&height=360&zoom=6&level=surface&overlay=radar&product=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=default&metricTemp=%C2%B0F";
    byId("radar-link").href = "https://www.windy.com/" + lat + "/" + lon + "?radar," + lat + "," + lon + ",7";
  }

  async function loadWeather(location) {
    var requestId = ++weatherRequest;
    byId("weather-error").classList.add("hidden");
    byId("forecast-grid").innerHTML = '<div class="forecast-loading">Getting your week in view…</div>';
    try {
      var url = WEATHER_URL + "?latitude=" + encodeURIComponent(location.latitude) + "&longitude=" + encodeURIComponent(location.longitude) + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7";
      var response = await fetch(url);
      if (!response.ok) throw new Error("Weather service returned " + response.status);
      var data = await response.json();
      if (requestId !== weatherRequest) return;
      if (!data.current || !data.daily || !Array.isArray(data.daily.time) || data.daily.time.length < 7) throw new Error("The weather service returned an incomplete forecast.");
      renderWeather(data);
    } catch (error) {
      if (requestId !== weatherRequest) return;
      console.error("WeatherGo could not load the forecast.", error);
      byId("forecast-grid").innerHTML = '<div class="forecast-loading">The forecast is unavailable right now.</div>';
      setWeatherError("We couldn't load live weather. Check your connection and try searching again.");
    }
  }

  async function findLocation(query) {
    var response = await fetch(GEO_URL + "?name=" + encodeURIComponent(query) + "&count=1&language=en&format=json");
    if (!response.ok) throw new Error("Location service returned " + response.status);
    var data = await response.json();
    if (!data.results || !data.results.length) throw new Error("We couldn't find that place. Try a nearby city.");
    var result = data.results[0];
    return { name: result.name, country: result.country || "", latitude: result.latitude, longitude: result.longitude };
  }

  function bindEvents() {
    byId("login-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = new FormData(event.currentTarget);
      state.user = { name: String(form.get("name")).trim(), email: String(form.get("email")).trim() };
      saveState();
      showApp();
    });
    byId("demo-login").addEventListener("click", function () {
      state.user = { name: "Alex Morgan", email: "hello@weathergo.app" };
      saveState();
      showApp();
    });
    byId("profile-photo-trigger").addEventListener("click", function () {
      byId("profile-photo").click();
    });
    byId("profile-photo").addEventListener("change", function (event) {
      var file = event.currentTarget.files && event.currentTarget.files[0];
      event.currentTarget.value = "";
      if (!file) return;
      if (!file.type || file.type.indexOf("image/") !== 0) {
        showToast("Choose an image file for your profile photo.");
        return;
      }
      if (file.size > 1024 * 1024) {
        showToast("Choose a profile photo smaller than 1 MB.");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        if (typeof reader.result !== "string") {
          showToast("We couldn't read that profile photo.");
          return;
        }
        state.user = state.user || { name: "Alex Morgan", email: "" };
        state.user.photo = reader.result;
        saveState();
        renderProfile();
        showToast("Your profile photo is looking good.");
      };
      reader.onerror = function () {
        console.error("WeatherGo could not read the selected profile photo.", reader.error);
        showToast("We couldn't read that profile photo.");
      };
      reader.readAsDataURL(file);
    });
    document.querySelectorAll("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        var target = button.getAttribute("data-page");
        if (target === "add" && byId("item-form")) byId("item-form").reset();
        document.querySelectorAll(".emoji-option").forEach(function (option, index) { option.classList.toggle("selected", index === 0); });
        showPage(target);
      });
    });
    byId("sign-out").addEventListener("click", function () {
      state.user = null;
      saveState();
      byId("app-shell").classList.add("hidden");
      byId("login-screen").classList.remove("hidden");
      byId("login-form").reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    byId("category-filter").addEventListener("change", renderWardrobe);
    byId("wardrobe-grid").addEventListener("click", function (event) {
      var button = event.target.closest("[data-delete]");
      if (!button) return;
      var item = state.items.find(function (entry) { return String(entry.id) === button.getAttribute("data-delete"); });
      if (!item) return;
      state.items = state.items.filter(function (entry) { return String(entry.id) !== button.getAttribute("data-delete"); });
      saveState();
      renderWardrobe();
      updateOutfit();
      showToast(item.name + " removed from your wardrobe.");
    });
    byId("emoji-picker").addEventListener("click", function (event) {
      var button = event.target.closest("[data-emoji]");
      if (!button) return;
      document.querySelectorAll(".emoji-option").forEach(function (option) { option.classList.toggle("selected", option === button); });
    });
    byId("item-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = new FormData(event.currentTarget);
      var name = String(form.get("name")).trim();
      if (!name) return;
      var selectedEmoji = document.querySelector(".emoji-option.selected");
      state.items.unshift({
        id: "item-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name: name,
        category: String(form.get("category")),
        color: String(form.get("color")).trim(),
        emoji: selectedEmoji ? selectedEmoji.getAttribute("data-emoji") : "👕",
        warmth: Number(form.get("warmth")) || 3,
        waterproof: form.has("waterproof"),
        weather: form.getAll("weather").map(String)
      });
      saveState();
      event.currentTarget.reset();
      document.querySelectorAll(".emoji-option").forEach(function (option, index) { option.classList.toggle("selected", index === 0); });
      byId("category-filter").value = "all";
      renderWardrobe();
      updateOutfit();
      showPage("overview");
      showToast("Your new favorite has a home.");
    });
    byId("location-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var input = byId("location-input");
      var query = input.value.trim();
      if (!query) {
        setWeatherError("Enter a city or location to see its forecast.");
        return;
      }
      var button = event.currentTarget.querySelector("button");
      button.disabled = true;
      button.textContent = "…";
      try {
        var location = await findLocation(query);
        state.location = location;
        state.weather = null;
        saveState();
        await loadWeather(location);
      } catch (error) {
        console.error("WeatherGo could not find this location.", error);
        setWeatherError(error.message === "Failed to fetch"
          ? "We couldn't reach the location service. Check your connection and try again."
          : error.message);
      } finally {
        button.disabled = false;
        button.textContent = "→";
      }
    });
    byId("refresh-outfit").addEventListener("click", function () {
      state.outfitOffset += 1;
      updateOutfit();
      showToast("A fresh little outfit idea.");
    });
  }

  loadState();
  bindEvents();
  if (state.user) showApp();
})();
