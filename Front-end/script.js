const usersDB = {};
let currentUser = null;
let bodyInfo = null;
let dailyTargets = null;
let uploadedImageData = null;
let currentMeal = null;
let selectedGoalType = "fit";
let mealHistory = [];

const navItems = [
  { id: "screen-home", label: "Dashboard", icon: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21H5a2 2 0 0 1-2-2Z"/></svg>' },
  { id: "screen-track", label: "Track", icon: '<svg viewBox="0 0 24 24"><path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/></svg>' },
  { id: "screen-history", label: "History", icon: '<svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16"/></svg>' },
  { id: "screen-diet", label: "Diet", icon: '<svg viewBox="0 0 24 24"><path d="M12 3c3 0 6 2 6 5 0 4-4 6-6 10-2-4-6-6-6-10 0-3 3-5 6-5Z"/><path d="M7 16h10"/></svg>' },
  { id: "screen-profile", label: "Profile", icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>' }
];

function renderNav() {
  const navMarkup = navItems.map((item) => `
    <button class="nav-item" data-nav="${item.id}" onclick="go('${item.id}')">${item.icon}<span>${item.label}</span></button>
  `).join("");
  document.querySelectorAll(".sidebar").forEach((sidebar) => {
    sidebar.innerHTML = `
      <div class="brand-lockup compact">
        <div class="brand-mark small">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13a8 8 0 0 1 16 0c0 5-8 9-8 9s-8-4-8-9Z"/><path d="M8 13h8M12 9v8"/></svg>
        </div>
        <div><b>FitMacro</b><span>Meal intelligence</span></div>
      </div>
      <nav class="nav">${navMarkup}</nav>
      <button class="btn btn-soft" onclick="logout()">Sign out</button>
    `;
  });
  document.querySelectorAll(".mobile-bottom-nav").forEach((nav) => {
    nav.innerHTML = navItems.map((item) => `
      <button class="mobile-nav-item" data-nav="${item.id}" onclick="go('${item.id}')">${item.icon}<span>${item.label}</span></button>
    `).join("");
  });
}

function go(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  const targetScreen = document.getElementById(id);
  if (targetScreen) {
    targetScreen.classList.add("active");
    targetScreen.scrollTop = 0;
  }
  updateNav(id);
  if (id === "screen-home") renderDashboard();
  if (id === "screen-history") renderHistory();
  if (id === "screen-targets") renderTargets();
  if (id === "screen-profile") renderProfile();
  if (id === "screen-diet") syncGoalSelection();
}

function updateNav(id) {
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === id);
  });
}

function setMsg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function setErr(inputId, msgId, hasErr, msg) {
  const input = document.getElementById(inputId);
  if (input) input.classList.toggle("err", Boolean(hasErr));
  setMsg(msgId, hasErr ? msg : "");
}

function showBanner(text, type) {
  const banner = document.getElementById("auth-banner");
  banner.textContent = text;
  banner.className = "form-banner show " + type;
}

function hideBanner() {
  document.getElementById("auth-banner").className = "form-banner";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function showRegister() {
  hideBanner();
  document.getElementById("login-form").hidden = true;
  document.getElementById("register-form").hidden = false;
}

function showLogin() {
  hideBanner();
  document.getElementById("register-form").hidden = true;
  document.getElementById("login-form").hidden = false;
}

function handleRegister() {
  hideBanner();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const pass = document.getElementById("reg-pass").value;
  const pass2 = document.getElementById("reg-pass2").value;
  let ok = true;

  if (!name) { setErr("reg-name", "reg-name-msg", true, "Please enter your name"); ok = false; } else setErr("reg-name", "reg-name-msg", false);
  if (!email) { setErr("reg-email", "reg-email-msg", true, "Email is required"); ok = false; }
  else if (!isValidEmail(email)) { setErr("reg-email", "reg-email-msg", true, "Enter a valid email"); ok = false; }
  else if (usersDB[email]) { setErr("reg-email", "reg-email-msg", true, "An account already exists"); ok = false; }
  else setErr("reg-email", "reg-email-msg", false);
  if (!pass || pass.length < 6) { setErr("reg-pass", "reg-pass-msg", true, "At least 6 characters"); ok = false; } else setErr("reg-pass", "reg-pass-msg", false);
  if (pass2 !== pass || !pass2) { setErr("reg-pass2", "reg-pass2-msg", true, "Passwords do not match"); ok = false; } else setErr("reg-pass2", "reg-pass2-msg", false);
  if (!ok) return;

  usersDB[email] = { name, email, password: pass };
  document.getElementById("login-email").value = email;
  showBanner("Account created. Sign in below.", "ok");
  showLogin();
}

function handleLogin() {
  hideBanner();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pass = document.getElementById("login-pass").value;
  let ok = true;
  if (!email) { setErr("login-email", "login-email-msg", true, "Email is required"); ok = false; } else setErr("login-email", "login-email-msg", false);
  if (!pass) { setErr("login-pass", "login-pass-msg", true, "Password is required"); ok = false; } else setErr("login-pass", "login-pass-msg", false);
  if (!ok) return;

  const user = usersDB[email];
  if (!user) { showBanner("No account found. Create one or continue as guest.", "err"); return; }
  if (user.password !== pass) { showBanner("Incorrect password.", "err"); return; }
  currentUser = user;
  go(bodyInfo ? "screen-home" : "screen-stats");
}

function continueGuest() {
  currentUser = { name: "Guest Athlete", email: "guest@fitmacro.local" };
  applyDemoData();
  go("screen-home");
}

function logout() {
  currentUser = null;
  bodyInfo = null;
  dailyTargets = null;
  mealHistory = [];
  uploadedImageData = null;
  currentMeal = null;
  showLogin();
  go("screen-login");
}

function applyDemoData() {
  bodyInfo = { sex: "Male", age: 24, height: 178, weight: 72, activityLabel: "Moderate - 3-5 days / week" };
  dailyTargets = { calories: 2380, protein: 130, carbs: 292, fat: 66 };
  mealHistory = [
    { name: "Greek yogurt bowl", calories: 420, protein: 31, carbs: 48, fat: 10, time: "08:35" },
    { name: "Chicken rice plate", calories: 690, protein: 52, carbs: 76, fat: 18, time: "13:10" }
  ];
}

function selSeg(btn) {
  btn.parentElement.querySelectorAll("button").forEach((button) => button.classList.remove("sel"));
  btn.classList.add("sel");
}

function calcAndGo() {
  const age = parseFloat(document.getElementById("in-age").value);
  const height = parseFloat(document.getElementById("in-height").value);
  const weight = parseFloat(document.getElementById("in-weight").value);
  const activity = parseFloat(document.getElementById("in-activity").value);
  const isMale = document.querySelector("#screen-stats .seg button.sel").textContent === "Male";
  let ok = true;

  if (!age || age < 10 || age > 100) { setErr("in-age", "in-age-msg", true, "Enter age 10-100"); ok = false; } else setErr("in-age", "in-age-msg", false);
  if (!height || height < 100 || height > 250) { setErr("in-height", "in-height-msg", true, "Enter height in cm"); ok = false; } else setErr("in-height", "in-height-msg", false);
  if (!weight || weight < 30 || weight > 300) { setErr("in-weight", "in-weight-msg", true, "Enter weight in kg"); ok = false; } else setErr("in-weight", "in-weight-msg", false);
  if (!ok) return;

  const bmr = isMale ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
  const calories = Math.round(bmr * activity);
  const protein = Math.round(weight * 1.8);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  bodyInfo = { sex: isMale ? "Male" : "Female", age, height, weight, activityLabel: document.getElementById("in-activity").selectedOptions[0].textContent };
  dailyTargets = { calories, protein, carbs, fat };
  if (!currentUser) currentUser = { name: "Guest Athlete", email: "guest@fitmacro.local" };
  renderTargets();
  go("screen-home");
}

function totals() {
  return mealHistory.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.protein,
    carbs: sum.carbs + meal.carbs,
    fat: sum.fat + meal.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function pct(value, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function renderDashboard() {
  const target = dailyTargets || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const total = totals();
  const remaining = Math.max(0, target.calories - total.calories);
  const progress = pct(total.calories, target.calories);
  const firstName = currentUser?.name?.split(" ")[0] || "there";

  document.getElementById("home-title").textContent = "Good work, " + firstName;
  document.getElementById("dash-remaining").textContent = remaining;
  document.getElementById("dash-eaten").textContent = total.calories;
  document.getElementById("dash-target").textContent = target.calories || "-";
  document.getElementById("dash-cal-sub").textContent = target.calories ? progress + "% of your calorie target is logged." : "Set your targets to begin.";
  document.getElementById("calorie-ring").style.setProperty("--progress", progress + "%");

  const coachTitle = total.calories ? "Momentum looks good" : "Start with one meal";
  const coachCopy = total.calories
    ? "You have logged " + mealHistory.length + " meal" + (mealHistory.length === 1 ? "" : "s") + ". Keep protein visible and the rest gets easier."
    : "Use photo tracking or manual entry. The interface is ready for a real AI backend later.";
  document.getElementById("coach-title").textContent = coachTitle;
  document.getElementById("coach-copy").textContent = coachCopy;

  renderMacroProgress();
  renderMealList("recent-meals", mealHistory.slice(-3).reverse());
}

function renderMacroProgress() {
  const target = dailyTargets || { protein: 0, carbs: 0, fat: 0 };
  const total = totals();
  const rows = [
    ["Protein", total.protein, target.protein, "var(--protein)"],
    ["Carbs", total.carbs, target.carbs, "var(--carbs)"],
    ["Fat", total.fat, target.fat, "var(--fat)"]
  ];
  document.getElementById("macro-progress").innerHTML = rows.map(([name, value, targetValue, color]) => `
    <div class="macro-row">
      <header><span>${name}</span><b>${value}g / ${targetValue || "-"}g</b></header>
      <div class="track"><div class="fill" style="width:${pct(value, targetValue)}%; background:${color};"></div></div>
    </div>
  `).join("");
}

function renderMealList(id, meals) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!meals.length) {
    const emptyCopy = id === "history-list"
      ? '<div class="meal-empty"><div class="empty-icon">🧾</div><b>Your history is empty</b><p class="muted">Add your first meal from the tracker to build a log.</p><button class="btn btn-soft" onclick="go(\'screen-track\')">Add meal</button></div>'
      : '<div class="meal-empty"><div class="empty-icon">🍽️</div><b>No meals logged yet</b><p class="muted">Use photo tracking or manual entry to start your day.</p><button class="btn btn-soft" onclick="go(\'screen-track\')">Start tracking</button></div>';
    el.innerHTML = emptyCopy;
    return;
  }
  el.innerHTML = meals.map((meal) => `
    <div class="meal-item">
      <div><b>${escapeHTML(meal.name)}</b><span>${meal.time} · P ${meal.protein}g · C ${meal.carbs}g · F ${meal.fat}g</span></div>
      <div class="meal-cal">${meal.calories} kcal</div>
    </div>
  `).join("");
}

function renderHistory() {
  renderMealList("history-list", mealHistory.slice().reverse());
}

function renderTargets() {
  if (!dailyTargets) return;
  document.getElementById("t-cal").textContent = dailyTargets.calories + " kcal";
  document.getElementById("t-protein").textContent = dailyTargets.protein + "g";
  document.getElementById("t-carbs").textContent = dailyTargets.carbs + "g";
  document.getElementById("t-fat").textContent = dailyTargets.fat + "g";
}

function renderProfile() {
  if (!currentUser) return;
  const initials = currentUser.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  document.getElementById("p-avatar").textContent = initials || "FM";
  document.getElementById("p-name").textContent = currentUser.name;
  document.getElementById("p-email").textContent = currentUser.email;
  document.getElementById("p-sex").textContent = bodyInfo?.sex || "-";
  document.getElementById("p-age").textContent = bodyInfo ? bodyInfo.age + " yrs" : "-";
  document.getElementById("p-height").textContent = bodyInfo ? bodyInfo.height + " cm" : "-";
  document.getElementById("p-weight").textContent = bodyInfo ? bodyInfo.weight + " kg" : "-";
  document.getElementById("p-activity").textContent = bodyInfo?.activityLabel || "Not set yet";
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageData = e.target.result;
    const zone = document.getElementById("upload-zone");
    zone.classList.add("has-img");
    zone.innerHTML = '<img src="' + uploadedImageData + '" alt="Selected meal"><button class="retake" onclick="resetUpload()">Retake</button>';
    document.getElementById("analyze-btn").disabled = false;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function resetUpload() {
  uploadedImageData = null;
  const zone = document.getElementById("upload-zone");
  zone.classList.remove("has-img");
  zone.innerHTML = '<div class="camera-icon"><svg viewBox="0 0 24 24"><path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/></svg></div><b>Drop in a meal photo</b><p class="muted">Use your camera or choose a gallery image.</p>';
  document.getElementById("analyze-btn").disabled = true;
}

function startAnalysis() {
  if (!uploadedImageData) return;
  go("screen-loading");
  setTimeout(() => {
    runMockAnalysis();
    go("screen-results");
  }, 1000);
}

function runMockAnalysis() {
  const foods = ["Grilled chicken bowl", "Salmon rice plate", "Avocado toast", "Beef burrito", "Greek salad", "Pasta marinara", "Egg breakfast plate"];
  const rand = (min, max) => Math.round(min + Math.random() * (max - min));
  const protein = rand(18, 58);
  const carbs = rand(22, 82);
  const fat = rand(8, 34);
  const calories = protein * 4 + carbs * 4 + fat * 9;
  currentMeal = {
    name: foods[Math.floor(Math.random() * foods.length)],
    calories,
    protein,
    carbs,
    fat,
    time: currentTime()
  };
  document.getElementById("preview-img").src = uploadedImageData;
  document.getElementById("result-name").textContent = currentMeal.name;
  document.getElementById("result-weight").textContent = "Estimated from your photo · about " + rand(220, 520) + "g";
  document.getElementById("r-cal").textContent = calories + " kcal";
  document.getElementById("r-protein").textContent = protein + "g";
  document.getElementById("r-carbs").textContent = carbs + "g";
  document.getElementById("r-fat").textContent = fat + "g";
}

function saveCurrentMeal() {
  if (!currentMeal) return;
  mealHistory.push(currentMeal);
  currentMeal = null;
  resetUpload();
  go("screen-home");
}

function addManualMeal() {
  const name = document.getElementById("manual-name").value.trim() || "Manual meal";
  const protein = num("manual-protein");
  const carbs = num("manual-carbs");
  const fat = num("manual-fat");
  const typedCalories = num("manual-cal");
  const calories = typedCalories || protein * 4 + carbs * 4 + fat * 9;
  if (!calories) return;
  mealHistory.push({ name, calories, protein, carbs, fat, time: currentTime() });
  ["manual-name", "manual-cal", "manual-protein", "manual-carbs", "manual-fat"].forEach((id) => document.getElementById(id).value = "");
  go("screen-home");
}

function clearMeals() {
  mealHistory = [];
  renderHistory();
  renderDashboard();
}

function syncGoalSelection() {
  document.querySelectorAll(".goal-card").forEach((card) => {
    card.classList.toggle("sel", card.dataset.goal === selectedGoalType);
  });
}

function selGoalType(type, btn) {
  selectedGoalType = type;
  document.querySelectorAll(".goal-card").forEach((card) => card.classList.remove("sel"));
  btn.classList.add("sel");
}

function buildDietPlan() {
  if (!bodyInfo || !dailyTargets) {
    go("screen-stats");
    return;
  }
  const goalWeight = parseFloat(document.getElementById("in-goal-weight").value);
  if (!goalWeight || goalWeight < 30 || goalWeight > 300) return;
  const style = document.getElementById("plan-style").value;
  const maintenance = dailyTargets.calories;
  const currentWeight = bodyInfo.weight;
  const goalDeltaKg = goalWeight - currentWeight;
  const targetWeeks = 8;
  const weeklyTargetRateKg = selectedGoalType === "cutting"
    ? Math.min(-0.25, Math.max(-0.55, goalDeltaKg / targetWeeks))
    : selectedGoalType === "bulking"
      ? Math.max(0.25, Math.min(0.55, goalDeltaKg / targetWeeks))
      : 0;
  const weeklyChangeKcal = weeklyTargetRateKg * 7700;
  const dailyAdjustment = Math.round(weeklyChangeKcal / 7);
  let calories = maintenance + dailyAdjustment;
  if (selectedGoalType === "cutting") {
    calories = Math.max(1300, maintenance + dailyAdjustment);
  } else if (selectedGoalType === "bulking") {
    calories = maintenance + dailyAdjustment + 120;
  } else {
    calories = maintenance;
  }
  const protein = Math.round(currentWeight * (selectedGoalType === "bulking" ? 2.1 : 1.9));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  dailyTargets = { calories, protein, carbs, fat };
  renderTargets();
  const plan = generateWeeklyPlan(style, selectedGoalType, calories, protein, carbs, fat);
  const goalLabel = selectedGoalType === "fit" ? "Maintenance" : selectedGoalType[0].toUpperCase() + selectedGoalType.slice(1);
  document.getElementById("diet-output").innerHTML = `
    <div class="plan-summary">
      <div><span>Goal</span><b>${goalLabel}</b></div>
      <div><span>Daily calories</span><b>${calories} kcal</b></div>
      <div><span>Macros</span><b>P ${protein}g · C ${carbs}g · F ${fat}g</b></div>
      <div><span>Goal weight</span><b>${goalWeight} kg</b></div>
      <div><span>Weekly pace</span><b>${selectedGoalType === "cutting" ? "~0.55 kg" : selectedGoalType === "bulking" ? "~0.35 kg" : "~0.0 kg"}</b></div>
    </div>
    <div class="week-plan">
      ${plan.map((day) => `
        <article class="day-plan">
          <span>${day.day}</span>
          <h3>${day.focus}</h3>
          <ul>
            <li><b>Breakfast:</b> ${day.meals.breakfast}</li>
            <li><b>Lunch:</b> ${day.meals.lunch}</li>
            <li><b>Dinner:</b> ${day.meals.dinner}</li>
            <li><b>Snack:</b> ${day.meals.snack}</li>
          </ul>
          <div class="day-total">
            <span>${day.calories} kcal</span>
            <span>P ${day.protein}g</span>
            <span>C ${day.carbs}g</span>
            <span>F ${day.fat}g</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function generateWeeklyPlan(style, goal, calories, protein, carbs, fat) {
  const libraries = {
    balanced: [
      ["Greek yogurt, oats, berries, honey", "Chicken rice bowl with vegetables", "Salmon, potatoes, asparagus", "Apple with peanut butter"],
      ["Eggs, wholegrain toast, avocado", "Turkey wrap with salad", "Lean beef pasta with tomato sauce", "Cottage cheese and pineapple"],
      ["Protein smoothie with banana", "Tuna quinoa salad", "Chicken fajita plate", "Rice cakes with almond butter"],
      ["Omelet with mushrooms and spinach", "Chicken couscous bowl", "Shrimp rice noodles", "Greek yogurt with walnuts"],
      ["Overnight oats with protein", "Beef burrito bowl", "Turkey meatballs with rice", "Boiled eggs and fruit"],
      ["Toast with eggs and fruit", "Salmon salad with pita", "Chicken curry with basmati rice", "Protein pudding"],
      ["Cottage cheese toast", "Steak potato bowl", "Cod, rice, mixed vegetables", "Trail mix and fruit"]
    ],
    simple: [
      ["Protein oats", "Chicken, rice, frozen vegetables", "Turkey pasta", "Greek yogurt"],
      ["Scrambled eggs and toast", "Tuna sandwich and fruit", "Beef mince rice bowl", "Protein bar"],
      ["Smoothie and banana", "Chicken wrap", "Salmon potatoes", "Cottage cheese"],
      ["Oats and whey", "Turkey rice bowl", "Chicken noodles", "Apple and nuts"],
      ["Egg toast", "Meal-prep chicken bowl", "Lean burger plate", "Yogurt and berries"],
      ["Cereal with protein milk", "Tuna pasta salad", "Beef burrito bowl", "Rice cakes"],
      ["Greek yogurt oats", "Chicken pita", "Turkey chili", "Protein shake"]
    ],
    mediterranean: [
      ["Greek yogurt, figs, walnuts", "Chicken shawarma bowl", "Sea bass, rice, Greek salad", "Hummus and carrots"],
      ["Eggs with tomato and feta", "Tuna chickpea salad", "Turkey kofta with bulgur", "Labneh toast"],
      ["Oats with dates and almonds", "Chicken tabbouleh bowl", "Salmon with couscous", "Fruit and yogurt"],
      ["Feta omelet and olives", "Lean beef pita bowl", "Shrimp tomato pasta", "Cottage cheese fruit"],
      ["Protein yogurt parfait", "Chicken hummus plate", "Turkey stuffed peppers", "Nuts and orange"],
      ["Avocado egg toast", "Salmon quinoa salad", "Chicken kebab rice", "Greek yogurt honey"],
      ["Cottage cheese, honey, berries", "Tuna pita and salad", "Cod with potatoes", "Hummus rice cakes"]
    ],
    highProtein: [
      ["Egg whites, oats, berries", "Double chicken rice bowl", "Steak, potatoes, broccoli", "Protein shake"],
      ["Greek yogurt protein bowl", "Turkey quinoa bowl", "Salmon with rice", "Cottage cheese"],
      ["Chicken omelet wrap", "Tuna pasta salad", "Lean beef chili", "Protein pudding"],
      ["Whey oats and banana", "Chicken burrito bowl", "Turkey burgers with potatoes", "Boiled eggs"],
      ["Eggs and smoked salmon toast", "Steak salad with rice", "Chicken stir-fry noodles", "Greek yogurt"],
      ["Cottage cheese pancakes", "Turkey rice meal prep", "Cod with couscous", "Protein bar"],
      ["Protein smoothie bowl", "Chicken pita plate", "Lean beef pasta", "Tuna cucumber bites"]
    ]
  };
  const focuses = goal === "cutting"
    ? ["High-volume meals", "Lean protein", "Fiber focus", "Controlled carbs", "Light dinner", "Meal prep day", "Balanced reset"]
    : goal === "bulking"
      ? ["Calorie surplus", "Training fuel", "Protein spread", "Carb support", "Recovery meals", "Dense calories", "Lean bulk reset"]
      : ["Balanced start", "Steady energy", "Protein anchor", "Colorful plates", "Simple routine", "Flexible meals", "Weekly reset"];

  return (libraries[style] || libraries.balanced).map((meals, index) => {
    const calorieShift = (index % 3 - 1) * 70;
    return {
      day: "Day " + (index + 1),
      focus: focuses[index],
      meals: { breakfast: meals[0], lunch: meals[1], dinner: meals[2], snack: meals[3] },
      calories: Math.max(1200, calories + calorieShift),
      protein: Math.max(50, protein + (index % 2 ? 4 : -2)),
      carbs: Math.max(40, carbs + (index % 3 - 1) * 10),
      fat: Math.max(25, fat + (index % 2 ? -3 : 2))
    };
  });
}

function num(id) {
  return Math.max(0, Math.round(parseFloat(document.getElementById(id).value) || 0));
}

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

renderNav();
document.addEventListener("DOMContentLoaded", () => {
  updateNav("screen-home");
  if (currentUser) {
    go("screen-home");
  }
});

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
