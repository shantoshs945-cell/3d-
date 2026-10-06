/* ==========================================================================
   AURA CHAUFFEURS - MAIN JAVASCRIPT CONTROLLER
   GSAP + ScrollTrigger + Lenis Canvas Frame Animation
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. CONFIGURATION & CONSTANTS
// --------------------------------------------------------------------------
const CONFIG = {
  BRAND_NAME: 'Aura Chauffeurs',
  CITY: 'Mumbai & Pan-India',
  PHONE: '+919876543210',
  TAGLINE: 'Elevated Private Mobility & Chauffeur Services',
  MANIFEST_PATH: 'frames.json',
  ACCENT_GOLD: '#C9A66B',
  BG_COLOR: '#0A0D12'
};

// State Store
const state = {
  frames: [],
  frameCount: 0,
  currentFrameIndex: 0,
  isLoaded: false,
  isMobile: window.innerWidth <= 768,
  lenis: null
};

// --------------------------------------------------------------------------
// 2. INITIALIZATION ON DOM READY
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  initCustomCursor();
  initNavbar();
  loadFrameSequence();
  initBookingForm();
  initBackToTop();
  initCardTilt();
});

// --------------------------------------------------------------------------
// 3. LENIS SMOOTH SCROLL INTEGRATION
// --------------------------------------------------------------------------
function initLenis() {
  state.lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Power3 / Expo easing
    direction: 'vertical',
    gestureDirection: 'vertical',
    smoothTouch: false,
    touchMultiplier: 2
  });

  // Synchronize Lenis scroll with GSAP ScrollTrigger
  state.lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    state.lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

// --------------------------------------------------------------------------
// 4. CUSTOM CURSOR (DOT + TRAILING RING)
// --------------------------------------------------------------------------
function initCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  if (!dot || !ring || state.isMobile) return;

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Instant dot movement
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
  });

  // Smooth ring movement loop
  function renderCursor() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  // Hover scale trigger
  const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [data-hover], .fleet-card, .service-card');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('active'));
    el.addEventListener('mouseleave', () => ring.classList.remove('active'));
  });
}

// --------------------------------------------------------------------------
// 5. FRAME SEQUENCE LOADING & CANVASES
// --------------------------------------------------------------------------
async function loadFrameSequence() {
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderCounter = document.getElementById('preloader-counter');

  try {
    const res = await fetch(CONFIG.MANIFEST_PATH);
    const manifest = await res.json();

    state.frameCount = manifest.count;
    const pattern = manifest.pattern; // 'assets/frames-webp/frame_{index}.webp'

    // Determine frame skip step for mobile
    const step = state.isMobile ? 2 : 1;
    let loadedCount = 0;
    const totalToLoad = Math.ceil(state.frameCount / step);

    for (let i = 1; i <= state.frameCount; i += step) {
      const img = new Image();
      const formattedIndex = String(i).padStart(manifest.zeroPadding || 4, '0');
      const src = pattern.replace('{index}', formattedIndex);

      img.src = src;
      img.onload = () => {
        loadedCount++;
        const percent = Math.floor((loadedCount / totalToLoad) * 100);
        
        if (preloaderBar) preloaderBar.style.width = `${percent}%`;
        if (preloaderCounter) preloaderCounter.textContent = `${percent}%`;

        if (loadedCount >= totalToLoad) {
          state.isLoaded = true;
          onFramesReady(manifest);
        }
      };
      state.frames.push({ index: i, img });
    }
  } catch (err) {
    console.warn('Frame manifest error. Falling back to direct frame loading:', err);
    // Fallback load
    onFramesReady({ count: 120, width: 1280, height: 720 });
  }
}

function onFramesReady(manifest) {
  // Hide Preloader smoothly
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('hidden');
    }, 400);
  }

  // Setup Canvas & GSAP ScrollTrigger Sequence
  setupHeroCanvas(manifest);
  
  // Initialize standard section animations after preloader
  setTimeout(() => {
    initSectionAnimations();
  }, 600);
}

// --------------------------------------------------------------------------
// 6. HERO CANVAS SCROLL TRIGGER
// --------------------------------------------------------------------------
function setupHeroCanvas(manifest) {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    renderFrame(state.currentFrameIndex);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function renderFrame(index) {
    if (!state.frames || state.frames.length === 0) return;
    
    // Find closest loaded frame
    const frameObj = state.frames[Math.min(index, state.frames.length - 1)];
    if (!frameObj || !frameObj.img || !frameObj.img.complete) return;

    const img = frameObj.img;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // "Cover" aspect ratio scaling
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawWidth = canvasHeight * imgRatio;
      drawHeight = canvasHeight;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  // Initial render of first frame
  renderFrame(0);

  // GSAP ScrollTrigger for Canvas Sequence Pinned Scroll
  const scrollObj = { frame: 0 };
  const maxFramesIndex = state.frames.length - 1;

  ScrollTrigger.create({
    trigger: '#hero-scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const progress = self.progress;
      const frameIndex = Math.floor(progress * maxFramesIndex);
      if (frameIndex !== state.currentFrameIndex) {
        state.currentFrameIndex = frameIndex;
        requestAnimationFrame(() => renderFrame(frameIndex));
      }

      // Handle Hero Step Overlay Crossfading based on progress
      updateHeroOverlaySteps(progress);

      // Fade out scroll indicator
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        indicator.style.opacity = progress > 0.05 ? '0' : '1';
      }
    }
  });
}

function updateHeroOverlaySteps(progress) {
  const step1 = document.getElementById('hero-step-1');
  const step2 = document.getElementById('hero-step-2');
  const step3 = document.getElementById('hero-step-3');
  const step4 = document.getElementById('hero-step-4');

  const steps = [step1, step2, step3, step4];
  steps.forEach(s => s && s.classList.remove('active'));

  if (progress < 0.22) {
    if (step1) step1.classList.add('active');
  } else if (progress >= 0.22 && progress < 0.52) {
    if (step2) step2.classList.add('active');
  } else if (progress >= 0.52 && progress < 0.82) {
    if (step3) step3.classList.add('active');
  } else {
    if (step4) step4.classList.add('active');
  }
}

// --------------------------------------------------------------------------
// 7. NAVBAR CONTROLLER
// --------------------------------------------------------------------------
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // Scrolled class
    if (currentScrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Hide on scroll down, show on scroll up
    if (currentScrollY > 300 && currentScrollY > lastScrollY) {
      navbar.classList.add('nav-hidden');
    } else {
      navbar.classList.remove('nav-hidden');
    }

    lastScrollY = currentScrollY;
  });

  // Mobile Menu Toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
    });

    const mobileLinks = document.querySelectorAll('.mobile-menu-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
      });
    });
  }
}

// --------------------------------------------------------------------------
// 8. SECTION ANIMATIONS & SCROLL TRIGGER EFFECTS
// --------------------------------------------------------------------------
function initSectionAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // Staggered reveal for section headers
  gsap.utils.toArray('.section-header').forEach(header => {
    gsap.from(header, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: header,
        start: 'top 85%'
      }
    });
  });

  // About Section Counters
  const counters = document.querySelectorAll('.counter-number');
  if (counters.length > 0) {
    ScrollTrigger.create({
      trigger: '.about-stats-card',
      start: 'top 80%',
      onEnter: () => {
        counters.forEach(counter => {
          const target = parseInt(counter.getAttribute('data-target'), 10);
          gsap.to(counter, {
            innerText: target,
            duration: 2,
            snap: { innerText: 1 },
            ease: 'power2.out'
          });
        });
      }
    });
  }

  // Fleet Horizontal Pinned Scroll (Desktop Only)
  if (!state.isMobile) {
    const fleetWrapper = document.getElementById('fleet-wrapper');
    if (fleetWrapper) {
      const totalWidth = fleetWrapper.scrollWidth - window.innerWidth + 200;
      
      gsap.to(fleetWrapper, {
        x: -totalWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: '.fleet-outer',
          start: 'top top',
          end: `+=${totalWidth}`,
          pin: true,
          scrub: 1
        }
      });
    }
  }

  // Services Stagger Fade
  gsap.from('.service-card', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.services-grid',
      start: 'top 80%'
    }
  });

  // Packages Stagger Fade
  gsap.from('.package-card', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.18,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.packages-grid',
      start: 'top 80%'
    }
  });

  // How It Works SVG Line Animation
  const line = document.getElementById('connecting-line');
  if (line) {
    const pathLength = line.getTotalLength();
    line.style.strokeDasharray = pathLength;
    line.style.strokeDashoffset = pathLength;

    ScrollTrigger.create({
      trigger: '.steps-container',
      start: 'top 75%',
      end: 'bottom 50%',
      scrub: 0.5,
      onUpdate: (self) => {
        const drawLength = pathLength * (1 - self.progress);
        line.style.strokeDashoffset = drawLength;
      }
    });
  }
}

// --------------------------------------------------------------------------
// 9. FLEET CARD MOUSE TILT EFFECT
// --------------------------------------------------------------------------
function initCardTilt() {
  if (state.isMobile) return;

  const cards = document.querySelectorAll('[data-tilt]');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// --------------------------------------------------------------------------
// 10. BOOKING FORM & WHATSAPP INTEGRATION
// --------------------------------------------------------------------------
function initBookingForm() {
  const form = document.getElementById('booking-form');
  const whatsappBtn = document.getElementById('btn-whatsapp');
  const successMsg = document.getElementById('form-success');
  const vehicleSelect = document.getElementById('vehicle');

  // Quick reserve click from fleet cards
  const reserveBtns = document.querySelectorAll('.btn-book-sm');
  reserveBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const vehicleName = btn.getAttribute('data-vehicle');
      if (vehicleName && vehicleSelect) {
        vehicleSelect.value = vehicleName;
      }
      // Smooth scroll to booking form
      if (state.lenis) {
        state.lenis.scrollTo('#booking');
      }
    });
  });

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (successMsg) {
        successMsg.classList.add('active');
        form.reset();
        setTimeout(() => {
          successMsg.classList.remove('active');
        }, 8000);
      }
    });
  }

  // Handle WhatsApp Prefilled Message
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const pickup = document.getElementById('pickup').value.trim() || 'Not specified';
      const drop = document.getElementById('drop').value.trim() || 'Not specified';
      const datetime = document.getElementById('datetime').value || 'Not specified';
      const vehicle = document.getElementById('vehicle').value || 'Any Executive Vehicle';
      const name = document.getElementById('name').value.trim() || 'Guest';
      const phone = document.getElementById('phone').value.trim() || 'Not provided';
      const notes = document.getElementById('notes').value.trim() || 'None';

      const text = `*NEW CHAUFFEUR BOOKING REQUEST*%0A%0A` +
                   `*Name:* ${encodeURIComponent(name)}%0A` +
                   `*Phone:* ${encodeURIComponent(phone)}%0A` +
                   `*Vehicle:* ${encodeURIComponent(vehicle)}%0A` +
                   `*Pickup:* ${encodeURIComponent(pickup)}%0A` +
                   `*Drop:* ${encodeURIComponent(drop)}%0A` +
                   `*Date & Time:* ${encodeURIComponent(datetime)}%0A` +
                   `*Special Notes:* ${encodeURIComponent(notes)}`;

      const url = `https://wa.me/${CONFIG.PHONE}?text=${text}`;
      window.open(url, '_blank');
    });
  }
}

// --------------------------------------------------------------------------
// 11. BACK TO TOP BUTTON
// --------------------------------------------------------------------------
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      if (state.lenis) {
        state.lenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
