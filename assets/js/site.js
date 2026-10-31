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

    if (compactLayout.matches) {
      mountainLayers.forEach((layer) => {
        layer.style.transform = "";
      });
      return;
    }

    const scrollOffset = Math.min(32, Math.max(-32, -bounds.top * 0.055));
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
