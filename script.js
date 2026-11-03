// ---------- Who is logged in ----------
// Each account has its own tasks and reminders, saved under its own email
const user = Planberry.requireUser();
const TASKS_KEY = "tasks:" + user.email;
const REMINDED_KEY = "reminded:" + user.email;
const STREAK_KEY = "streak:" + user.email;

document.getElementById("User-name").textContent = user.name;
document.getElementById("Logout-btn").addEventListener("click", function () {
  Planberry.logOut();
});

const taskForm = document.getElementById("Task-form");
const taskInput = document.getElementById("Task-input");
const taskDescription = document.getElementById("Task-description");
const taskDue = document.getElementById("Task-due");
const taskTime = document.getElementById("Task-time");
const taskCategory = document.getElementById("Task-category");
const taskPriority = document.getElementById("Task-priority");
const taskList = document.getElementById("Task-list");
const taskCount = document.getElementById("Task-count");
const progressBox = document.getElementById("Progress");
const progressBar = document.getElementById("Progress-bar");
const streakNote = document.getElementById("Streak");
const emptyNote = document.getElementById("Empty-note");
const reminderBtn = document.getElementById("Reminder-btn");
const reminderNote = document.getElementById("Reminder-note");
const searchInput = document.getElementById("Search-input");
const filterButtons = document.querySelectorAll("#Filter-buttons button");
const categoryFilter = document.getElementById("Category-filter");
const sortSelect = document.getElementById("Sort-select");
const cancelBtn = document.getElementById("Cancel-edit");
const clearBtn = document.getElementById("Clear-completed");
const backupBtn = document.getElementById("Backup-btn");
const restoreBtn = document.getElementById("Restore-btn");
const restoreInput = document.getElementById("Restore-input");
const themeBtn = document.getElementById("Theme-toggle");
const soundBtn = document.getElementById("Sound-toggle");
const submitBtn = taskForm.querySelector("button[type='submit']");

let tasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
let currentFilter = "all";
let currentCategory = "all";
let currentSearch = "";
let currentSort = localStorage.getItem("sort") || "newest";
let editingId = null; // the id of the task being edited, or null

sortSelect.value = currentSort;

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ---------- Categories (each account can make its own, with colours) ----------
const CATEGORIES_KEY = "categories:" + user.email;
const DEFAULT_CATEGORIES = [
  { name: "General", color: "#6c757d" },
  { name: "School", color: "#0d6efd" },
  { name: "Work", color: "#6f42c1" },
  { name: "Home", color: "#fd7e14" },
  { name: "Personal", color: "#e63e79" },
  { name: "Health", color: "#198754" },
];
const NEW_COLORS = ["#e63e79", "#0dcaf0", "#20c997", "#ffc107", "#dc3545", "#6610f2", "#795548", "#d63384"];

let categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || DEFAULT_CATEGORIES.slice();

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

// Finds a category by name (ignores capital letters)
function findCategory(name) {
  const wanted = String(name || "").toLowerCase();
  return categories.find(function (c) { return c.name.toLowerCase() === wanted; });
}

// Adds a category if it doesn't exist yet, and returns its proper name
function ensureCategory(name, color) {
  const found = findCategory(name);
  if (found) return found.name;
  categories.push({ name: name, color: color || "#6c757d" });
  saveCategories();
  return name;
}

// Dark text on light colours, white text on dark colours
function textColorFor(hex) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#222" : "#fff";
}

// Fills both category drop-downs (keeps what was selected)
function fillCategoryLists() {
  const chosen = taskCategory.value;
  const filterChosen = categoryFilter.value;

  taskCategory.innerHTML = "";
  categoryFilter.innerHTML = "";
  categoryFilter.appendChild(new Option("All categories", "all"));
  categories.forEach(function (c) {
    taskCategory.appendChild(new Option(c.name, c.name));
    categoryFilter.appendChild(new Option(c.name, c.name));
  });

  if (findCategory(chosen)) taskCategory.value = findCategory(chosen).name;
  if (filterChosen && filterChosen !== "all" && findCategory(filterChosen)) {
    categoryFilter.value = findCategory(filterChosen).name;
  } else {
    categoryFilter.value = "all";
    currentCategory = "all";
  }
}

fillCategoryLists();

// ---------- Manage categories panel ----------
const manageBtn = document.getElementById("Manage-categories-btn");
const managerBox = document.getElementById("Category-manager");
const categoryListEl = document.getElementById("Category-list");
const newCategoryForm = document.getElementById("New-category-form");
const newCategoryName = document.getElementById("New-category-name");
const newCategoryColor = document.getElementById("New-category-color");
const categoryError = document.getElementById("Category-error");

function pickNewColor() {
  newCategoryColor.value = NEW_COLORS[categories.length % NEW_COLORS.length];
}

manageBtn.addEventListener("click", function () {
  const opening = managerBox.classList.contains("d-none");
  managerBox.classList.toggle("d-none", !opening);
  manageBtn.textContent = opening ? "🏷️ Close categories" : "🏷️ Manage categories";
  if (opening) {
    renderCategoryManager();
    pickNewColor();
    newCategoryName.focus();
  }
});

// How many tasks are in a category
function countInCategory(name) {
  return tasks.filter(function (t) { return (t.category || "General") === name; }).length;
}

function countText(count) {
  return count === 1 ? "1 task" : count + " tasks";
}

// Keeps the "3 tasks" numbers in the panel up to date
function refreshCategoryCounts() {
  categoryListEl.querySelectorAll("[data-count-for]").forEach(function (el) {
    el.textContent = countText(countInCategory(el.dataset.countFor));
  });
}

function renderCategoryManager() {
  categoryListEl.innerHTML = "";
  categories.forEach(function (cat) {
    const count = countInCategory(cat.name);

    const row = document.createElement("li");
    row.className = "category-row";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "form-control form-control-color";
    colorInput.value = cat.color;
    colorInput.title = "Change colour";
    colorInput.setAttribute("aria-label", "Colour for " + cat.name);
    colorInput.addEventListener("input", function () {
      cat.color = colorInput.value;
      saveCategories();
      renderTasks(); // updates the colours on the tasks straight away
    });

    const name = document.createElement("span");
    name.className = "flex-grow-1";
    name.textContent = cat.name;

    const countEl = document.createElement("span");
    countEl.className = "small text-body-secondary";
    countEl.dataset.countFor = cat.name;
    countEl.textContent = countText(count);

    row.appendChild(colorInput);
    row.appendChild(name);
    row.appendChild(countEl);

    // "General" can't be deleted: tasks move there when their category is deleted
    if (cat.name !== "General") {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-sm btn-outline-danger";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        const count = countInCategory(cat.name);
        const message = count > 0
          ? "Delete \"" + cat.name + "\"? Its " + count + (count === 1 ? " task" : " tasks") + " will move to General."
          : "Delete \"" + cat.name + "\"?";
        if (!confirm(message)) return;
        tasks.forEach(function (t) {
          if ((t.category || "General") === cat.name) t.category = "General";
        });
        categories = categories.filter(function (c) { return c !== cat; });
        saveCategories();
        saveTasks();
        fillCategoryLists();
        renderCategoryManager();
        renderTasks();
      });
      row.appendChild(del);
    }

    categoryListEl.appendChild(row);
  });
}

newCategoryForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = newCategoryName.value.trim().replace(/\s+/g, " ");
  categoryError.textContent = "";

  if (name === "") {
    categoryError.textContent = "Type a name for the category.";
    return;
  }
  if (name.toLowerCase() === "all" || name.toLowerCase() === "all categories") {
    categoryError.textContent = "Please choose a different name.";
    return;
  }
  if (findCategory(name)) {
    categoryError.textContent = "You already have a category called \"" + findCategory(name).name + "\".";
    return;
  }
  if (categories.length >= 20) {
    categoryError.textContent = "You can have up to 20 categories. Delete one to add another.";
    return;
  }

  categories.push({ name: name, color: newCategoryColor.value });
  saveCategories();
  fillCategoryLists();
  taskCategory.value = name; // ready to use for the next task
  newCategoryName.value = "";
  pickNewColor();
  renderCategoryManager();
  renderTasks();
});

// ---------- Dark mode ----------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

applyTheme(document.documentElement.getAttribute("data-bs-theme") || "light");

themeBtn.addEventListener("click", function () {
  const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

// ---------- Sound on / off ----------
let muted = localStorage.getItem("muted") === "1";

function updateSoundButton() {
  soundBtn.textContent = muted ? "🔇" : "🔊";
  soundBtn.setAttribute("aria-label", muted ? "Clapping sound is off. Turn it on" : "Clapping sound is on. Turn it off");
  soundBtn.title = muted ? "Clapping is off" : "Clapping is on";
}

soundBtn.addEventListener("click", function () {
  muted = !muted;
  localStorage.setItem("muted", muted ? "1" : "0");
  updateSoundButton();
});

updateSoundButton();

// ---------- Clapping sound (made in code, no file needed) ----------
let audioCtx;

function playClap() {
  if (muted) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();

  const claps = 6;   // how many claps
  const gap = 0.55;  // seconds between claps (bigger = slower)

  for (let i = 0; i < claps; i++) {
    const clapTime = audioCtx.currentTime + i * gap + Math.random() * 0.03;

    // Layer a few "hands" together so each clap sounds full and warm
    for (let h = 0; h < 4; h++) {
      const start = clapTime + Math.random() * 0.025;
      const length = Math.floor(audioCtx.sampleRate * 0.18);

      const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < length; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2.5);
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 700 + Math.random() * 900; // lower = warmer
      filter.Q.value = 0.7;

      const gain = audioCtx.createGain();
      gain.gain.value = (0.3 + Math.random() * 0.15) * (1 - i * 0.06); // fades slightly

      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(start);
    }
  }
}

// ---------- Helpers ----------
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_BADGE = { high: "text-bg-danger", medium: "text-bg-warning", low: "text-bg-success" };

// Today as YYYY-MM-DD in the user's own time zone
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

function formatDate(iso) {
  const parts = iso.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// "5:30 PM" from "17:30"
function formatTime(time) {
  const parts = time.split(":").map(Number);
  return new Date(2000, 0, 1, parts[0], parts[1]).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// "Nov 4, 2026" or "Nov 4, 2026 at 5:30 PM"
function formatDue(task) {
  return formatDate(task.dueDate) + (task.dueTime ? " at " + formatTime(task.dueTime) : "");
}

// The exact moment a task is due. With no time set, it is due at the end of that day.
function dueMoment(task) {
  if (!task.dueDate) return null;
  return new Date(task.dueDate + "T" + (task.dueTime || "23:59"));
}

// ---------- Progress bar ----------
function renderProgress(doneCount) {
  if (tasks.length === 0) {
    progressBox.classList.add("d-none");
    return;
  }
  const percent = Math.round((doneCount / tasks.length) * 100);
  progressBox.classList.remove("d-none");
  progressBox.setAttribute("aria-valuenow", percent);
  progressBar.style.width = percent + "%";
  progressBar.classList.toggle("all-done", percent === 100);
  if (percent === 100) taskCount.textContent += " 🎉 All done!";
}

// ---------- Streak (days in a row with at least one task finished) ----------
// Saved separately from the tasks, so "Clear completed" doesn't break the streak
let streakDays = JSON.parse(localStorage.getItem(STREAK_KEY)) || [];

function markDoneToday() {
  const today = todayString();
  if (streakDays.indexOf(today) === -1) {
    streakDays.push(today);
    localStorage.setItem(STREAK_KEY, JSON.stringify(streakDays));
  }
}

// "2026-11-03" -> "2026-11-02"
function dayBefore(iso) {
  const parts = iso.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] - 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function currentStreak() {
  let day = todayString();
  // Not done anything yet today? The streak is still alive from yesterday.
  if (streakDays.indexOf(day) === -1) day = dayBefore(day);
  let count = 0;
  while (streakDays.indexOf(day) !== -1) {
    count++;
    day = dayBefore(day);
  }
  return count;
}

function bestStreak() {
  const days = streakDays.slice().sort();
  let best = 0;
  let run = 0;
  days.forEach(function (day, i) {
    run = (i > 0 && dayBefore(day) === days[i - 1]) ? run + 1 : 1;
    if (run > best) best = run;
  });
  return best;
}

function renderStreak() {
  const streak = currentStreak();
  const doneToday = streakDays.indexOf(todayString()) !== -1;
  const best = bestStreak();
  const dayWord = streak === 1 ? "day" : "days";
  const bestText = best > streak ? " (best: " + best + " days)" : "";

  if (streak === 0) {
    streakNote.textContent = "🔥 Finish a task today to start a streak!" + (best > 0 ? " Your best: " + best + " days." : "");
  } else if (doneToday) {
    streakNote.textContent = "🔥 " + streak + " " + dayWord + " in a row! You're done for today ✅" + bestText;
  } else {
    streakNote.textContent = "🔥 " + streak + " " + dayWord + " in a row! Finish a task today to keep it going." + bestText;
  }
}

// ---------- Undo delete ----------
// After deleting, an "Undo" button shows for 7 seconds
const undoBar = document.getElementById("Undo-bar");
const undoText = document.getElementById("Undo-text");
const undoBtn = document.getElementById("Undo-btn");
let undoItems = []; // the deleted tasks, and where they were in the list
let undoTimer = null;

function offerUndo(items, message) {
  undoItems = items;
  undoText.textContent = message;
  undoBar.classList.remove("d-none");
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, 7000);
}

function hideUndo() {
  undoBar.classList.add("d-none");
  undoItems = [];
}

undoBtn.addEventListener("click", function () {
  // Put each task back in the same place it was
  undoItems
    .sort(function (a, b) { return a.index - b.index; })
    .forEach(function (item) {
      tasks.splice(Math.min(item.index, tasks.length), 0, item.task);
    });
  hideUndo();
  saveTasks();
  renderTasks();
});

// ---------- Voice input ----------
// Works in Chrome and Edge (needs internet). The 🎤 button stays hidden in browsers that can't do it.
const voiceBtn = document.getElementById("Voice-btn");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognizer = new SpeechRecognition();
  recognizer.lang = navigator.language || "en-US";
  recognizer.interimResults = true; // shows the words as you speak
  let listening = false;

  voiceBtn.classList.remove("d-none");

  voiceBtn.addEventListener("click", function () {
    if (listening) {
      recognizer.stop();
      return;
    }
    try { recognizer.start(); } catch (e) {}
  });

  recognizer.onstart = function () {
    listening = true;
    voiceBtn.textContent = "🔴";
    voiceBtn.classList.add("listening");
    taskInput.placeholder = "Listening... say your task";
  };

  recognizer.onresult = function (event) {
    let text = "";
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
    }
    text = text.trim();
    taskInput.value = text.charAt(0).toUpperCase() + text.slice(1);
  };

  recognizer.onerror = function (event) {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      alert("Planberry can't use your microphone. Allow microphone access in your browser's site settings.");
    } else if (event.error === "network") {
      alert("Voice input needs an internet connection.");
    }
  };

  recognizer.onend = function () {
    listening = false;
    voiceBtn.textContent = "🎤";
    voiceBtn.classList.remove("listening");
    taskInput.placeholder = "What needs to be done?";
    taskInput.focus();
  };
}

// Puts the form back to "add a new task" mode
function resetForm() {
  editingId = null;
  taskForm.reset();
  submitBtn.textContent = "Add";
  cancelBtn.classList.add("d-none");
}

// ---------- Drawing the list ----------
function renderTasks() {
  taskList.innerHTML = "";
  const today = todayString();

  // Counter
  const doneCount = tasks.filter(function (t) { return t.completed; }).length;
  taskCount.textContent = tasks.length === 0
    ? "No tasks yet"
    : doneCount + " of " + tasks.length + " tasks done";
  renderProgress(doneCount);
  renderStreak();
  refreshCategoryCounts();

  // 1. Filter by status, category and search words
  const words = currentSearch.trim().toLowerCase();
  const visibleTasks = tasks.filter(function (task) {
    if (currentFilter === "pending" && task.completed) return false;
    if (currentFilter === "completed" && !task.completed) return false;
    if (currentCategory !== "all" && (task.category || "General") !== currentCategory) return false;
    if (words) {
      const haystack = (task.title + " " + (task.description || "")).toLowerCase();
      if (haystack.indexOf(words) === -1) return false;
    }
    return true;
  });

  // 2. Sort (works on the filtered copy, so saved order is never changed)
  visibleTasks.sort(function (a, b) {
    if (currentSort === "oldest") return a.createdAt - b.createdAt;
    if (currentSort === "az") return a.title.localeCompare(b.title);
    if (currentSort === "za") return b.title.localeCompare(a.title);
    if (currentSort === "due") {
      // Tasks with no due date go to the bottom
      if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return (a.dueDate + " " + (a.dueTime || "23:59")).localeCompare(b.dueDate + " " + (b.dueTime || "23:59"));
    }
    if (currentSort === "priority") {
      const diff = PRIORITY_RANK[a.priority || "medium"] - PRIORITY_RANK[b.priority || "medium"];
      return diff !== 0 ? diff : b.createdAt - a.createdAt;
    }
    return b.createdAt - a.createdAt; // newest first
  });

  emptyNote.classList.toggle("d-none", !(tasks.length > 0 && visibleTasks.length === 0));

  visibleTasks.forEach(function (task) {
    const priority = task.priority || "medium";
    const category = findCategory(task.category) ? findCategory(task.category).name : "General";
    const categoryColor = findCategory(category) ? findCategory(category).color : "#6c757d";

    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-start";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input me-2 mt-2";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", function () {
      task.completed = checkbox.checked;
      if (checkbox.checked) {
        playClap();
        markDoneToday();
      }
      saveTasks();
      renderTasks();
    });

    // Title + priority badge + category badge
    const text = document.createElement("div");

    const titleRow = document.createElement("div");
    const titleEl = document.createElement("strong");
    titleEl.textContent = task.title;
    if (task.completed) titleEl.classList.add("text-decoration-line-through");

    const badge = document.createElement("span");
    badge.className = "badge ms-2 " + PRIORITY_BADGE[priority];
    badge.textContent = PRIORITY_LABEL[priority];

    const catBadge = document.createElement("span");
    catBadge.className = "badge fw-normal ms-1";
    catBadge.style.backgroundColor = categoryColor;
    catBadge.style.color = textColorFor(categoryColor);
    catBadge.textContent = category;

    titleRow.appendChild(titleEl);
    titleRow.appendChild(badge);
    titleRow.appendChild(catBadge);
    text.appendChild(titleRow);

    // Description
    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "small";
      desc.textContent = task.description;
      text.appendChild(desc);
    }

    // Due date (red if overdue, orange if today)
    if (task.dueDate) {
      const due = document.createElement("div");
      due.className = "small";
      if (!task.completed && dueMoment(task) < new Date()) {
        due.classList.add("text-danger", "fw-semibold");
        due.textContent = "Overdue: " + formatDue(task);
      } else if (!task.completed && task.dueDate === today) {
        due.classList.add("due-today");
        due.textContent = "Due today" + (task.dueTime ? " at " + formatTime(task.dueTime) : "");
      } else {
        due.textContent = "Due: " + formatDue(task);
      }
      text.appendChild(due);
    }

    const left = document.createElement("div");
    left.className = "d-flex align-items-start";
    left.appendChild(checkbox);
    left.appendChild(text);

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn btn-sm btn-outline-secondary me-2";
    editBtn.addEventListener("click", function () {
      editingId = task.id;
      taskInput.value = task.title;
      taskDescription.value = task.description || "";
      taskDue.value = task.dueDate || "";
      taskTime.value = task.dueTime || "";
      taskCategory.value = category;
      taskPriority.value = priority;
      submitBtn.textContent = "Save changes";
      cancelBtn.classList.remove("d-none");
      taskInput.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn btn-sm btn-danger";
    deleteBtn.addEventListener("click", function () {
      if (editingId === task.id) resetForm();
      const index = tasks.findIndex(function (t) { return t.id === task.id; });
      if (index === -1) return;
      tasks.splice(index, 1);
      saveTasks();
      renderTasks();
      offerUndo([{ task: task, index: index }], "Task deleted");
    });

    const buttons = document.createElement("div");
    buttons.className = "d-flex flex-shrink-0 ms-2";
    buttons.appendChild(editBtn);
    buttons.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(buttons);
    taskList.appendChild(li);
  });
}

// ---------- Add or edit a task ----------
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (title === "") return;

  const details = {
    title: title,
    description: taskDescription.value.trim(),
    dueDate: taskDue.value,
    dueTime: taskDue.value ? taskTime.value : "", // a time only makes sense with a date
    category: taskCategory.value,
    priority: taskPriority.value,
  };

  if (editingId !== null) {
    // Update the existing task
    const task = tasks.find(function (t) {
      return t.id === editingId;
    });
    Object.assign(task, details);
  } else {
    // Add a new task
    tasks.push(Object.assign({
      id: Date.now(),
      completed: false,
      createdAt: Date.now(),
    }, details));
  }

  resetForm();
  saveTasks();
  renderTasks();
  checkReminders();
});

cancelBtn.addEventListener("click", resetForm);

// ---------- Search, filters and sort ----------
searchInput.addEventListener("input", function () {
  currentSearch = searchInput.value;
  renderTasks();
});

filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    filterButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    button.classList.add("active");
    renderTasks();
  });
});

categoryFilter.addEventListener("change", function () {
  currentCategory = categoryFilter.value;
  renderTasks();
});

sortSelect.addEventListener("change", function () {
  currentSort = sortSelect.value;
  localStorage.setItem("sort", currentSort); // remember the choice
  renderTasks();
});

// ---------- Clear completed ----------
clearBtn.addEventListener("click", function () {
  const removed = [];
  tasks.forEach(function (t, i) {
    if (t.completed) removed.push({ task: t, index: i });
  });
  if (removed.length === 0) return;
  if (editingId !== null && tasks.some(function (t) { return t.id === editingId && t.completed; })) {
    resetForm();
  }
  tasks = tasks.filter(function (t) {
    return !t.completed;
  });
  saveTasks();
  renderTasks();
  offerUndo(removed, removed.length === 1 ? "1 completed task cleared" : removed.length + " completed tasks cleared");
});

// ---------- Backup and restore ----------
backupBtn.addEventListener("click", function () {
  const backup = {
    app: "planberry",
    version: 1,
    savedAt: new Date().toISOString(),
    tasks: tasks,
    categories: categories,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "planberry-backup-" + todayString() + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
});

// Turns one item from a backup file into a safe, complete task (or null if it isn't usable)
function cleanTask(item, index) {
  if (!item || typeof item.title !== "string" || item.title.trim() === "") return null;

  const hasDate = typeof item.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate);
  const hasTime = hasDate && typeof item.dueTime === "string" && /^\d{2}:\d{2}$/.test(item.dueTime);

  return {
    id: typeof item.id === "number" ? item.id : Date.now() + index,
    title: item.title.trim().slice(0, 200),
    description: typeof item.description === "string" ? item.description.trim().slice(0, 1000) : "",
    completed: item.completed === true,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now() + index,
    dueDate: hasDate ? item.dueDate : "",
    dueTime: hasTime ? item.dueTime : "",
    category: typeof item.category === "string" && item.category.trim() !== ""
      ? item.category.trim().slice(0, 20)
      : "General",
    priority: PRIORITY_RANK[item.priority] !== undefined ? item.priority : "medium",
  };
}

restoreBtn.addEventListener("click", function () {
  restoreInput.click();
});

restoreInput.addEventListener("change", function () {
  const file = restoreInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      const list = Array.isArray(data) ? data : data.tasks;
      if (!Array.isArray(list)) throw new Error("Not a backup");

      const cleaned = list.map(cleanTask).filter(Boolean);
      if (list.length > 0 && cleaned.length === 0) throw new Error("No usable tasks");

      // Make sure no two tasks share an id
      const used = new Set();
      cleaned.forEach(function (task) {
        while (used.has(task.id)) task.id++;
        used.add(task.id);
      });

      if (!confirm("Restore this backup? It will replace your current " + tasks.length +
          " tasks with " + cleaned.length + " tasks from the file.")) return;

      // Bring back the categories (and colours) saved in the backup
      if (data && Array.isArray(data.categories)) {
        data.categories.forEach(function (c) {
          if (c && typeof c.name === "string" && c.name.trim() !== "") {
            const color = /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#6c757d";
            ensureCategory(c.name.trim().slice(0, 20), color);
          }
        });
      }
      // Any other category a task uses gets created too
      cleaned.forEach(function (task) {
        task.category = ensureCategory(task.category);
      });

      tasks = cleaned;
      fillCategoryLists();
      resetForm();
      saveTasks();
      renderTasks();
      alert("Done! Restored " + cleaned.length + " tasks.");
    } catch (e) {
      alert("That file isn't a Planberry backup, so nothing was changed.");
    }
  };
  reader.readAsText(file);
  restoreInput.value = ""; // lets you pick the same file again later
});

// ---------- Reminders (notifications) ----------
// Remembers which reminders were already sent, so people aren't spammed
let reminded = JSON.parse(localStorage.getItem(REMINDED_KEY)) || {};

function showNotification(title, body, tag) {
  const options = { body: body, icon: "icon-192.png", tag: tag };
  const fallback = function () {
    try {
      new Notification(title, options);
    } catch (e) {}
  };
  // Phones need the service worker to show notifications
  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg) reg.showNotification(title, options);
      else fallback();
    }).catch(fallback);
  } else {
    fallback();
  }
}

function checkReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const today = todayString();
  let changed = false;

  tasks.forEach(function (task) {
    if (task.completed || !task.dueDate) return;

    const moment = dueMoment(task);
    const sent = reminded[task.id] || {};

    if (moment <= now) {
      // Past due and still not done: remind once a day
      if (sent.overdue !== today) {
        showNotification("Not done yet: " + task.title, "This was due " + formatDue(task) + ".", "overdue-" + task.id);
        sent.overdue = today;
        changed = true;
      }
    } else if (task.dueTime && moment - now <= 30 * 60 * 1000) {
      // Due within the next 30 minutes
      const key = task.dueDate + " " + task.dueTime;
      if (sent.soon !== key) {
        showNotification("Coming up: " + task.title, "Due at " + formatTime(task.dueTime) + ".", "soon-" + task.id);
        sent.soon = key;
        changed = true;
      }
    } else if (!task.dueTime && task.dueDate === today) {
      // Due today, no time set
      if (sent.today !== today) {
        showNotification("Due today: " + task.title, "Don't forget to finish it.", "today-" + task.id);
        sent.today = today;
        changed = true;
      }
    }

    reminded[task.id] = sent;
  });

  if (changed) localStorage.setItem(REMINDED_KEY, JSON.stringify(reminded));
}

function updateReminderUI() {
  if (!("Notification" in window)) {
    reminderBtn.classList.add("d-none");
    reminderNote.textContent = "Reminders aren't supported in this browser.";
  } else if (Notification.permission === "granted") {
    reminderBtn.classList.add("d-none");
    reminderNote.textContent = "🔔 Reminders are on. Keep Planberry open to receive them.";
  } else if (Notification.permission === "denied") {
    reminderBtn.classList.add("d-none");
    reminderNote.textContent = "Notifications are blocked. Turn them on in your browser's site settings.";
  } else {
    reminderBtn.classList.remove("d-none");
    reminderNote.textContent = "";
  }
}

reminderBtn.addEventListener("click", function () {
  Notification.requestPermission().then(function () {
    updateReminderUI();
    checkReminders();
  });
});

// Check every minute, and whenever the person comes back to the app
setInterval(function () {
  checkReminders();
  renderTasks(); // keeps "Overdue" labels up to date
}, 60 * 1000);

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    checkReminders();
    renderTasks();
  }
});

renderTasks();
updateReminderUI();
checkReminders();

// ---------- Makes it installable as an app ----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}