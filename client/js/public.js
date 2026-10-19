/**
 * GURAY SICID LEARNING PLATFORM — PUBLIC WEBSITE LOGIC & BILINGUAL ENGINE
 * Supports English / Somali i18n, interactive demo simulation,
 * and video tutorial player.
 */

const PublicI18N = {
  currentLang: localStorage.getItem('public_site_lang') || 'en',

  translations: {
    en: {
      nav_home: 'Home',
      nav_features: 'Features',
      nav_demo: 'Interactive Demo',
      nav_tutorials: 'Tutorials',
      nav_login: 'Student Login',
      nav_portal: 'Open LMS Portal',
      
      hero_badge: 'Next-Gen Higher Education LMS',
      hero_title_1: 'Empowering Knowledge &',
      hero_title_2: 'Academic Excellence',
      hero_desc: 'Guray Sicid Learning Platform is an enterprise academic platform providing students and faculty with high-speed video streaming, interactive examinations, automated gradebook tracking, and verifiable credentials.',
      hero_btn_demo: 'Explore Live Demo',
      hero_btn_login: 'Student & Faculty Login',
      hero_proof_1: 'Bilingual (Somali & English)',
      hero_proof_2: 'Instant Exam Auto-Grading',
      hero_proof_3: 'Verifiable Digital Badges',

      features_badge: 'Core Capabilities',
      features_title: 'Built for Modern Academic Learning',
      features_subtitle: 'Designed to deliver an intuitive and reliable digital classroom experience for faculty members and enrolled students.',
      
      feat_1_title: 'Video Lecture Streaming',
      feat_1_desc: 'High-definition video streaming with variable playback speeds (0.75x to 2x), wide cinema mode, and millisecond-accurate progress persistence.',
      
      feat_2_title: 'Interactive Exam Runner',
      feat_2_desc: 'Timed online assessments with single-choice, multiple-choice, true/false, and short answer question banks with instant automated grading.',
      
      feat_3_title: 'Assignment Submissions & Feedback',
      feat_3_desc: 'Seamless document and archive uploads with professor feedback, rubric evaluations, and weighted score calculation.',
      
      feat_4_title: 'Comprehensive Gradebook Matrix',
      feat_4_desc: 'Real-time calculation of overall course standing, letter grades, weighted assignment ratios, and academic transcript records.',
      
      feat_5_title: 'Attendance & Performance Tracking',
      feat_5_desc: 'Faculty attendance session logs with present, late, excused, and absent statuses paired with early risk alert notifications.',
      
      feat_6_title: 'Verifiable Badges & Certificates',
      feat_6_desc: 'Milestone achievements and cryptographic course completion certificates with unique verification UUIDs.',

      demo_sec_badge: 'Interactive Sandbox',
      demo_sec_title: 'Experience the Student Portal in Real-Time',
      demo_sec_subtitle: 'Explore our isolated, fictional student environment. Test video lessons, practice exams, and grade tracking with zero sign-up required.',
      demo_btn_explore: 'Launch Public Demo',

      courses_badge: 'Academic Curriculum',
      courses_title: 'Featured Faculty Courses',
      courses_subtitle: 'Sample comprehensive curriculums taught by faculty members with rich multimedia learning modules.',

      how_badge: 'Step-by-Step',
      how_title: 'How Guray Sicid Platform Works',
      step_1_title: '1. Secure Portal Sign In',
      step_1_desc: 'Students access their university portal using institutional credentials and multi-factor safety.',
      step_2_title: '2. Access Enrolled Courses',
      step_2_desc: 'Browse academic syllabi, weekly lecture slides, code repositories, and reading materials.',
      step_3_title: '3. Stream Lectures & Complete Labs',
      step_3_desc: 'Watch high-speed video lectures, submit programming assignments, and take midterm exams.',
      step_4_title: '4. Track Grades & Earn Honors',
      step_4_desc: 'View your real-time GPA matrix, earn milestone badges, and graduate with certified diplomas.',

      tut_badge: 'Video Tutorials',
      tut_title: 'Learn How to Use the Platform',
      tut_subtitle: 'Step-by-step video walkthroughs available in both English and Somali to help students and instructors get started easily.',
      tut_btn_view_all: 'View All Tutorials',

      faq_badge: 'Questions & Answers',
      faq_title: 'Frequently Asked Questions',
      faq_q1: 'Who can access the Guray Sicid Learning Platform?',
      faq_a1: 'The platform is built for enrolled students, faculty professors, and academic administrators. Public visitors can freely explore features and the interactive demo.',
      faq_q2: 'How do students and professors log in?',
      faq_a2: 'Click the "Student Login" button in the navigation bar to go to the official login portal, where you can enter your registered institutional credentials.',
      faq_q3: 'Can I access the platform on mobile devices and tablets?',
      faq_a3: 'Yes. The entire platform, video player, and examination runner are 100% responsive and optimized for smartphones, tablets, and desktops.',
      faq_q4: 'Is the platform available in Somali?',
      faq_a4: 'Yes! Guray Sicid Learning Platform features full bilingual support for both Somali (Af-Soomaali) and English with instant one-click switching.',

      cta_title: 'Ready to Experience Modern Academic Education?',
      cta_subtitle: 'Explore our interactive demo today or log in to your official university learning account.',
      cta_btn_demo: 'Explore Public Demo',
      cta_btn_login: 'Student Login Portal',

      footer_tagline: 'Learning without limit. Modern, reliable academic learning management system.',
      footer_nav: 'Quick Navigation',
      footer_academic: 'Academic Faculty',
      footer_contact: 'Information & Support',
      footer_rights: 'Guray Sicid Learning Platform. All rights reserved.'
    },

    so: {
      nav_home: 'Bogga Hore',
      nav_features: 'Astaamaha',
      nav_demo: 'Tijaabada Tooska ah',
      nav_tutorials: 'Muuqaallada Tababarka',
      nav_login: 'Galitaanka Ardayda',
      nav_portal: 'Fur Nidaamka LMS',

      hero_badge: 'Nidaamka Casriga ah ee Waxbarashada Sare',
      hero_title_1: 'Awood Siinta Aqoonta &',
      hero_title_2: 'Guusha Waxbarashada',
      hero_desc: 'Guray Sicid Learning Platform waa barxad tacliimeed heer sare ah oo ardayda iyo macallimiinta u saamaxaysa daawashada casharrada fiidyowga ah, qaadashada imtixaanaadka tooska ah, la socodka dhibcaha, iyo helista shahaadooyinka rasmiga ah.',
      hero_btn_demo: 'Tijaabi Nidaamka Hadda',
      hero_btn_login: 'Galitaanka Ardayda & Macallimiinta',
      hero_proof_1: 'Laba Luuqadood (Soomaali & Ingiriis)',
      hero_proof_2: 'Sixitaanka Tooska ah ee Imtixaanaadka',
      hero_proof_3: 'Billado & Shahaadooyin La Xaqiijin Karo',

      features_badge: 'Awoodaha Nidaamka',
      features_title: 'Loo Dhisay Waxbarashada Casriga ah',
      features_subtitle: 'Waxaa loo habeeyay inuu bixiyo khibrad fasal online ah oo sahlan, hufan, isla markaana la isku halayn karo.',

      feat_1_title: 'Daawashada Casharrada Muuqaalka',
      feat_1_desc: 'Fiidyowyo tayo sare leh oo aad xawaarahooda wax ka bedeli karto (0.75x ilaa 2x), qaab shaashad ballaaran, iyo diiwaangelin sax ah oo ilbiriqsiyada la socota.',

      feat_2_title: 'Qaadashada Imtixaanaadka Online-ka',
      feat_2_desc: 'Imtixaanno leh waqti xaddidan oo isugu jira doorasho hal ah, doorasho badan, run/been, iyo qoraal gaaban oo leh sixitaan toos ah.',

      feat_3_title: 'Gudbinta Layliyada & Jawaab-celinta',
      feat_3_desc: 'Soo gelinta layliyada iyo faylasha oo macallinku si toos ah dhibco iyo talo bixin faahfaahsan ugu siinayo ardayga.',

      feat_4_title: 'Xisaabinta Dhibcaha & Gradebook',
      feat_4_desc: 'Xisaabin toos ah oo la socota dhibcaha guud ee koorsada, celceliska darajada (Grade A-F), iyo miisaanka layli kasta.',

      feat_5_title: 'La Socodka Xaadiriska Ardayda',
      feat_5_desc: 'Diiwaanka xaadiriska macallinka oo qoraya ardayga joogay, kii daahay, iyo kii cudurdaar lahaa oo digniin siinaya ardayda halista ku jira.',

      feat_6_title: 'Billado & Shahaadooyin La Aqoonsan Yahay',
      feat_6_desc: 'Abaalmarino waxbarasho iyo shahaadooyin rasmi ah oo leh lambar aqoonsi (UUID) oo online-ka laga xaqiijin karo.',

      demo_sec_badge: 'Tijaabo Biyo-la\'aan ah',
      demo_sec_title: 'Tijaabi Khibradda Ardayga Adigoon Is-diiwaangelin',
      demo_sec_subtitle: 'Sahmi nidaamka muunadda ah ee ardayga tijaabada ah. Daalaco casharrada, tijaabi imtixaanka, adigoon xisaab cusub u baahnayn.',
      demo_btn_explore: 'Fur Tijaabada Tooska ah',

      courses_badge: 'Koorsooyinka Kulliyadda',
      courses_title: 'Koorsooyinka Rasmiga ah ee Diyaarka ah',
      courses_subtitle: 'Tusaale koorsooyinka manhajka heerka jaamacadeed ee ay bixiyaan macallimiinta khibradda u leh.',

      how_badge: 'Tallaabo Tallaabo',
      how_title: 'Sidee Nidaamka Guray Sicid u Shaqeeyaa?',
      step_1_title: '1. Galitaanka Nidaamka',
      step_1_desc: 'Ardaydu waxay akoonkooda ku galaan email-ka iyo furaha sirta ah ee jaamacadda laga siiyay.',
      step_2_title: '2. Helitaanka Koorsooyinka',
      step_2_desc: 'Daalaco manhajka koorsada, slides-ka macallinka, iyo qoraallada muhiimka ah ee toddobaad kasta.',
      step_3_title: '3. Daawashada Muuqaallada & Layliyada',
      step_3_desc: 'Daawo casharrada fiidyowga ah, gudbi layliyada la xariira aqoontaada, kana qayb qaado imtixaanaadka.',
      step_4_title: '4. La Socodka Dhibcaha & Shahaadada',
      step_4_desc: 'Ogow dhibcahaaga tooska ah, qaado billadaha dadaalka, kuna qallin-jebi shahaado rasmi ah.',

      tut_badge: 'Muuqaallada Tababarka',
      tut_title: 'Baro Sida Loo Isticmaalo Nidaamka',
      tut_subtitle: 'Muuqaallo tallaabo-tallaabo ah oo ku baxaya af-Soomaali iyo Ingiriis si ay ardayda iyo macallimiintu ugu fududaato isticmaalka.',
      tut_btn_view_all: 'Daawo Dhammaan Tababarrada',

      faq_badge: 'Su\'aalo & Jawaabo',
      faq_title: 'Su\'aalaha Badanaa La Isweydiiyo',
      faq_q1: 'Yaa isticmaali kara Guray Sicid Learning Platform?',
      faq_a1: 'Nidaamka waxaa loogu talagalay ardayda diiwaangashan, macallimiinta, iyo maamulka kulliyadda. Dadweynaha kale waxay tijaabin karaan bannaanka.',
      faq_q2: 'Sidee ardayda iyo macallimiintu u galaan nidaamka?',
      faq_a2: 'Guji badhanka "Galitaanka Ardayda" si aad ugu gudubto bogga rasmiga ah ee login-ka adigoo adeegsanaya email-kaaga iyo password-kaaga.',
      faq_q3: 'Miyaan taleefanka gacanta ku isticmaali karaa?',
      faq_a3: 'Haa, nidaamka oo dhan wuxuu 100% u shaqeeyaa taleefannada casriga ah, tablets-ka, iyo kombuyuutarrada si aad u fudud.',
      faq_q4: 'Nidaamku miyuu ku hadlaa Af-Soomaali?',
      faq_a4: 'Haa! Guray Sicid Learning Platform wuxuu si buuxda u taageeraa Af-Soomaaliga iyo Ingiriiska adigoo hal gujin ku baddali kara.',

      cta_title: 'Diyaar ma u tahay inaad bilaabato waxbarasho aan xad lahayn?',
      cta_subtitle: 'Tijaabi muunadda tooska ah maanta ama gal akoonkaaga rasmiga ah ee waxbarashada.',
      cta_btn_demo: 'Fur Tijaabada Biyo-la\'aanta ah',
      cta_btn_login: 'Gal Akoonkaaga Ardaynimo',

      footer_tagline: 'Waxbarasho bilaa xad ah (Learning without limit). Nidaam tacliimeed casri ah oo la isku halayn karo.',
      footer_nav: 'Bogagga Muhiimka ah',
      footer_academic: 'Kulliyadaha Waxbarashada',
      footer_contact: 'Xiriirka & Taageerada',
      footer_rights: 'Guray Sicid Learning Platform. Dhammaan xuquuqdu waa dhowran tahay.'
    }
  },

  t(key) {
    const lang = this.currentLang;
    if (this.translations[lang] && this.translations[lang][key]) {
      return this.translations[lang][key];
    }
    return this.translations['en'][key] || key;
  },

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'so' : 'en';
    localStorage.setItem('public_site_lang', this.currentLang);
    this.applyLanguage();
  },

  applyLanguage() {
    const lang = this.currentLang;
    document.documentElement.setAttribute('lang', lang);

    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // Update language button
    const flagEl = document.getElementById('public-lang-flag');
    const labelEl = document.getElementById('public-lang-label');
    if (flagEl) flagEl.textContent = lang === 'so' ? '🇸🇴' : '🇬🇧';
    if (labelEl) labelEl.textContent = lang === 'so' ? 'Soomaali' : 'English';
  }
};

const PublicApp = {
  init() {
    PublicI18N.applyLanguage();
    this.setupAuthIndicator();
    this.setupFaqAccordion();
    this.setupMobileMenu();
    this.setupSmoothScroll();
  },

  setupAuthIndicator() {
    // If the user already has an active session token, adapt login buttons
    const token = localStorage.getItem('faculty_lms_token');
    const userRaw = localStorage.getItem('faculty_lms_user');
    let user = null;
    try { user = userRaw ? JSON.parse(userRaw) : null; } catch (e) {}

    if (token) {
      document.querySelectorAll('.btn-login-cta').forEach(btn => {
        btn.href = '/app.html#/dashboard';
        const userName = user?.full_name ? user.full_name.split(' ')[0] : 'Portal';
        btn.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 8px #10b981;"></span> ${PublicI18N.t('nav_portal')} (${userName})`;
      });
    }
  },

  setupFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        
        // Close all other accordion items
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });
  },

  setupMobileMenu() {
    const openBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-close-btn');
    const drawer = document.getElementById('mobile-drawer');

    if (openBtn && drawer) {
      openBtn.addEventListener('click', () => drawer.classList.add('open'));
    }
    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
    }
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (drawer) drawer.classList.remove('open');
      });
    });
  },

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#' || href.startsWith('#/')) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  PublicApp.init();
});
