// ====================================================================
// GURAY SICID LEARNING PLATFORM - INTERNATIONALIZATION (i18n) ENGINE
// Supports: Somali (so) & English (en) across all platform components
// ====================================================================

const I18N = {
  currentLang: localStorage.getItem('app_lang') || 'so',

  translations: {
    en: {
      brand: {
        name: 'Guray Sicid Learning Platform',
        tagline: 'Learning without limit',
        faculty: 'Academic Excellence'
      },
      nav: {
        dashboard: 'Dashboard',
        courses: 'Course Catalog',
        gradebook: 'Gradebook Matrix',
        attendance: 'Attendance Records',
        badges: 'Badges & Certificates',
        discussions: 'Course Forum',
        calendar: 'Deadlines & Calendar',
        messages: 'Direct Messenger',
        students: 'Student Accounts & Access',
        admin: 'System Maintenance',
        search_placeholder: 'Search courses, lessons, assignments...',
        logout: 'Log Out',
        academic_nav: 'Academic Navigation',
        faculty_mgmt: 'Management & Access',
        switch_lang: 'Luuqada: Soomaali'
      },
      dashboard: {
        welcome_prof: 'Welcome back',
        welcome_student: 'Welcome',
        prof_overview: 'Academic Overview & Class Management',
        student_overview: 'Your Academic Progress & Schedule',
        stat_students: 'Enrolled Students',
        stat_courses: 'Active Courses',
        stat_assignments: 'Assignments & Labs',
        stat_exams: 'Examinations',
        stat_completed: 'Completed Courses',
        stat_in_progress: 'In Progress Courses',
        stat_badges: 'Achievements',
        new_course_btn: '+ New Course',
        open_gradebook_btn: '📊 Open Gradebook',
        courses_teach: 'Courses You Teach',
        my_courses: 'My Enrolled Courses',
        no_courses_title: 'No Courses Added Yet',
        no_courses_desc: 'Start creating your curriculum and publishing learning materials today.',
        create_course_now: '+ Create First Course',
        open_course: 'Open Course',
        roster: 'Roster',
        grades: 'Grades',
        edit: 'Edit',
        delete: 'Delete',
        students_count: 'Students',
        modules_count: 'Modules',
        assignments_count: 'Assignments',
        target_year_badge: 'Target Level'
      },
      courses: {
        create_title: 'Create New Course',
        edit_title: 'Edit Course Details',
        code: 'Course Code *',
        title: 'Course Title *',
        description: 'Course Description',
        pass_percentage: 'Passing % (Default 60)',
        target_year: 'Target Academic Year / Level *',
        year_all: 'All Academic Years (Open)',
        year_1: 'Year 1 (First Year Only)',
        year_2: 'Year 2 (Second Year Only)',
        year_3: 'Year 3 (Third Year Only)',
        year_4: 'Year 4 (Fourth Year Only)',
        thumbnail: 'Course Thumbnail',
        custom_image: 'Upload custom image',
        url_image: 'or paste image URL',
        submit_create: '🚀 Create Course',
        submit_update: 'Save Changes',
        cancel: 'Cancel',
        section_add: '+ Add Section',
        activity_add: '+ Add Activity',
        course_syllabus: 'Course Syllabus & Modules',
        overview_tab: 'Overview',
        content_tab: 'Course Content',
        grades_tab: 'Gradebook',
        attendance_tab: 'Attendance',
        announcements_tab: 'Announcements',
        forum_tab: 'Forum',
        participants_tab: 'Participants'
      },
      students: {
        page_title: 'Student Accounts & Course Access Control',
        page_desc: 'Create student accounts, assign academic years (Year 1 to Year 4), and control course access permissions.',
        register_btn: '+ Register New Student',
        stat_total: 'Total Registered Students',
        stat_active: 'Active (Allowed to Login)',
        stat_inactive: 'Deactivated / Blocked',
        roster_title: 'Student Access Roster',
        roster_sub: 'Control student login rights, assign Year 1 - Year 4 access, and manage credentials',
        col_student: 'Student',
        col_id: 'Student ID',
        col_email: 'Email Address',
        col_year: 'Academic Level',
        col_courses: 'Course Access',
        col_status: 'Login Status',
        col_actions: 'Actions',
        modal_title: 'Register New Student Account',
        modal_edit_title: 'Update Student Information & Course Access',
        full_name: 'Full Name',
        student_id: 'Student ID Number',
        email: 'Email Address',
        password: 'Password',
        select_year: 'Academic Year / Level *',
        allowed_courses_label: 'Custom Course Access (Select specific courses allowed):',
        auto_year_note: 'Leave unchecked to auto-grant all courses matching student\'s academic year.',
        grant_login_now: 'Grant Login Access Immediately',
        submit_create_btn: 'Create & Enroll Student',
        submit_edit_btn: 'Save Student Changes',
        deactivate_btn: 'Deactivate Access',
        activate_btn: 'Enable Access',
        edit_btn: 'Edit Access',
        reset_key_btn: 'Reset Key',
        delete_btn: 'Remove Student'
      },
      admin: {
        page_title: 'System Administration & Maintenance',
        page_desc: 'Security governance, persistent backup diagnostics, and administrator account management',
        download_backup: '💾 Download SQLite Backup',
        status_online: 'ONLINE',
        uptime: 'System Status',
        file_size: 'Database File Size',
        records: 'Platform Records',
        admins_title: 'Administrator Accounts Management',
        admins_sub: 'Create and manage system administrator accounts with full configuration privileges',
        register_admin_btn: '+ Register New Administrator',
        col_admin_name: 'Administrator',
        col_email: 'Email',
        col_dept: 'Department / Role',
        col_created: 'Registered Date',
        col_actions: 'Actions',
        modal_admin_title: 'Register New Platform Administrator',
        modal_admin_btn: 'Register Administrator',
        audit_title: 'Security & Activity Audit Logs',
        audit_sub: 'Real-time security events, course modifications, and user logins',
        reset_pw_title: 'User Password Reset Tool',
        reset_pw_btn: 'Update Password',
        mock_clear_btn: 'Clear Mock Data (Wipe Test Records)'
      },
      messages: {
        page_title: 'Direct Academic Messages',
        page_desc: 'Private real-time communication channel with multimedia attachment support (images & documents)',
        conversations: 'Conversations',
        type_placeholder: 'Type your message or attach a file...',
        send_btn: 'Send',
        attach_tooltip: 'Attach photo or document (PDF, Word, Excel)',
        empty_thread: 'No messages yet with this contact. Send a message or file to connect.',
        selected_file: 'Attached File:',
        remove_file: 'Remove',
        image_label: '📷 Image',
        document_label: '📄 Document'
      },
      login: {
        portal_title: 'Guray Sicid Learning Platform',
        portal_tagline: 'Learning without limit',
        heading: 'Sign In to Your Account',
        sub: 'Please enter your registered credentials to access the academic system.',
        email_label: 'Email Address',
        email_placeholder: 'name@faculty.edu',
        password_label: 'Password',
        password_placeholder: 'Enter password',
        signin_btn: 'Sign In to Platform',
        footer_note: 'Student accounts are created and provisioned by the faculty administration.',
        welcome_msg: 'Welcome!',
        redirecting: 'Redirecting to your academic portal...'
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        loading: 'Loading...',
        success: 'Operation completed successfully!',
        error: 'An error occurred. Please try again.',
        active: 'Active',
        inactive: 'Blocked',
        all: 'All'
      }
    },
    so: {
      brand: {
        name: 'Guray Sicid Learning Platform',
        tagline: 'Learning without limit',
        faculty: 'Waxbarasho Tayo Sare Leh'
      },
      nav: {
        dashboard: 'Xarunta Guud (Dashboard)',
        courses: 'Liiska Koorsooyinka',
        gradebook: 'Diiwaanka Buundooyinka',
        attendance: 'Diiwaanka Xaadiriska',
        badges: 'Shahaadooyinka & Biladaha',
        discussions: 'Madasha Koorsooyinka',
        calendar: 'Kalandarka & Waqtiyada',
        messages: 'Fariimaha Tooska ah',
        students: 'Akoonada Ardayda & Fasaxa',
        admin: 'Maamulka & Ciladbixinta',
        search_placeholder: 'Raadi koorsooyin, casharro, layliyo...',
        logout: 'Ka bax (Log Out)',
        academic_nav: 'Qaybaha Waxbarashada',
        faculty_mgmt: 'Maamulka & Fasaxa',
        switch_lang: 'Language: English'
      },
      dashboard: {
        welcome_prof: 'Ku soo dhawow mar kale',
        welcome_student: 'Ku soo dhawow',
        prof_overview: 'Dulmarka Waxbarashada & Maamulka Fasalada',
        student_overview: 'Heerkaaga Waxbarasho & Qorshaha Casharrada',
        stat_students: 'Ardayda Dhigata',
        stat_courses: 'Koorsooyinka Socda',
        stat_assignments: 'Layliyada & Labs-ka',
        stat_exams: 'Imtixaanaadka',
        stat_completed: 'Koorsooyinka Dhamaaday',
        stat_in_progress: 'Koorsooyinka Socda',
        stat_badges: 'Guulahaaga & Biladaha',
        new_course_btn: '+ Koorso Cusub',
        open_gradebook_btn: '📊 Fur Buundooyinka',
        courses_teach: 'Koorsooyinka aad Dhigto',
        my_courses: 'Koorsooyinka aan Dhigto',
        no_courses_title: 'Weli Koorso Laguma darin',
        no_courses_desc: 'Bilaab hadda abuurista koorsadaada koowaad iyo soo gelinta casharrada.',
        create_course_now: '+ Abuur Koorso Cusub',
        open_course: 'Fur Koorsada',
        roster: 'Liiska Ardayda',
        grades: 'Buundooyinka',
        edit: 'Wax ka baddal',
        delete: 'Tirtir',
        students_count: 'Arday',
        modules_count: 'Qaybood',
        assignments_count: 'Layliyo',
        target_year_badge: 'Heerka Sanadka'
      },
      courses: {
        create_title: 'Abuur Koorso Cusub',
        edit_title: 'Wax ka baddal Xogta Koorsada',
        code: 'Koodhka Koorsada *',
        title: 'Cinwaanka Koorsada *',
        description: 'Faahfaahinta Koorsada',
        pass_percentage: 'Boqolkiiba Gudubta (Default 60%)',
        target_year: 'Heerka / Sanadka Koorso (Target Level) *',
        year_all: 'Dhammaan Sanadaha (Furan)',
        year_1: 'Year 1 (Ardayda Sanadka 1-aad oo Kaliya)',
        year_2: 'Year 2 (Ardayda Sanadka 2-aad oo Kaliya)',
        year_3: 'Year 3 (Ardayda Sanadka 3-aad oo Kaliya)',
        year_4: 'Year 4 (Ardayda Sanadka 4-aad oo Kaliya)',
        thumbnail: 'Sawirka Koorsada (Thumbnail)',
        custom_image: 'Ka soo geli kombiyuutarkaaga',
        url_image: 'ama geli link-ga sawirka',
        submit_create: '🚀 Abuur Koorsada',
        submit_update: 'Keydi Isbaddallada',
        cancel: 'Jooji',
        section_add: '+ Qayb Cusub',
        activity_add: '+ Cashar / Qalab Cusub',
        course_syllabus: 'Qorshaha Koorsada & Qaybaha',
        overview_tab: 'Dulmar',
        content_tab: 'Casharrada',
        grades_tab: 'Buundooyinka',
        attendance_tab: 'Xaadiris',
        announcements_tab: 'Ogeysiisyada',
        forum_tab: 'Doodaha',
        participants_tab: 'Ardayda Dhigata'
      },
      students: {
        page_title: 'Maamulka Akoonada Ardayda & Fasaxa Koorsooyinka',
        page_desc: 'Abuur akoonada ardayda, u qoondee sanadaha (Year 1 - Year 4), oo xakamee koorsooyinka loo fasaxay.',
        register_btn: '+ Diiwaangeli Arday Cusub',
        stat_total: 'Wadarta Ardayda Diiwaangashan',
        stat_active: 'Firfircoon (Geli kara)',
        stat_inactive: 'Xiran / Fasax lahayn',
        roster_title: 'Diiwaanka Ardayda & Fasaxa',
        roster_sub: 'Xakamee xuquuqda gelitaanka, heerka sanadka (Year 1 - Year 4), iyo dib-u-dejinta furaha sirta',
        col_student: 'Ardayga',
        col_id: 'Aqoonsiga (ID)',
        col_email: 'Email-ka',
        col_year: 'Sanadka / Heerka',
        col_courses: 'Koorsooyinka Loo Furay',
        col_status: 'Xaaladda Gelitaanka',
        col_actions: 'Hawlgallada',
        modal_title: 'Diiwaangeli Akoon Arday Cusub',
        modal_edit_title: 'Wax ka baddal Xogta Ardayga & Fasaxa Koorsooyinka',
        full_name: 'Magaca Oo Buuxa',
        student_id: 'Lambarka Aqoonsiga Ardayga (Student ID)',
        email: 'Cinwaanka Email-ka',
        password: 'Furaha Sirta ah (Password)',
        select_year: 'Sanadka / Heerka Waxbarasho *',
        allowed_courses_label: 'Dooro koorsooyinka gaarka ah ee loo furayo ardaygan:',
        auto_year_note: 'Haddii aadan dooran, si toos ah ayaa loogu furayaa koorsooyinka sanadkiisa.',
        grant_login_now: 'Sii Fasaxa Gelitaanka Hadda',
        submit_create_btn: 'Abuur & Diiwaangeli Ardayga',
        submit_edit_btn: 'Keydi Xogta Ardayga',
        deactivate_btn: 'Xir Fasaxa',
        activate_btn: 'Fur Fasaxa',
        edit_btn: 'Baddal Fasaxa',
        reset_key_btn: 'Baddal Furaha',
        delete_btn: 'Tirtir Ardayga'
      },
      admin: {
        page_title: 'Maamulka Guud ee Nidaamka & Ciladbixinta',
        page_desc: 'Ilaalinta amniga, kaydinta joogtada ah (persistent database), iyo diiwaangelinta maamulayaasha',
        download_backup: '💾 Degso Nuqulka Kaydka ah (SQLite Backup)',
        status_online: 'ONLINE (SHIBIQ)',
        uptime: 'Xaaladda Nidaamka',
        file_size: 'Baaxadda Faylka Database-ka',
        records: 'Xogta ku jirta Nidaamka',
        admins_title: 'Maamulka Akoonada Maamulayaasha (Admins)',
        admins_sub: 'Diiwaangeli maamulayaal cusub oo awood u leh xakameynta iyo ciladbixinta nidaamka',
        register_admin_btn: '+ Diiwaangeli Maamule Cusub',
        col_admin_name: 'Maamulaha',
        col_email: 'Email',
        col_dept: 'Waaxda / Xilka',
        col_created: 'Taariikhda Diiwaangelinta',
        col_actions: 'Hawlgallada',
        modal_admin_title: 'Diiwaangeli Maamule Cusub',
        modal_admin_btn: 'Abuur Maamulaha',
        audit_title: 'Xogta Dhaqdhaqaaqa Amniga (Audit Logs)',
        audit_sub: 'Diiwaanka tooska ah ee tallaabooyinka amniga, koorsooyinka, iyo gelitaannada',
        reset_pw_title: 'Qalabka Dib-u-Dejinta Furaha Sirta',
        reset_pw_btn: 'Cusboonaysii Furaha',
        mock_clear_btn: 'Nadiifi Xogtii Mock-ga Ahayd'
      },
      messages: {
        page_title: 'Fariimaha Tooska ah ee Waxbarashada',
        page_desc: 'Wada-hadal gaar ah oo toos ah oo la isugu diri karo qoraal, sawirro, iyo dukumentiyo (PDF, Word)',
        conversations: 'Wada-hadallada',
        type_placeholder: 'Qor fariintaada ama dooro sawir/document aad dirayso...',
        send_btn: 'Dir',
        attach_tooltip: 'Ku lifaaq sawir ama document (PDF, Word, Excel)',
        empty_thread: 'Weli ma jiro fariimo aad is-dhaafsateen. Hadda fariin ama fayl u dir si aad u xiriirtaan.',
        selected_file: 'Faylka la doortay:',
        remove_file: 'Ka saar',
        image_label: '📷 Sawir',
        document_label: '📄 Document'
      },
      login: {
        portal_title: 'Guray Sicid Learning Platform',
        portal_tagline: 'Learning without limit',
        heading: 'Gal Akoonkaaga',
        sub: 'Fadlan geli xogtaada saxda ah si aad u gasho nidaamka waxbarashada.',
        email_label: 'Cinwaanka Email-ka',
        email_placeholder: 'magac@faculty.edu',
        password_label: 'Furaha Sirta ah (Password)',
        password_placeholder: 'Geli furahaaga sirta',
        signin_btn: 'Gal Nidaamka',
        footer_note: 'Akoonka ardayda waxaa sameeya Maamulka Kuliyadda.',
        welcome_msg: 'Ku soo dhawow!',
        redirecting: 'Waxaa si toos ah laguu galinayaa boggaaga...'
      },
      common: {
        save: 'Keydi',
        cancel: 'Jooji',
        delete: 'Tirtir',
        edit: 'Wax ka baddal',
        close: 'Xir',
        loading: 'Fadlan sug, waa la soo rarayaa...',
        success: 'Hawsha si guul leh ayaa loo qabtay!',
        error: 'Cilad ayaa dhacday. Fadlan dib u tijaabi.',
        active: 'Firfircoon',
        inactive: 'Xiran',
        all: 'Dhammaan'
      }
    }
  },

  getLang() {
    return this.currentLang;
  },

  setLang(lang) {
    if (lang !== 'so' && lang !== 'en') lang = 'so';
    this.currentLang = lang;
    localStorage.setItem('app_lang', lang);
    document.documentElement.setAttribute('lang', lang);

    // Dispatch global event for views to re-render
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
  },

  toggleLang() {
    const next = this.currentLang === 'so' ? 'en' : 'so';
    this.setLang(next);
    return next;
  },

  t(path, fallback = '') {
    const keys = path.split('.');
    let cur = this.translations[this.currentLang];
    for (const k of keys) {
      if (cur && cur[k] !== undefined) {
        cur = cur[k];
      } else {
        // Fallback to English if missing in Somali
        let alt = this.translations['en'];
        for (const ak of keys) {
          if (alt && alt[ak] !== undefined) {
            alt = alt[ak];
          } else {
            return fallback || path;
          }
        }
        return alt || fallback || path;
      }
    }
    return cur || fallback || path;
  }
};

window.I18N = I18N;
