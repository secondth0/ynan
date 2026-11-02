"use strict";

const translations = window.YNAN_TRANSLATIONS;
const languageButton = document.getElementById("language-toggle");
const menuButton = document.getElementById("menu-toggle");
const navigation = document.getElementById("main-nav");
const carousel = document.getElementById("hero-carousel");
let currentLanguage = "en";
let carouselIndex = 0;
let carouselTimer = null;
let carouselPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let carouselInteractionPaused = false;

if (!translations) {
  throw new Error("The YNAN language translations could not be loaded.");
}

function setLanguage(language) {
  const languageContent = translations[language];
  if (!languageContent) {
    throw new Error(`No translations are configured for "${language}".`);
  }

  currentLanguage = language;
  document.documentElement.lang = language;
  const titleKey = document.documentElement.dataset.titleKey || "page_title";
  const descriptionKey = document.documentElement.dataset.descriptionKey || "page_description";
  if (!languageContent[titleKey] || !languageContent[descriptionKey]) {
    throw new Error(`Page metadata translations are missing for "${language}".`);
  }
  document.title = languageContent[titleKey];
  document.querySelector('meta[name="description"]').content = languageContent[descriptionKey];

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const translation = languageContent[key];
    if (translation === undefined) {
      throw new Error(`Missing "${key}" translation for "${language}".`);
    }

    const attribute = element.dataset.i18nAttribute;
    if (attribute) {
      element.setAttribute(attribute, translation);
    } else {
      element.innerHTML = translation;
    }
  });

  if (typeof window.ynanProvinceState !== "undefined" && typeof window.ynanProvinceState.renderProvinceLabels === "function") {
    window.ynanProvinceState.renderProvinceLabels();
  }
  if (typeof window.ynanProvinceState !== "undefined" && typeof window.ynanProvinceState.renderActiveProvince === "function") {
    window.ynanProvinceState.renderActiveProvince();
  }

  languageButton.dataset.language = language;
  languageButton.setAttribute("aria-label", languageContent.language_aria);
  menuButton.setAttribute(
    "aria-label",
    navigation.classList.contains("is-open") ? languageContent.menu_close : languageContent.menu_open
  );

  try {
    localStorage.setItem("ynan-language", language);
  } catch (error) {
    console.warn("Could not save the selected language.", error);
  }
}

function closeNavigation() {
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", translations[currentLanguage].menu_open);
}

languageButton.addEventListener("click", () => {
  setLanguage(currentLanguage === "en" ? "ne" : "en");
});

menuButton.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute(
    "aria-label",
    translations[currentLanguage][isOpen ? "menu_close" : "menu_open"]
  );
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNavigation);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.classList.contains("is-open")) {
    closeNavigation();
    menuButton.focus();
  }
});

document.getElementById("year").textContent = String(new Date().getFullYear());

if (carousel) {
  const slides = Array.from(carousel.querySelectorAll(".hero-slide"));
  const dots = Array.from(carousel.querySelectorAll(".carousel-dot"));
  const previousButton = carousel.querySelector(".carousel-previous");
  const nextButton = carousel.querySelector(".carousel-next");
  let touchStart = null;

  function scheduleCarousel() {
    window.clearTimeout(carouselTimer);
    carouselTimer = null;

    if (carouselPaused || carouselInteractionPaused || document.hidden || slides.length < 2) {
      return;
    }

    carouselTimer = window.setTimeout(() => {
      showSlide((carouselIndex + 1) % slides.length);
    }, 5000);
  }

  function showSlide(index) {
    carouselIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === carouselIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.inert = !isActive;
      dots[slideIndex].classList.toggle("is-active", isActive);
      dots[slideIndex].setAttribute("aria-current", String(isActive));
    });
    scheduleCarousel();
  }

  carousel.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    carouselInteractionPaused = true;
    scheduleCarousel();
  });
  carousel.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    carouselInteractionPaused = false;
    scheduleCarousel();
  });
  carousel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      touchStart = { x: event.clientX, y: event.clientY };
    }
  });
  carousel.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch" || !touchStart) {
      return;
    }

    const horizontalDistance = event.clientX - touchStart.x;
    const verticalDistance = event.clientY - touchStart.y;
    touchStart = null;

    if (Math.abs(horizontalDistance) > 40 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
      showSlide(carouselIndex + (horizontalDistance < 0 ? 1 : -1));
    }
  });
  carousel.addEventListener("pointercancel", () => {
    touchStart = null;
  });
  carousel.addEventListener("focusin", () => {
    carouselInteractionPaused = true;
    scheduleCarousel();
  });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) {
      carouselInteractionPaused = false;
      scheduleCarousel();
    }
  });

  previousButton.addEventListener("click", () => showSlide(carouselIndex - 1));
  nextButton.addEventListener("click", () => showSlide(carouselIndex + 1));
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => showSlide(index));
  });
  document.addEventListener("visibilitychange", scheduleCarousel);

  showSlide(0);
}

const panorama = document.querySelector(".vision-mission-panorama");
const trailPath = document.getElementById("mission-trail-path");
const missionLamp = document.getElementById("mission-lamp");

if (panorama && trailPath && missionLamp) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactLayout = window.matchMedia("(max-width: 920px)");
  const panoramaScene = panorama.querySelector(".panorama-scene");
  const mountainLayers = Array.from(panorama.querySelectorAll("[data-parallax]"));
  let panoramaIsVisible = true;
  let updateScheduled = false;

  function setLampPosition(progress) {
    const point = trailPath.getPointAtLength(trailPath.getTotalLength() * progress);
    missionLamp.setAttribute("transform", `translate(${point.x} ${point.y})`);
  }

  function updatePanorama() {
    updateScheduled = false;
    if (reducedMotion.matches) {
      setLampPosition(1);
      mountainLayers.forEach((layer) => {
        layer.style.transform = "";
      });
      return;
    }

    if (!panoramaIsVisible) {
      return;
    }

    const bounds = panorama.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0,
      (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)
    ));
    setLampPosition(progress);

    const parallaxStrength = compactLayout.matches ? 0.025 : 0.055;
    const maxScrollOffset = compactLayout.matches ? 12 : 32;
    const scrollOffset = Math.min(maxScrollOffset, Math.max(-maxScrollOffset, -bounds.top * parallaxStrength));
    mountainLayers.forEach((layer) => {
      layer.style.transform = `translateY(${scrollOffset * Number(layer.dataset.parallax)}px)`;
    });
  }

  function schedulePanoramaUpdate() {
    if (updateScheduled) {
      return;
    }
    updateScheduled = true;
    window.requestAnimationFrame(updatePanorama);
  }

  if ("IntersectionObserver" in window) {
    const panoramaObserver = new IntersectionObserver(([entry]) => {
      panoramaIsVisible = entry.isIntersecting;
      panorama.classList.toggle("is-in-view", entry.isIntersecting);
      if (panoramaIsVisible) {
        schedulePanoramaUpdate();
      }
    });
    panoramaObserver.observe(panorama);
  }

  window.addEventListener("scroll", schedulePanoramaUpdate, { passive: true });
  window.addEventListener("resize", schedulePanoramaUpdate);
  reducedMotion.addEventListener("change", schedulePanoramaUpdate);
  compactLayout.addEventListener("change", schedulePanoramaUpdate);
  if (!panoramaScene) {
    throw new Error("The vision and mission panorama scene could not be found.");
  }
  schedulePanoramaUpdate();
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.documentElement.classList.add("motion-ready");
  document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));
}

try {
  if (localStorage.getItem("ynan-language") === "ne") {
    setLanguage("ne");
  }
} catch (error) {
  console.warn("Could not load the saved language preference.", error);
}

const provinceMap = document.getElementById("province-map");
const provinceGroup = document.getElementById("province-paths");
const provinceMapShell = provinceMap ? provinceMap.parentElement : null;
window.ynanProvinceState = { activeProvinceId: null, renderActiveProvince: null, renderProvinceLabels: null, touchReady: false };

const provinceDetails = window.YNAN_PROVINCE_CONTACTS || [];
const provinceContactLookup = new Map();
const provinceFeatureMap = {
  "Province 1": "koshi",
  "Province 2": "madhesh",
  "Bagmati": "bagmati",
  "Gandaki": "gandaki",
  "Lumbini": "lumbini",
  "Karnali": "karnali",
  "Sudurpaschim": "sudurpashchim"
};

function getInitials(name) {
  if (!name) {
    return "YN";
  }
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "YN";
}

function getLanguageText(key) {
  const languagePack = translations[currentLanguage] || translations.en;
  return languagePack[key] || translations.en[key] || key;
}

function buildProvinceScene(provinceId) {
  const scenes = {
    koshi: `
      <path d="M17 12L30 24L39 18L53 13L70 22L76 15L85 18L91 28L82 34L74 42L63 39L52 48L45 41L36 46L28 41L15 50L7 42L9 30L17 12Z" fill="rgba(255,255,255,0.12)"/>
      <path d="M14 62L30 42L42 48L50 36L65 40L74 32L83 38L90 49L82 68L67 71L52 65L38 70L24 66L14 62Z" fill="rgba(255,255,255,0.12)"/>
      <path d="M28 40L36 25L44 34L52 28L61 35L66 24L73 34L78 24L84 33L79 40L71 45L62 42L53 49L43 46L35 52L28 40Z" fill="rgba(13,42,67,0.12)"/>
      <path d="M16 59L31 47L41 49L48 43L63 47L72 39L80 41L88 53L72 72L57 69L44 74L27 68L16 59Z" fill="rgba(13,42,67,0.16)"/>
      <path d="M58 16L62 20L68 18L70 24L76 21L77 28L83 25L84 30L91 27L89 34L82 35L77 40L68 34L59 38L55 31L50 26L58 16Z" fill="rgba(255,255,255,0.82)"/>
      <path d="M61 19L64 11L67 18L71 12L74 18L78 16L76 24L70 27L61 19Z" fill="rgba(255,255,255,0.72)"/>
      <path d="M18 53C24 46 31 42 39 42C49 42 56 47 63 53" stroke="rgba(255,255,255,0.7)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M37 57C45 50 51 45 60 45C69 44 75 48 81 55" stroke="rgba(255,255,255,0.7)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M28 70C31 74 36 76 41 76C47 76 52 74 56 70" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M55 30C58 25 63 23 68 24C70 30 65 35 59 35C57 33 56 31 55 30Z" fill="#f1d36d"/>
      <path d="M48 55C50 49 55 45 62 45C67 45 72 48 75 55C69 60 61 63 52 61C50 59 49 57 48 55Z" fill="#49a66f"/>
    `,
    madhesh: `
      <path d="M16 41L27 30L39 32L50 26L63 31L73 27L82 35L89 46L87 58L78 64L68 58L58 63L47 69L32 70L20 65L11 56L16 41Z" fill="rgba(255,255,255,0.14)"/>
      <path d="M14 66H89" stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round"/>
      <path d="M17 62V42L33 29L49 34L61 27L77 35V62H17Z" fill="rgba(13,42,67,0.12)"/>
      <path d="M28 18L35 31L42 21L49 31L56 18L64 32L72 23L79 33L73 42L63 47L52 45L42 48L32 44L25 38L28 18Z" fill="rgba(255,255,255,0.22)"/>
      <path d="M25 61C30 57 38 56 44 59C47 63 44 68 40 71C33 72 29 66 25 61Z" fill="#f7d36d"/>
      <path d="M53 58C58 52 66 51 73 55C76 59 74 67 67 70C61 72 56 66 53 58Z" fill="#d66252"/>
      <path d="M39 55C42 49 48 46 56 47C63 47 70 52 71 58C64 62 56 64 49 62C44 60 41 58 39 55Z" fill="#f6ebd4"/>
      <path d="M40 24C45 32 52 34 57 31C61 28 64 23 65 17C60 13 50 12 44 15C41 18 40 21 40 24Z" fill="#d97f59"/>
      <path d="M19 67H87" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round"/>
    `,
    bagmati: `
      <path d="M18 45L32 32L45 27L60 30L73 24L82 34L89 48L82 61L68 67L55 72L44 65L31 69L18 62L18 45Z" fill="rgba(255,255,255,0.14)"/>
      <path d="M31 61C42 57 52 52 62 52C72 52 79 57 85 64L79 72L66 76L53 74L42 77L31 72L31 61Z" fill="rgba(13,42,67,0.14)"/>
      <path d="M46 28C46 19 53 15 61 15C68 15 75 20 75 29C75 38 68 43 60 43C53 43 46 38 46 28Z" fill="#f7f0d8"/>
      <circle cx="61" cy="29" r="4.5" fill="#1d3557"/>
      <path d="M58 29H64" stroke="#1d3557" stroke-width="2" stroke-linecap="round"/>
      <path d="M61 25V33" stroke="#1d3557" stroke-width="2" stroke-linecap="round"/>
      <path d="M53 42L61 49L69 42" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 51C33 46 40 42 48 42C53 42 58 43 63 46C59 56 51 61 42 62C35 60 30 56 27 51Z" fill="#6ab28d"/>
      <path d="M71 49C74 44 78 41 84 41C87 41 90 43 92 47C89 54 81 58 74 57C73 55 72 52 71 49Z" fill="#8cb0ca"/>
      <path d="M33 76L58 69L81 77" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
    `,
    gandaki: `
      <path d="M16 57L28 42L39 49L48 32L59 49L70 36L81 56L88 62L73 73L55 71L40 77L26 72L16 57Z" fill="rgba(255,255,255,0.14)"/>
      <path d="M17 66H88" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
      <path d="M22 58L32 42L40 51L50 38L60 54L69 42L79 58H22Z" fill="rgba(13,42,67,0.12)"/>
      <path d="M27 54L35 46L42 51L49 46L58 53L66 45L75 54H27Z" fill="#cfe0ee"/>
      <path d="M41 61C45 59 50 58 55 58C62 58 67 60 71 63C64 69 55 72 47 70C44 68 42 65 41 61Z" fill="#f1d7a0"/>
      <path d="M48 54L55 44L61 54H48Z" fill="#f9f5ef"/>
      <path d="M18 71C27 67 34 66 42 67C52 68 60 71 69 71C77 70 83 68 90 65" stroke="rgba(255,255,255,0.8)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M75 43C78 42 81 43 83 46C82 50 78 52 74 51C72 48 73 45 75 43Z" fill="#6baad6"/>
    `,
    lumbini: `
      <path d="M18 43C23 30 33 20 47 18C57 18 66 23 71 35C75 46 71 58 63 64C55 70 44 72 35 67C24 61 17 52 18 43Z" fill="rgba(255,255,255,0.18)"/>
      <path d="M40 24C41 31 42 36 46 42C50 36 54 30 59 25C55 20 48 18 40 24Z" fill="#f4dcc0"/>
      <path d="M38 41C45 36 51 36 58 39C53 46 47 50 39 52C36 48 36 44 38 41Z" fill="#90c69f"/>
      <circle cx="49" cy="44" r="6" fill="#f3d58a"/>
      <path d="M49 33V55" stroke="#1d3557" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M58 61C63 54 69 48 77 44C74 56 67 66 56 71C56 66 57 64 58 61Z" fill="#66b76c"/>
      <path d="M30 71C39 66 43 63 49 62C57 63 63 68 70 74" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
    karnali: `
      <path d="M18 60C28 38 38 28 49 22C59 28 70 37 81 60L68 68L54 72L39 71L18 60Z" fill="rgba(255,255,255,0.12)"/>
      <path d="M27 58L38 40L50 46L60 34L72 54L79 61L67 72L48 75L34 71L27 58Z" fill="rgba(13,42,67,0.12)"/>
      <path d="M25 63C35 57 42 53 49 47C56 53 63 58 73 63C67 70 58 74 48 76C39 75 31 70 25 63Z" fill="#9ed8e9"/>
      <path d="M23 49C30 44 38 42 46 42C53 42 61 46 67 51" stroke="rgba(255,255,255,0.8)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M38 61L46 48L56 61H38Z" fill="#d7c075"/>
      <path d="M48 45V59" stroke="#1d3557" stroke-width="2" stroke-linecap="round"/>
      <path d="M33 74C39 70 45 68 51 68C58 68 64 70 70 74" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
    sudurpashchim: `
      <path d="M18 51L26 34L39 24L52 28L63 20L76 26L86 39L90 54L82 67L63 72L48 77L35 71L24 68L18 51Z" fill="rgba(255,255,255,0.14)"/>
      <path d="M26 64L36 50L48 55L58 47L70 53L78 62L68 73L52 72L39 74L26 64Z" fill="rgba(13,42,67,0.12)"/>
      <path d="M28 54L35 44L42 49L48 44L56 51L62 43L71 53H28Z" fill="#d8d4a0"/>
      <path d="M33 52C35 47 40 44 46 44C53 44 58 48 60 53C55 57 51 60 45 61C39 59 35 57 33 52Z" fill="#78b586"/>
      <path d="M47 28L50 36L56 30L60 38L67 30L71 40L78 35L76 47L68 52L55 50L49 54L42 49L41 38L47 28Z" fill="#5d9d7a"/>
      <path d="M18 71C26 65 36 63 48 63C58 63 67 66 76 72" stroke="rgba(255,255,255,0.7)" stroke-width="2.1" stroke-linecap="round" fill="none"/>
      <path d="M51 39V53" stroke="#1d3557" stroke-width="2" stroke-linecap="round"/>
      <path d="M22 48C27 41 31 36 36 34" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" fill="none"/>
    `
  };

  return scenes[provinceId] || "";
}

provinceDetails.forEach((contact) => {
  if (contact && contact.id) {
    provinceContactLookup.set(contact.id, contact);
  }
});

if (provinceMap && provinceGroup && provinceMapShell) {
  const ynanProvinceState = window.ynanProvinceState;
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const provinceChip = document.createElement("div");
  provinceChip.className = "province-hover-chip";
  provinceChip.setAttribute("hidden", "hidden");
  provinceMapShell.appendChild(provinceChip);
  let activeProvinceShape = null;
  let chipProvinceId = null;
  let chipWidth = 220;
  let chipHeight = 72;
  let chipLanguage = currentLanguage;
  let pendingPointerPosition = null;
  let chipPositionFrame = 0;

  function getProvinceCopy(provinceId) {
    const contact = provinceContactLookup.get(provinceId) || null;
    const displayName = contact ? (currentLanguage === "ne" ? contact.contactNameNe : contact.contactNameEn) : getLanguageText("province_contact_coming_soon");
    const provinceName = contact ? (currentLanguage === "ne" ? contact.provinceNameNe : contact.provinceNameEn) : provinceId;
    const roleText = contact ? (currentLanguage === "ne" ? (contact.roleNe || contact.role) : (contact.role || contact.roleNe)) : getLanguageText("province_contact_role");
    return { contact, displayName, provinceName, roleText };
  }

  function renderProvinceLabels() {
    provinceGroup.querySelectorAll(".province-shape").forEach((shape) => {
      const provinceId = shape.dataset.provinceId;
      const contact = provinceContactLookup.get(provinceId) || null;
      const contactName = contact ? (currentLanguage === "ne" ? contact.contactNameNe : contact.contactNameEn) : getLanguageText("province_contact_coming_soon");
      const provinceName = contact ? (currentLanguage === "ne" ? contact.provinceNameNe : contact.provinceNameEn) : (shape.dataset.provinceName || shape.dataset.provinceNameEn || provinceId);
      const label = `${provinceName}, contact: ${contactName}`;
      const interactiveLink = shape.closest("a");
      if (interactiveLink) {
        interactiveLink.setAttribute("aria-label", label);
      } else {
        shape.setAttribute("aria-label", label);
      }
    });
  }

  function positionProvinceChip(provinceId, clientX, clientY) {
    const shellRect = provinceMapShell.getBoundingClientRect();
    let left = 24;
    let top = 24;

    if (typeof clientX === "number" && typeof clientY === "number") {
      const x = clientX - shellRect.left;
      const y = clientY - shellRect.top;
      const prefersLeft = x > shellRect.width * 0.7;
      left = prefersLeft ? x - chipWidth - 18 : x + 18;
      top = y - chipHeight / 2;
    } else {
      const shape = provinceGroup.querySelector(`[data-province-id="${provinceId}"]`);
      if (shape) {
        const shapeRect = shape.getBoundingClientRect();
        left = ((shapeRect.left - shellRect.left) + shapeRect.width / 2) - 90;
        top = (shapeRect.top - shellRect.top) - 56;
      }
    }

    left = Math.min(Math.max(left, 12), Math.max(12, shellRect.width - chipWidth - 12));
    top = Math.min(Math.max(top, 12), Math.max(12, shellRect.height - chipHeight - 12));

    provinceChip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }

  function updateProvinceChip(provinceId, event) {
    if (chipProvinceId !== provinceId || chipLanguage !== currentLanguage) {
      const info = getProvinceCopy(provinceId);
      const name = info.displayName || getLanguageText("province_contact_coming_soon");
      const provinceName = info.provinceName || provinceId;
      const role = info.roleText || getLanguageText("province_contact_role");
      provinceChip.innerHTML = `
        <span class="province-chip-province">${provinceName}</span>
        <span class="province-chip-name">${name}</span>
        <span class="province-chip-role">${role}</span>
      `;
      chipProvinceId = provinceId;
      chipLanguage = currentLanguage;
      provinceChip.hidden = false;
      provinceChip.classList.add("is-visible");
      const chipRect = provinceChip.getBoundingClientRect();
      chipWidth = chipRect.width;
      chipHeight = chipRect.height;
    } else if (provinceChip.hidden) {
      provinceChip.hidden = false;
      provinceChip.classList.add("is-visible");
    }

    positionProvinceChip(
      provinceId,
      event && typeof event.clientX === "number" ? event.clientX : undefined,
      event && typeof event.clientY === "number" ? event.clientY : undefined
    );
  }

  function scheduleProvinceChipPosition(event) {
    pendingPointerPosition = { clientX: event.clientX, clientY: event.clientY };
    if (chipPositionFrame) {
      return;
    }
    chipPositionFrame = window.requestAnimationFrame(() => {
      chipPositionFrame = 0;
      if (pendingPointerPosition && ynanProvinceState.activeProvinceId) {
        positionProvinceChip(
          ynanProvinceState.activeProvinceId,
          pendingPointerPosition.clientX,
          pendingPointerPosition.clientY
        );
      }
    });
  }

  function hideProvinceChip() {
    if (chipPositionFrame) {
      window.cancelAnimationFrame(chipPositionFrame);
      chipPositionFrame = 0;
    }
    pendingPointerPosition = null;
    provinceChip.hidden = true;
    provinceChip.classList.remove("is-visible");
    provinceChip.innerHTML = "";
    chipProvinceId = null;
    if (activeProvinceShape) {
      activeProvinceShape.classList.remove("is-active", "is-dimmed");
      activeProvinceShape = null;
    }
  }

  function setProvinceActive(provinceId, event) {
    const activeShape = provinceGroup.querySelector(`[data-province-id="${provinceId}"]`);
    ynanProvinceState.activeProvinceId = provinceId;
    if (activeProvinceShape !== activeShape) {
      activeProvinceShape?.classList.remove("is-active", "is-dimmed");
      activeShape?.classList.add("is-active");
      activeProvinceShape = activeShape;
    }

    if (coarsePointerQuery.matches) {
      return;
    }

    updateProvinceChip(provinceId, event);
  }

  ynanProvinceState.renderActiveProvince = () => {
    if (ynanProvinceState.activeProvinceId) {
      updateProvinceChip(ynanProvinceState.activeProvinceId);
    }
  };
  ynanProvinceState.renderProvinceLabels = renderProvinceLabels;

  function projectToSvg([lng, lat]) {
    const minLng = 80.0;
    const maxLng = 88.4;
    const minLat = 26.0;
    const maxLat = 30.9;
    const targetWidth = 1260;
    const targetHeight = 760;
    const x = ((lng - minLng) / (maxLng - minLng)) * targetWidth;
    const y = ((maxLat - lat) / (maxLat - minLat)) * targetHeight;
    return { x, y };
  }

  function buildPathFromPolygon(coordinates) {
    return coordinates.map((ring) => {
      const points = ring.map(([lng, lat]) => {
        const point = projectToSvg([lng, lat]);
        return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      });
      return `M ${points.join(" L ")} Z`;
    }).join(" ");
  }

  const svgDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  provinceMap.insertBefore(svgDefs, provinceGroup);

  window.NEPAL_PROVINCES_GEOJSON.features.forEach((feature) => {
    const featureName = feature && feature.properties ? feature.properties.shapeName : null;
    const provinceId = featureName ? provinceFeatureMap[featureName] : null;

    if (!provinceId || !feature.geometry) {
      return;
    }

    const geometry = feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates];
    const pathData = geometry.map((polygon) => buildPathFromPolygon(polygon)).join(" ");

    const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", "province-shape");
    path.setAttribute("data-province-id", provinceId);
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("id", `province-shape-${provinceId}`);

    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", `province-clip-${provinceId}`);
    const clipShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    clipShape.setAttribute("d", pathData);
    clipShape.setAttribute("fill", "white");
    clipShape.setAttribute("stroke", "none");
    clipPath.appendChild(clipShape);
    svgDefs.appendChild(clipPath);

    const sceneGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    sceneGroup.setAttribute("class", "province-scene");
    sceneGroup.setAttribute("clip-path", `url(#province-clip-${provinceId})`);
    sceneGroup.setAttribute("aria-hidden", "true");
    sceneGroup.innerHTML = buildProvinceScene(provinceId);

    const href = provinceContactLookup.get(provinceId)?.facebookUrl || "";
    const contact = provinceContactLookup.get(provinceId) || null;
    const provinceName = contact ? (currentLanguage === "ne" ? contact.provinceNameNe : contact.provinceNameEn) : featureName;
    const personName = contact ? (currentLanguage === "ne" ? (contact.contactNameNe || contact.contactNameEn) : (contact.contactNameEn || contact.contactNameNe)) : getLanguageText("province_contact_coming_soon");
    path.dataset.provinceName = provinceName;
    path.dataset.provinceNameEn = contact ? contact.provinceNameEn : featureName;

    if (href) {
      link.setAttribute("class", "province-link");
      link.setAttribute("href", href);
      link.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", href);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      link.setAttribute("aria-label", `${provinceName}, contact: ${personName}`);
      link.setAttribute("tabindex", "0");
      link.setAttribute("role", "link");
      link.style.cursor = "pointer";

      const handlePointerEnter = (event) => {
        if (coarsePointerQuery.matches) {
          return;
        }
        setProvinceActive(provinceId, event);
      };

      const handlePointerMove = (event) => {
        if (coarsePointerQuery.matches || ynanProvinceState.activeProvinceId !== provinceId) {
          return;
        }
        scheduleProvinceChipPosition(event);
      };

      const handlePointerLeave = () => {
        if (coarsePointerQuery.matches) {
          return;
        }
        hideProvinceChip();
        ynanProvinceState.activeProvinceId = null;
      };

      link.addEventListener("pointerenter", handlePointerEnter);
      link.addEventListener("pointermove", handlePointerMove);
      link.addEventListener("pointerleave", handlePointerLeave);
      link.addEventListener("focus", (event) => {
        if (!coarsePointerQuery.matches) {
          setProvinceActive(provinceId, event);
        }
      });
      link.addEventListener("blur", () => {
        if (!coarsePointerQuery.matches) {
          hideProvinceChip();
          ynanProvinceState.activeProvinceId = null;
        }
      });
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      });
      link.addEventListener("keydown", (event) => {
        if (event.key === " " && !event.repeat) {
          event.preventDefault();
          window.open(href, "_blank", "noopener,noreferrer");
        }
      });

      link.appendChild(path);
      let linkedPathData = pathData;
      if (provinceId === "sudurpashchim" && Array.isArray(window.YNAN_KALAPANI_REGION)) {
        const regionPathData = buildPathFromPolygon([window.YNAN_KALAPANI_REGION]);
        const regionPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        regionPath.setAttribute("d", regionPathData);
        regionPath.setAttribute("class", "province-region-extension");
        regionPath.setAttribute("aria-hidden", "true");
        link.appendChild(regionPath);
        linkedPathData = `${pathData} ${regionPathData}`;
      }
      link.appendChild(sceneGroup);
      const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitArea.setAttribute("d", linkedPathData);
      hitArea.setAttribute("class", "province-hit-area");
      hitArea.setAttribute("fill", "transparent");
      hitArea.setAttribute("pointer-events", "all");
      hitArea.setAttribute("aria-hidden", "true");
      link.appendChild(hitArea);
      provinceGroup.appendChild(link);
      return;
    }

    path.setAttribute("aria-label", `${provinceName}, contact: ${personName}`);
    path.setAttribute("role", "img");
    path.style.cursor = "default";
    path.removeAttribute("tabindex");
    provinceGroup.appendChild(path);
    provinceGroup.appendChild(sceneGroup);
  });

  const svgBounds = provinceGroup.getBBox ? provinceGroup.getBBox() : { x: 0, y: 0, width: 1000, height: 1000 };
  const padding = 28;
  provinceMap.setAttribute("viewBox", `${svgBounds.x - padding} ${svgBounds.y - padding} ${svgBounds.width + padding * 2} ${svgBounds.height + padding * 2}`);
  provinceMap.setAttribute("preserveAspectRatio", "xMidYMid meet");

  provinceMapShell.addEventListener("mouseleave", () => {
    if (coarsePointerQuery.matches) {
      return;
    }
    hideProvinceChip();
    ynanProvinceState.activeProvinceId = null;
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          provinceMapShell.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealObserver.observe(provinceMapShell);
  } else {
    provinceMapShell.classList.add("is-visible");
  }

  hideProvinceChip();
}
