"use strict";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyiAJ2pfxwqGBMs_F9xXTYABjOdMmZIJZEQF50yQWY9_vSRNuogpfqOoFolXgT4ZeXV/exec";
const TURNSTILE_ENABLED = false;
const TURNSTILE_SITE_KEY = "PASTE_YOUR_TURNSTILE_SITE_KEY_HERE";

const form = document.getElementById("membership-form");
const submitButton = document.getElementById("submit-application");
const formStatus = document.getElementById("form-status");
const formStatusTitle = document.getElementById("form-status-title");
const formStatusMessage = document.getElementById("form-status-message");
const formStatusFollowup = document.getElementById("form-status-followup");
const errorSummary = document.getElementById("form-error-summary");
const errorList = document.getElementById("error-list");
const startedAtInput = document.getElementById("form-started-at");
const ageModeInputs = Array.from(form.querySelectorAll('input[name="ageMode"]'));
const ageInput = document.getElementById("age");
const dobInput = document.getElementById("date-of-birth");
const turnstileArea = document.getElementById("turnstile-area");
const emailInput = document.getElementById("email");
const sendEmailCodeButton = document.getElementById("send-email-code");
const verifyEmailCodeButton = document.getElementById("verify-email-code");
const editEmailButton = document.getElementById("edit-email");
const emailCodeInput = document.getElementById("email-code");
const emailOtp = document.getElementById("email-otp");
const emailOtpStatus = document.getElementById("email-otp-status");
const emailOtpCountdown = document.getElementById("email-otp-countdown");
const emailVerifiedBadge = document.getElementById("email-verified-badge");
const enhancedSelects = ["gender", "province", "current-status"].map(enhanceSelect);
const provinceSelect = document.getElementById("province-value");
const districtTrigger = document.getElementById("district");
const districtSelect = document.getElementById("district-value");
if (districtTrigger) {
  districtTrigger.readOnly = true;
  districtTrigger.setAttribute("inputmode", "none");
}
const districtOptions = document.getElementById("district-options");
const districtOptionList = document.getElementById("district-option-list");
const districtNoResults = document.getElementById("district-no-results");
const membershipTranslations = window.YNAN_TRANSLATIONS;
const districtsByProvince = {
  Koshi: [
    ["Bhojpur", "भोजपुर"], ["Dhankuta", "धनकुटा"], ["Ilam", "इलाम"], ["Jhapa", "झापा"],
    ["Khotang", "खोटाङ"], ["Morang", "मोरङ"], ["Okhaldhunga", "ओखलढुङ्गा"], ["Panchthar", "पाँचथर"],
    ["Sankhuwasabha", "सङ्खुवासभा"], ["Solukhumbu", "सोलुखुम्बु"], ["Sunsari", "सुनसरी"],
    ["Taplejung", "ताप्लेजुङ"], ["Terhathum", "तेह्रथुम"], ["Udayapur", "उदयपुर"]
  ],
  Madhesh: [
    ["Bara", "बारा"], ["Dhanusha", "धनुषा"], ["Mahottari", "महोत्तरी"], ["Parsa", "पर्सा"],
    ["Rautahat", "रौतहट"], ["Saptari", "सप्तरी"], ["Sarlahi", "सर्लाही"], ["Siraha", "सिराहा"]
  ],
  Bagmati: [
    ["Bhaktapur", "भक्तपुर"], ["Chitwan", "चितवन"], ["Dhading", "धादिङ"], ["Dolakha", "दोलखा"],
    ["Kathmandu", "काठमाडौं"], ["Kavrepalanchok", "काभ्रेपलाञ्चोक"], ["Lalitpur", "ललितपुर"],
    ["Makwanpur", "मकवानपुर"], ["Nuwakot", "नुवाकोट"], ["Ramechhap", "रामेछाप"],
    ["Rasuwa", "रसुवा"], ["Sindhuli", "सिन्धुली"], ["Sindhupalchok", "सिन्धुपाल्चोक"]
  ],
  Gandaki: [
    ["Baglung", "बागलुङ"], ["Gorkha", "गोरखा"], ["Kaski", "कास्की"], ["Lamjung", "लमजुङ"],
    ["Manang", "मनाङ"], ["Mustang", "मुस्ताङ"], ["Myagdi", "म्याग्दी"],
    ["Nawalpur (Nawalparasi East)", "नवलपुर (नवलपरासी पूर्व)"], ["Parbat", "पर्वत"],
    ["Syangja", "स्याङ्जा"], ["Tanahun", "तनहुँ"]
  ],
  Lumbini: [
    ["Arghakhanchi", "अर्घाखाँची"], ["Banke", "बाँके"], ["Bardiya", "बर्दिया"], ["Dang", "दाङ"],
    ["Gulmi", "गुल्मी"], ["Kapilvastu", "कपिलवस्तु"], ["Nawalparasi West (Parasi)", "नवलपरासी पश्चिम (परासी)"],
    ["Palpa", "पाल्पा"], ["Pyuthan", "प्युठान"], ["Rolpa", "रोल्पा"], ["Rukum East", "रुकुम पूर्व"],
    ["Rupandehi", "रुपन्देही"]
  ],
  Karnali: [
    ["Dailekh", "दैलेख"], ["Dolpa", "डोल्पा"], ["Humla", "हुम्ला"], ["Jajarkot", "जाजरकोट"],
    ["Jumla", "जुम्ला"], ["Kalikot", "कालिकोट"], ["Mugu", "मुगु"], ["Rukum West", "रुकुम पश्चिम"],
    ["Salyan", "सल्यान"], ["Surkhet", "सुर्खेत"]
  ],
  Sudurpashchim: [
    ["Achham", "अछाम"], ["Baitadi", "बैतडी"], ["Bajhang", "बझाङ"], ["Bajura", "बाजुरा"],
    ["Dadeldhura", "डडेलधुरा"], ["Darchula", "दार्चुला"], ["Doti", "डोटी"],
    ["Kailali", "कैलाली"], ["Kanchanpur", "कञ्चनपुर"]
  ]
};
const fieldTranslationKeys = {
  "full-name": "join_name",
  age: "join_age",
  "date-of-birth": "join_dob",
  gender: "join_gender",
  email: "join_email",
  phone: "join_phone",
  province: "join_province",
  district: "join_district",
  address: "join_address",
  "current-status": "join_status",
  workplace: "join_workplace",
  reason: "join_reason",
  consent: "join_consent"
};
const fieldErrorKeys = {
  "full-name": "join_error_required",
  age: "join_error_age",
  "date-of-birth": "join_error_dob",
  gender: "join_error_required",
  email: "join_error_email",
  phone: "join_error_phone",
  province: "join_error_required",
  district: "join_error_required",
  address: "join_error_required",
  "current-status": "join_error_required",
  workplace: "join_error_required",
  reason: "join_error_length",
  consent: "join_error_consent"
};
let turnstileWidgetId = null;
let isSubmitting = false;
let currentMessageKey = null;
let emailVerified = false;
let emailOtpMessageKey = "";
let otpCooldownUntil = 0;
let otpCountdownTimer = null;
let otpSent = false;
let isSendingOtp = false;
let isVerifyingOtp = false;
let suppressDistrictFocusOpen = false;

function enhanceSelect(id) {
  const select = document.getElementById(id);
  const label = document.querySelector(`label[for="${id}"]`);
  if (!select || !label) throw new Error(`Could not initialize the ${id} selector.`);
  if (!label.id) label.id = `${id}-label`;

  const picker = document.createElement("div");
  picker.className = "select-picker";
  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.className = "select-picker-input";
  input.autocomplete = "off";
  input.readOnly = true;
  input.setAttribute("inputmode", "none");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-labelledby", label.id);
  input.setAttribute("aria-describedby", select.getAttribute("aria-describedby") || "");
  input.required = select.required;
  input.setAttribute("aria-required", String(select.required));
  const chevron = document.createElement("span");
  chevron.className = "district-chevron";
  chevron.setAttribute("aria-hidden", "true");
  const menu = document.createElement("div");
  menu.className = "district-options";
  menu.id = `${id}-options`;
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-labelledby", label.id);
  menu.hidden = true;
  const list = document.createElement("div");
  list.className = "district-option-list";
  menu.append(list);

  picker.append(input, chevron, menu);
  select.before(picker);
  select.id = `${id}-value`;
  select.hidden = true;
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;
  input.setAttribute("aria-controls", list.id = `${id}-option-list`);

  const pickerState = { id, select, input, menu, list };
  function renderOptions() {
    const selectedOption = select.selectedOptions[0];
    input.value = select.value ? selectedOption.textContent : "";
    input.placeholder = select.options[0].textContent;
    list.replaceChildren();
    Array.from(select.options).slice(1).forEach((option, index) => {
      const item = document.createElement("div");
      item.className = "district-option";
      item.id = `${id}-option-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.value === select.value));
      item.dataset.value = option.value;
      item.dataset.search = option.textContent.trim().toLocaleLowerCase();
      item.textContent = option.textContent;
      list.append(item);
    });
    filterOptions();
  }
  function filterOptions() {
    const query = input.value.trim().toLocaleLowerCase();
    list.querySelectorAll('[role="option"]').forEach((option) => {
      option.hidden = !option.dataset.search.includes(query);
    });
  }
  function closeMenu() {
    menu.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    input.value = select.value ? select.selectedOptions[0].textContent : "";
    filterOptions();
  }
  function chooseOption(value, focusInput = true) {
    const option = Array.from(select.options).find((candidate) => candidate.value === value);
    if (!option || !option.value) return;
    select.value = option.value;
    closeMenu();
    if (focusInput) input.focus();
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function visibleOptions() {
    return Array.from(list.querySelectorAll('[role="option"]:not([hidden])'));
  }
  function preferredOption(options) {
    const query = input.value.trim().toLocaleLowerCase();
    return options.find((option) => option.dataset.value.toLocaleLowerCase() === query
      || option.textContent.trim().toLocaleLowerCase() === query)
      || options.find((option) => option.textContent.trim().toLocaleLowerCase().startsWith(query))
      || options[0];
  }

  input.addEventListener("focus", () => {
    input.value = "";
    renderOptions();
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
  });
  input.addEventListener("click", () => {
    if (menu.hidden) {
      renderOptions();
      menu.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
  });
  input.addEventListener("input", () => {
    select.value = "";
    list.querySelectorAll('[role="option"]').forEach((option) => option.setAttribute("aria-selected", "false"));
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
    filterOptions();
  });
  input.addEventListener("keydown", (event) => {
    const options = visibleOptions();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (menu.hidden) {
        renderOptions();
        menu.hidden = false;
        input.setAttribute("aria-expanded", "true");
      }
      const currentIndex = options.findIndex((option) => option.id === input.getAttribute("aria-activedescendant"));
      const nextIndex = currentIndex < 0
        ? (event.key === "ArrowDown" ? 0 : options.length - 1)
        : Math.max(0, Math.min(options.length - 1, currentIndex + (event.key === "ArrowDown" ? 1 : -1)));
      if (options[nextIndex]) {
        input.setAttribute("aria-activedescendant", options[nextIndex].id);
        options[nextIndex].scrollIntoView({ block: "nearest" });
      }
    } else if (event.key === "Enter" && !menu.hidden) {
      event.preventDefault();
      const active = document.getElementById(input.getAttribute("aria-activedescendant"));
      const option = active || preferredOption(options);
      if (option) chooseOption(option.dataset.value);
    } else if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      closeMenu();
    }
  });
  list.addEventListener("click", (event) => {
    const option = event.target.closest('[role="option"]');
    if (!option) return;
    event.preventDefault();
    chooseOption(option.dataset.value);
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!menu.contains(document.activeElement)) {
        const match = select.options[0] && Array.from(select.options).slice(1).find((option) =>
          option.textContent.trim().toLocaleLowerCase() === input.value.trim().toLocaleLowerCase()
          || option.value.toLocaleLowerCase() === input.value.trim().toLocaleLowerCase());
        if (match) chooseOption(match.value, false);
        else closeMenu();
      }
    }, 0);
  });
  select.addEventListener("change", renderOptions);
  window.addEventListener("ynan:languagechange", renderOptions);
  document.addEventListener("pointerdown", (event) => {
    if (!picker.contains(event.target)) closeMenu();
  });
  renderOptions();
  return pickerState;
}

function message(key) {
  const language = document.documentElement.lang === "ne" ? "ne" : "en";
  return membershipTranslations[language][key];
}

function setFormMessage(key) {
  currentMessageKey = key;
  const isSuccess = key === "join_success";
  formStatusTitle.hidden = !isSuccess;
  formStatusFollowup.hidden = !isSuccess;
  formStatusMessage.hidden = isSuccess;
  formStatusMessage.textContent = isSuccess ? "" : message(key);
  formStatus.hidden = false;
}

function clearFormMessage() {
  currentMessageKey = null;
  formStatusMessage.textContent = "";
  formStatusTitle.hidden = true;
  formStatusFollowup.hidden = true;
  formStatus.hidden = true;
}

function renderDistrictOptions(preserveSelection = true) {
  const selectedDistrict = preserveSelection ? districtSelect.value : "";
  const provinceDistricts = districtsByProvince[provinceSelect.value] || [];
  const placeholder = new Option(message("join_select_option"), "");
  placeholder.disabled = true;
  placeholder.selected = true;
  districtSelect.replaceChildren(placeholder);
  districtOptionList.replaceChildren();
  provinceDistricts.forEach(([englishName, nepaliName]) => {
    const option = new Option(document.documentElement.lang === "ne" ? nepaliName : englishName, englishName);
    districtSelect.add(option);
    const optionElement = document.createElement("div");
    optionElement.className = "district-option";
    optionElement.id = `district-option-${districtOptionList.childElementCount}`;
    optionElement.setAttribute("role", "option");
    optionElement.setAttribute("aria-selected", String(englishName === selectedDistrict));
    optionElement.dataset.value = englishName;
    optionElement.dataset.search = `${englishName} ${nepaliName}`.toLocaleLowerCase();
    optionElement.textContent = document.documentElement.lang === "ne" ? nepaliName : englishName;
    optionElement.addEventListener("click", () => selectDistrict(englishName));
    districtOptionList.append(optionElement);
  });
  filterDistrictOptions();
  districtTrigger.disabled = false;
  if (provinceDistricts.some(([englishName]) => englishName === selectedDistrict)) {
    districtSelect.value = selectedDistrict;
    const selectedOption = districtOptions.querySelector(`[data-value="${CSS.escape(selectedDistrict)}"]`);
    districtTrigger.value = selectedOption.textContent;
  } else {
    districtSelect.value = "";
    districtTrigger.value = "";
  }
  districtTrigger.removeAttribute("aria-activedescendant");
  closeDistrictOptions();
}

function openDistrictOptions() {
  if (districtTrigger.disabled) return;
  filterDistrictOptions();
  districtOptions.hidden = false;
  districtTrigger.setAttribute("aria-expanded", "true");
}

function closeDistrictOptions() {
  districtOptions.hidden = true;
  districtTrigger.setAttribute("aria-expanded", "false");
  districtTrigger.removeAttribute("aria-activedescendant");
  const selectedOption = districtSelect.selectedOptions[0];
  districtTrigger.value = districtSelect.value ? selectedOption.textContent : "";
  filterDistrictOptions();
}

function selectDistrict(value, restoreFocus = true) {
  if (districtSelect.value === value && districtOptions.hidden) return;
  districtSelect.value = value;
  const option = districtOptions.querySelector(`[data-value="${CSS.escape(value)}"]`);
  if (!option) return;
  districtTrigger.value = option.textContent;
  districtOptions.querySelectorAll('[role="option"]').forEach((item) => {
    item.setAttribute("aria-selected", String(item.dataset.value === value));
  });
  closeDistrictOptions();
  if (restoreFocus) {
    suppressDistrictFocusOpen = true;
    districtTrigger.focus();
    suppressDistrictFocusOpen = false;
  }
  districtTrigger.dispatchEvent(new Event("change", { bubbles: true }));
}

function exactDistrictMatch(value) {
  const query = value.trim().toLocaleLowerCase();
  if (!query) return null;
  const option = Array.from(districtOptionList.querySelectorAll('[role="option"]'))
    .find((item) => item.dataset.value.toLocaleLowerCase() === query
      || item.textContent.trim().toLocaleLowerCase() === query);
  return option ? option.dataset.value : null;
}

function moveDistrictActiveOption(direction) {
  const options = Array.from(districtOptionList.querySelectorAll('[role="option"]:not([hidden])'));
  if (options.length === 0) return;
  const currentIndex = options.findIndex((option) => option.id === districtTrigger.getAttribute("aria-activedescendant"));
  const nextIndex = currentIndex < 0
    ? (direction > 0 ? 0 : options.length - 1)
    : Math.max(0, Math.min(options.length - 1, currentIndex + direction));
  districtTrigger.setAttribute("aria-activedescendant", options[nextIndex].id);
  options[nextIndex].scrollIntoView({ block: "nearest" });
}

function filterDistrictOptions() {
  const query = districtTrigger.value.trim().toLocaleLowerCase();
  const provinceDistricts = districtsByProvince[provinceSelect.value] || [];
  let visibleCount = 0;
  districtOptionList.querySelectorAll('[role="option"]').forEach((option) => {
    const matches = option.dataset.search.includes(query);
    option.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  if (visibleCount === 0) {
    districtNoResults.textContent = provinceDistricts.length
      ? message("join_district_no_results")
      : message("join_district_choose_province");
  }
  districtNoResults.hidden = visibleCount > 0;
  districtTrigger.removeAttribute("aria-activedescendant");
}

function clearErrors() {
  errorList.replaceChildren();
  errorSummary.hidden = true;
  form.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
  });
  form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });
}

function setFieldError(field, translationKey, errors) {
  const error = document.getElementById(`error-${field.id}`);
  const errorText = message(translationKey);
  field.setAttribute("aria-invalid", "true");
  error.textContent = errorText;
  errors.push({ field, errorText });
}

function yearsOld(dateValue) {
  const birthDate = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== dateValue) {
    return null;
  }
  const today = nepalToday();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed = today.getUTCMonth() > birthDate.getUTCMonth()
    || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}

function nepalToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
}

function dateYearsBefore(today, years) {
  const year = today.getUTCFullYear() - years;
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const result = new Date(Date.UTC(year, month, day));
  if (result.getUTCMonth() !== month) {
    result.setTime(Date.UTC(year, month + 1, 0));
  }
  return result.toISOString().slice(0, 10);
}

function validateForm() {
  clearErrors();
  const errors = [];
  if (!emailVerified) {
    setEmailOtpStatus("join_email_not_verified", "error");
    emailInput.focus();
    return { errors, blocked: true };
  }
  const fields = [
    ["full-name", (value) => value.length > 0 && value.length <= 120],
    ["gender", (value) => ["Female", "Male", "Other", "Prefer not to say"].includes(value)],
    ["email", (value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)],
    ["phone", (value) => /^(?:\+?977)?9[6-8]\d{8}$/.test(value.replace(/[\s()-]/g, ""))],
    ["province", (value) => ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"].includes(value)],
    ["district", (value) => (districtsByProvince[provinceSelect.value] || []).some(([district]) => district === value)],
    ["address", (value) => value.length > 0 && value.length <= 300],
    ["current-status", (value) => ["Nursing student", "New graduate", "Practicing nurse", "Other"].includes(value)],
    ["workplace", (value) => value.length > 0 && value.length <= 150],
    ["reason", (value) => value.length <= 500]
  ];

  fields.forEach(([id, isValid]) => {
    const field = id === "district" ? districtTrigger : document.getElementById(id);
    const value = id === "district" ? districtSelect.value : field.value.trim();
    if (!isValid(value)) {
      const errorKey = value ? fieldErrorKeys[id] : (id === "reason" ? null : "join_error_required");
      if (errorKey) setFieldError(field, errorKey, errors);
    }
  });

  const ageMode = form.querySelector('input[name="ageMode"]:checked').value;
  if (ageMode === "age") {
    const age = Number(ageInput.value);
    if (!ageInput.value || !Number.isInteger(age) || age < 15 || age > 100) {
      setFieldError(ageInput, "join_error_age", errors);
    }
  } else {
    const age = yearsOld(dobInput.value);
    if (!age || age < 15 || age > 100) {
      setFieldError(dobInput, "join_error_dob", errors);
    }
  }

  const consent = document.getElementById("consent");
  if (!consent.checked) setFieldError(consent, "join_error_consent", errors);

  if (document.getElementById("website").value.trim()) {
    setFormMessage("join_error_honeypot");
    return { errors, blocked: true };
  }
  if (Date.now() - Number(startedAtInput.value) < 3000) {
    setFormMessage("join_error_too_fast");
    return { errors, blocked: true };
  }
  if (TURNSTILE_ENABLED && !document.getElementById("turnstile-token").value) {
    setFormMessage("join_error_turnstile");
    turnstileArea.scrollIntoView({ behavior: "smooth", block: "center" });
    return { errors, blocked: true };
  }
  return { errors, blocked: false };
}

function showValidationErrors(errors) {
  errorList.replaceChildren();
  errors.forEach(({ field, errorText }) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${field.id}`;
    link.textContent = `${message(fieldTranslationKeys[field.id])}: ${errorText}`;
    item.append(link);
    errorList.append(item);
  });
  errorSummary.hidden = false;
  errorSummary.focus();
}

function setAgeMode(mode) {
  const useAge = mode === "age";
  document.getElementById("age-input-wrap").hidden = !useAge;
  document.getElementById("dob-input-wrap").hidden = useAge;
  ageInput.required = useAge;
  ageInput.setAttribute("aria-required", String(useAge));
  dobInput.required = !useAge;
  dobInput.setAttribute("aria-required", String(!useAge));
  if (useAge) dobInput.value = "";
  else ageInput.value = "";
  clearErrors();
}

function makeRequestId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function appendQuery(url, parameters) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${parameters.toString()}`;
}

function waitForServerResult(requestId) {
  return new Promise((resolve, reject) => {
    const callbackName = `ynanMembershipStatus_${requestId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const script = document.createElement("script");
    let finished = false;
    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      if (error) reject(error);
      else resolve(result);
    };
    window[callbackName] = (result) => {
      if (result && result.ready) {
        finish(null, result);
      } else {
        script.remove();
        window.setTimeout(loadStatus, 700);
      }
    };
    script.onerror = () => finish(new Error("Could not check the application status."));
    const timeout = window.setTimeout(() => finish(new Error("The application status check timed out.")), 30000);

    function loadStatus() {
      if (finished) return;
      const query = new URLSearchParams({
        action: "status",
        requestId,
        callback: callbackName,
        _: String(Date.now())
      });
      script.src = appendQuery(APPS_SCRIPT_URL, query);
      document.head.append(script);
    }
    loadStatus();
  });
}

function getApplicationData(requestId) {
  const data = new FormData(form);
  const ageMode = data.get("ageMode");
  const ageOrDob = ageMode === "age" ? `AGE:${data.get("age")}` : `DOB:${data.get("dateOfBirth")}`;
  return {
    action: "submit",
    requestId,
    fullName: data.get("fullName").trim(),
    ageOrDob,
    gender: data.get("gender"),
    email: data.get("email").trim(),
    phone: data.get("phone").trim(),
    province: data.get("province"),
    district: data.get("district").trim(),
    address: data.get("address").trim(),
    currentStatus: data.get("currentStatus"),
    collegeWorkplace: data.get("collegeWorkplace").trim(),
    councilNumber: data.get("councilNumber").trim(),
    reason: data.get("reason").trim(),
    consent: data.get("consent") === "on" ? "true" : "false",
    website: data.get("website"),
    startedAt: data.get("startedAt"),
    turnstileToken: data.get("turnstileToken")
  };
}

async function submitApplication() {
  const requestId = makeRequestId();
  return postAction(requestId, getApplicationData(requestId));
}

async function postAction(requestId, data) {
  const payload = new URLSearchParams({ ...data, requestId });
  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    credentials: "omit",
    redirect: "follow",
    body: payload
  });
  return waitForServerResult(requestId);
}

function setEmailOtpStatus(key, state) {
  emailOtpMessageKey = key;
  emailOtpStatus.textContent = key ? message(key) : "";
  emailOtpStatus.dataset.state = state || "";
}

function otpErrorMessageKey(code, action) {
  const map = {
    OTP_WRONG: "join_otp_wrong",
    OTP_EXPIRED: "join_otp_expired",
    OTP_TOO_MANY_ATTEMPTS: "join_otp_attempts",
    OTP_COOLDOWN: "join_otp_try_later",
    OTP_HOURLY_LIMIT: "join_otp_hour_limit",
    OTP_DAILY_LIMIT: "join_otp_daily_limit",
    OTP_SEND_ERROR: "join_otp_send_error",
    EMAIL_NOT_VERIFIED: "join_email_not_verified",
    INVALID_EMAIL: "join_error_email",
    SPAM: "join_error_honeypot",
    TOO_FAST: "join_error_too_fast",
    TURNSTILE_REQUIRED: "join_error_turnstile",
    TURNSTILE_FAILED: "join_error_turnstile"
  };
  return map[code] || (action === "sendOtp" ? "join_otp_send_error" : "join_otp_verify_error");
}

function requestAbuseData() {
  return {
    website: document.getElementById("website").value,
    startedAt: startedAtInput.value,
    turnstileToken: document.getElementById("turnstile-token").value,
    language: document.documentElement.lang === "ne" ? "ne" : "en"
  };
}

function updateOtpCountdown() {
  const seconds = Math.max(0, Math.ceil((otpCooldownUntil - Date.now()) / 1000));
  if (seconds > 0) {
    sendEmailCodeButton.disabled = true;
    sendEmailCodeButton.textContent = message("join_otp_wait_button").replace("{seconds}", String(seconds));
    emailOtpCountdown.textContent = message("join_otp_countdown").replace("{seconds}", String(seconds));
    return;
  }
  window.clearInterval(otpCountdownTimer);
  otpCountdownTimer = null;
  sendEmailCodeButton.disabled = isSendingOtp || !emailInput.value.trim();
  sendEmailCodeButton.textContent = message(otpSent ? "join_resend_code" : "join_send_code");
  emailOtpCountdown.textContent = otpSent ? message("join_otp_waiting") : "";
}

async function requestEmailCode() {
  if (isSendingOtp || emailVerified) return;
  const email = emailInput.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    document.getElementById("error-email").textContent = message("join_error_email");
    emailInput.setAttribute("aria-invalid", "true");
    emailInput.focus();
    return;
  }
  if (document.getElementById("website").value.trim()) {
    setEmailOtpStatus("join_error_honeypot", "error");
    return;
  }
  if (Date.now() - Number(startedAtInput.value) < 3000) {
    setEmailOtpStatus("join_error_too_fast", "error");
    return;
  }
  if (TURNSTILE_ENABLED && !document.getElementById("turnstile-token").value) {
    setEmailOtpStatus("join_error_turnstile", "error");
    return;
  }
  if (!APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/") || APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    setEmailOtpStatus("join_error_config", "error");
    return;
  }

  isSendingOtp = true;
  sendEmailCodeButton.disabled = true;
  sendEmailCodeButton.textContent = message("join_sending");
  setEmailOtpStatus("", "");
  try {
    const requestId = makeRequestId();
    const result = await postAction(requestId, {
      action: "sendOtp",
      email,
      ...requestAbuseData()
    });
    if (!result.ok) {
      setEmailOtpStatus(otpErrorMessageKey(result.code, "sendOtp"), "error");
      if (result.code === "OTP_COOLDOWN") {
        otpCooldownUntil = Date.now() + Number(result.retryAfter || 60) * 1000;
        if (!otpCountdownTimer) otpCountdownTimer = window.setInterval(updateOtpCountdown, 250);
        updateOtpCountdown();
      }
      return;
    }
    otpSent = true;
    emailOtp.hidden = false;
    emailCodeInput.value = "";
    emailInput.dataset.otpEmail = email;
    setEmailOtpStatus("join_otp_sent", "success");
    resetTurnstileChallenge();
    otpCooldownUntil = Date.now() + 60000;
    if (otpCountdownTimer) window.clearInterval(otpCountdownTimer);
    otpCountdownTimer = window.setInterval(updateOtpCountdown, 250);
    updateOtpCountdown();
    emailCodeInput.focus();
  } catch (error) {
    console.error("Email verification code request failed.", error);
    setEmailOtpStatus("join_otp_send_error", "error");
  } finally {
    isSendingOtp = false;
    if (Date.now() >= otpCooldownUntil) updateOtpCountdown();
  }
}

async function verifyEmailCode() {
  if (isVerifyingOtp || emailVerified) return;
  const code = emailCodeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    setEmailOtpStatus("join_otp_invalid", "error");
    emailCodeInput.focus();
    return;
  }
  const email = emailInput.value.trim().toLowerCase();
  if (!email || email !== emailInput.dataset.otpEmail) {
    resetEmailVerification();
    setEmailOtpStatus("join_email_not_verified", "error");
    return;
  }
  if (!APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/") || APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    setEmailOtpStatus("join_error_config", "error");
    return;
  }

  isVerifyingOtp = true;
  verifyEmailCodeButton.disabled = true;
  verifyEmailCodeButton.textContent = message("join_sending");
  try {
    const requestId = makeRequestId();
    const result = await postAction(requestId, {
      action: "verifyOtp",
      email,
      otp: code
    });
    if (!result.ok) {
      setEmailOtpStatus(otpErrorMessageKey(result.code, "verifyOtp"), "error");
      if (["OTP_EXPIRED", "OTP_TOO_MANY_ATTEMPTS"].includes(result.code)) {
        otpSent = false;
        otpCooldownUntil = 0;
        updateOtpCountdown();
      }
      return;
    }
    emailVerified = true;
    emailInput.readOnly = true;
    emailVerifiedBadge.hidden = false;
    editEmailButton.hidden = false;
    sendEmailCodeButton.hidden = true;
    emailCodeInput.readOnly = true;
    verifyEmailCodeButton.hidden = true;
    setEmailOtpStatus("join_email_verified_notice", "success");
    submitButton.disabled = false;
  } catch (error) {
    console.error("Email verification failed.", error);
    setEmailOtpStatus("join_otp_verify_error", "error");
  } finally {
    isVerifyingOtp = false;
    verifyEmailCodeButton.disabled = false;
    if (!emailVerified) verifyEmailCodeButton.textContent = message("join_verify_code");
  }
}

function resetEmailVerification() {
  emailVerified = false;
  emailInput.readOnly = false;
  emailInput.removeAttribute("data-otp-email");
  emailVerifiedBadge.hidden = true;
  editEmailButton.hidden = true;
  sendEmailCodeButton.hidden = false;
  sendEmailCodeButton.disabled = false;
  sendEmailCodeButton.textContent = message(otpSent ? "join_resend_code" : "join_send_code");
  emailCodeInput.readOnly = false;
  emailCodeInput.value = "";
  verifyEmailCodeButton.hidden = false;
  verifyEmailCodeButton.disabled = false;
  verifyEmailCodeButton.textContent = message("join_verify_code");
  emailOtp.hidden = !otpSent;
  emailOtpStatus.textContent = "";
  emailOtpMessageKey = "";
  emailOtpCountdown.textContent = "";
  emailOtpStatus.dataset.state = "";
  otpSent = false;
  otpCooldownUntil = 0;
  window.clearInterval(otpCountdownTimer);
  otpCountdownTimer = null;
  submitButton.disabled = true;
}

function resetTurnstileChallenge() {
  document.getElementById("turnstile-token").value = "";
  if (turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
}

sendEmailCodeButton.addEventListener("click", requestEmailCode);
verifyEmailCodeButton.addEventListener("click", verifyEmailCode);
editEmailButton.addEventListener("click", () => {
  resetEmailVerification();
  emailInput.focus();
});
provinceSelect.addEventListener("change", () => renderDistrictOptions(false));
districtTrigger.addEventListener("focus", () => {
  if (suppressDistrictFocusOpen) return;
  openDistrictOptions();
  if (districtSelect.value) districtTrigger.select();
});
districtTrigger.addEventListener("click", () => {
  if (districtOptions.hidden) openDistrictOptions();
});
districtTrigger.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (districtOptions.hidden) openDistrictOptions();
    moveDistrictActiveOption(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Home" && !districtOptions.hidden) {
    event.preventDefault();
    districtTrigger.removeAttribute("aria-activedescendant");
    moveDistrictActiveOption(1);
  } else if (event.key === "End" && !districtOptions.hidden) {
    event.preventDefault();
    districtTrigger.removeAttribute("aria-activedescendant");
    moveDistrictActiveOption(-1);
  } else if (event.key === "Enter" && !districtOptions.hidden) {
    event.preventDefault();
    const activeOption = document.getElementById(districtTrigger.getAttribute("aria-activedescendant"));
    if (activeOption) selectDistrict(activeOption.dataset.value);
    else {
      const firstOption = districtOptionList.querySelector('[role="option"]:not([hidden])');
      if (firstOption) selectDistrict(firstOption.dataset.value);
    }
  } else if (event.key === "Escape" && !districtOptions.hidden) {
    event.preventDefault();
    closeDistrictOptions();
  }
});
districtTrigger.addEventListener("input", () => {
  districtSelect.value = "";
  districtOptionList.querySelectorAll('[role="option"]').forEach((option) => {
    option.setAttribute("aria-selected", "false");
  });
  filterDistrictOptions();
});
districtOptionList.addEventListener("click", (event) => {
  const option = event.target.closest('[role="option"]');
  if (!option) return;
  event.preventDefault();
  selectDistrict(option.dataset.value);
});
districtTrigger.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (!districtOptions.contains(document.activeElement)) {
      const exactMatch = exactDistrictMatch(districtTrigger.value);
      if (exactMatch) {
        selectDistrict(exactMatch, false);
      } else {
        districtSelect.value = "";
        closeDistrictOptions();
      }
    }
  }, 0);
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".district-picker")) closeDistrictOptions();
});
emailCodeInput.addEventListener("input", () => {
  emailCodeInput.value = emailCodeInput.value.replace(/\D/g, "").slice(0, 6);
});
emailInput.addEventListener("input", () => {
  if (emailVerified || emailInput.dataset.otpEmail) resetEmailVerification();
  if (currentMessageKey) clearFormMessage();
  document.getElementById("error-email").textContent = "";
  emailInput.removeAttribute("aria-invalid");
  if (!sendEmailCodeButton.hidden && !otpCooldownUntil) {
    sendEmailCodeButton.disabled = !emailInput.value.trim();
  }
});

function setSubmitting(submitting) {
  isSubmitting = submitting;
  const submitted = form.dataset.submitted === "true";
  submitButton.disabled = submitting || submitted;
  submitButton.textContent = message(submitting ? "join_sending" : submitted ? "join_sent" : "join_submit");
}

function loadTurnstile() {
  if (!TURNSTILE_ENABLED) return;
  if (TURNSTILE_SITE_KEY === "PASTE_YOUR_TURNSTILE_SITE_KEY_HERE") {
    setFormMessage("join_error_config");
    throw new Error("Turnstile is enabled, but its public site key has not been configured.");
  }
  turnstileArea.hidden = false;
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (!window.turnstile) {
      setFormMessage("join_error_generic");
      throw new Error("The Turnstile script loaded without its API.");
    }
    turnstileWidgetId = window.turnstile.render(turnstileArea, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => { document.getElementById("turnstile-token").value = token; },
      "expired-callback": () => { document.getElementById("turnstile-token").value = ""; }
    });
  };
  script.onerror = () => {
    setFormMessage("join_error_generic");
    console.error("Could not load Cloudflare Turnstile.");
  };
  document.head.append(script);
}

ageModeInputs.forEach((input) => {
  input.addEventListener("change", () => setAgeMode(input.value));
});

function clearEditedFieldError(event) {
  const field = event.target;
  if (!field.id) return;
  const error = document.getElementById(`error-${field.id}`);
  if (error) {
    error.textContent = "";
    field.removeAttribute("aria-invalid");
  }
  const summaryLink = Array.from(errorList.querySelectorAll("a"))
    .find((link) => link.getAttribute("href") === `#${field.id}`);
  if (summaryLink) summaryLink.closest("li").remove();
  if (errorList.children.length === 0) errorSummary.hidden = true;
  if (currentMessageKey) clearFormMessage();
}

form.addEventListener("input", clearEditedFieldError);
form.addEventListener("change", clearEditedFieldError);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  clearFormMessage();
  const validation = validateForm();
  if (validation.errors.length) {
    showValidationErrors(validation.errors);
    return;
  }
  if (validation.blocked) return;
  if (!APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/") || APPS_SCRIPT_URL.includes("PASTE_YOUR_")) {
    setFormMessage("join_error_config");
    return;
  }

  setSubmitting(true);
  clearErrors();
  try {
    const result = await submitApplication();
    if (!result.ok) {
      setFormMessage(result.code === "DUPLICATE_EMAIL"
        ? "join_error_duplicate"
        : result.code === "EMAIL_NOT_VERIFIED" ? "join_email_not_verified" : "join_error_server");
      return;
    }
    form.reset();
    setAgeMode("age");
    enhancedSelects.forEach(({ select }) => select.dispatchEvent(new Event("change")));
    renderDistrictOptions(false);
    startedAtInput.value = String(Date.now());
    document.getElementById("turnstile-token").value = "";
    if (turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    form.dataset.submitted = "true";
    setFormMessage("join_success");
    form.append(formStatus);
  } catch (error) {
    console.error("Membership application submission failed.", error);
    setFormMessage("join_error_server");
  } finally {
    setSubmitting(false);
  }
});

window.addEventListener("ynan:languagechange", () => {
  if (!errorSummary.hidden) {
    const validation = validateForm();
    if (validation.errors.length) showValidationErrors(validation.errors);
    else errorSummary.hidden = true;
  }
  if (currentMessageKey) {
    const isSuccess = currentMessageKey === "join_success";
    formStatusMessage.hidden = isSuccess;
    formStatusMessage.textContent = isSuccess ? "" : message(currentMessageKey);
    if (currentMessageKey === "join_success") {
      formStatusFollowup.textContent = message("join_success_followup");
    }
  }
  renderDistrictOptions();
  if (isSubmitting) submitButton.textContent = message("join_sending");
  else submitButton.textContent = message(form.dataset.submitted === "true" ? "join_sent" : "join_submit");
  if (emailOtpMessageKey) emailOtpStatus.textContent = message(emailOtpMessageKey);
  if (emailVerified) editEmailButton.textContent = message("join_edit_email");
  else {
    sendEmailCodeButton.textContent = message(otpSent ? "join_resend_code" : "join_send_code");
    verifyEmailCodeButton.textContent = message("join_verify_code");
  }
  if (otpCooldownUntil > Date.now()) updateOtpCountdown();
});

const today = nepalToday();
dobInput.max = dateYearsBefore(today, 15);
dobInput.min = dateYearsBefore(today, 100);
startedAtInput.value = String(Date.now());
renderDistrictOptions(false);
sendEmailCodeButton.disabled = true;
loadTurnstile();
