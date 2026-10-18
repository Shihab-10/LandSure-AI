/**
 * LandSure AI — Phase 1 Design System & Bilingual Translations
 * Default: Bengali ("bn")
 * Secondary: English ("en")
 */

export type Language = "bn" | "en";

export const translations = {
  bn: {
    // Navbar
    navBadge: "AI LAND INTELLIGENCE",
    navHow: "কীভাবে কাজ করে",
    navFeatures: "ফিচারসমূহ",
    navAllFeatures: "সব ফিচার",
    navDemo: "ডেমো",
    navFaq: "FAQ",
    navLogin: "লগইন",
    navStartDemo: "জমি যাচাই শুরু করুন",
    navToggleThemeLight: "লাইট মোড",
    navToggleThemeDark: "ডার্ক মোড",
    navToggleLang: "EN",

    // Hero
    heroEyebrow: "The Future of Land Verification",
    heroSubEyebrow: "বাংলাদেশের স্মার্ট ভূমি যাচাই প্ল্যাটফর্ম",
    heroTitleLine1: "জমি কেনার আগে,",
    heroTitleLine2: "সত্যটা জানুন।",
    heroTitlePrefix: "জমি কেনার আগে,",
    heroTitleHighlight: "সত্যটা",
    heroTitleSuffix: "জানুন।",
    heroDesc: "মালিকানার ইতিহাস, দলিল যাচাই, সম্ভাব্য ঝুঁকি, বিকল্প জমি ও বিশেষজ্ঞের সহায়তা—সবকিছু একটি স্মার্ট প্ল্যাটফর্মে।",
    heroCtaPrimary: "জমি যাচাই শুরু করুন",
    heroCtaSecondary: "ডেমো দেখুন",
    heroDisclaimer1: "AI-assisted insights • Evidence-linked analysis • Human verification recommended",
    heroDisclaimer2: "এটি একটি প্রোটোটাইপ। প্রদর্শিত জমির তথ্য সিন্থেটিক এবং সরকারি যাচাইয়ের বিকল্প নয়।",

    // Demo Video
    demoTitle: "এক নজরে দেখুন LandSure AI",
    demoSub: "জমি খোঁজা থেকে AI বিশ্লেষণ এবং যাচাই রিপোর্ট—পুরো অভিজ্ঞতা দেখুন আমাদের ডেমো ভিডিওতে।",
    demoPlayAria: "ডেমো ভিডিও চালান",
    demoNotice: "ডেমো ভিডিও শীঘ্রই যুক্ত হবে",
    demoNoticePlay: "চালাতে ক্লিক করুন",
    demoFullscreen: "ফুলস্ক্রিন",

    // Metrics
    metric1Val: 700,
    metric1Suffix: "+",
    metric1Label: "সিন্থেটিক ডেমো জমির রেকর্ড",
    metric2Val: 26,
    metric2Suffix: "টি",
    metric2Label: "পরিকল্পিত কোর ফিচার ও মডিউল",
    metric3Val: 8,
    metric3Suffix: " বিভাগ",
    metric3Label: "বাংলাদেশের প্রশাসনিক লোকেশন ব্রাউজিং",
    metricFootnote: "পরিসংখ্যানগুলো বর্তমান ডেমো সিস্টেমের সক্ষমতা নির্দেশ করে।",

    // Problem & Solution
    problemEyebrow: "The Problem",
    problemTitle: "জমি কেনার আগে তথ্যের জটিলতা কেন এত বেশি?",
    problemSub: "দলিল, খতিয়ান, মালিকানা, নামজারি ও জমির বাস্তব অবস্থা—প্রতিটি বিষয় আলাদাভাবে যাচাই করতে হয়। গুরুত্বপূর্ণ কোনো অমিল চোখ এড়িয়ে গেলে সিদ্ধান্ত নেওয়া কঠিন হয়ে পড়ে।",
    problemBeforeLabel: "আগে",
    problemBeforeHeading: "প্রচলিত প্রক্রিয়া",
    problemBeforeItems: [
      "ছড়িয়ে থাকা জমির তথ্য",
      "মালিকানা ইতিহাস বুঝতে অসুবিধা",
      "দলিল ও রেকর্ডের অমিল",
      "সম্ভাব্য ঝুঁকির স্পষ্ট ধারণার অভাব",
    ],
    problemAfterLabel: "এখন",
    problemAfterHeading: "LandSure AI",
    problemAfterItems: [
      "এক জায়গায় উপলব্ধ সমন্বিত তথ্য",
      "মালিকানা পরিবর্তনের ভিজ্যুয়াল টাইমলাইন",
      "দলিল ও খতিয়ানের ফিল্ড-টু-ফিল্ড তুলনা",
      "AI-assisted ঝুঁকি ও প্রমাণের ব্যবধান বিশ্লেষণ",
    ],

    // How It Works
    howEyebrow: "How It Works",
    howTitle: "মাত্র তিন ধাপে জমি যাচাইয়ের যাত্রা",
    howSub: "জমি খুঁজুন, তথ্য ও সম্ভাব্য ঝুঁকি বুঝুন, তারপর আত্মবিশ্বাসের সঙ্গে সিদ্ধান্ত নিন।",
    step1Num: "01",
    step1Title: "জমি খুঁজুন",
    step1Desc: "বিভাগ, জেলা, উপজেলা বা মৌজা নির্বাচন করে উপলব্ধ ডেমো জমি খুঁজুন। ইন্টারঅ্যাকটিভ ম্যাপে আনুমানিক সীমানা ও দাগ নম্বর দেখুন।",
    step2Num: "02",
    step2Title: "তথ্য ও ঝুঁকি যাচাই করুন",
    step2Desc: "মালিকানা ইতিহাস, দলিলের অমিল, সম্ভাব্য দ্বৈত বিক্রয় এবং যাচাইয়ের ঘাটতি পর্যালোচনা করুন।",
    step3Num: "03",
    step3Title: "সিদ্ধান্তের আগে নিশ্চিত হোন",
    step3Desc: "Land Trust Passport সংগ্রহ করুন, বিকল্প জমি তুলনা করুন এবং প্রয়োজনে বিজ্ঞ আইনজীবীর পরামর্শ নিন।",

    // Features Showcase
    featuresEyebrow: "Feature Showcase",
    featuresTitle: "জমি যাচাইয়ের প্রয়োজনীয় সবকিছু একটি স্মার্ট প্ল্যাটফর্মে",
    featuresSub: "জমির তথ্য অনুসন্ধান থেকে প্রমাণভিত্তিক রিপোর্ট—প্রতিটি ধাপকে আরও সহজভাবে বুঝুন।",
    featCategoryDoc: "DOCUMENT INTELLIGENCE",
    featTitleDoc: "দলিল ও খতিয়ান বিশ্লেষণ",
    featDescDoc: "দলিলের পাঠযোগ্য তথ্য সংগ্রহ করে সরকারি খতিয়ান রেকর্ডের সঙ্গে স্বয়ংক্রিয় তুলনা এবং সম্ভাব্য অমিল শনাক্তকরণ।",
    featCategoryNearby: "SPATIAL DISCOVERY",
    featTitleNearby: "কাছাকাছি বিকল্প জমি",
    featDescNearby: "একই মৌজা ও দূরত্বের মধ্যে তুলনামূলক বিকল্প জমি, আনুমানিক আয়তন ও তথ্য স্কোরের তাৎক্ষণিক বিশ্লেষণ।",
    featCategoryCopilot: "INTELLIGENT ADVISORY",
    featTitleCopilot: "LandSure AI Copilot",
    featDescCopilot: "জমির মালিকানা ও দলিল সংক্রান্ত যেকোনো প্রশ্ন বাংলায় জিজ্ঞাসা করুন এবং প্রমাণভিত্তিক নিরপেক্ষ ব্যাখ্যা পান।",
    featCategoryPassport: "DUE DILIGENCE REPORT",
    featTitlePassport: "Land Trust Passport",
    featDescPassport: "যাচাইকৃত তথ্য, অমিল সতর্কতা এবং সংযুক্ত প্রমাণের সারসংক্ষেপ নিয়ে তৈরি নির্ভরযোগ্য ডিজিটাল রিপোর্ট।",
    demoBadge: "ডেমো তথ্য",

    // All Features Directory
    allFeaturesEyebrow: "All Capabilities",
    allFeaturesTitle: "এক প্ল্যাটফর্মে ২৬টি স্মার্ট সক্ষমতা",
    allFeaturesSub: "প্রতিটি ফিচার স্বচ্ছ ও সৎ স্ট্যাটাস ব্যাজের সঙ্গে স্পষ্টভাবে বর্ণিত।",
    badgeDemo: "প্রোটোটাইপ ডেমো",
    badgeReview: "মানব যাচাই প্রয়োজন",
    badgePending: "সরকারি সংযোগ অপেক্ষমাণ",

    // Trust & Responsible AI
    trustEyebrow: "Responsible AI & Trust",
    trustTitle: "দায়িত্বশীল এআই ও স্বচ্ছতার অঙ্গীকার",
    trustSub: "LandSure AI কীভাবে কাজ করে এবং এর নীতিগত সীমাবদ্ধতাগুলো জেনে নেওয়া গুরুত্বপূর্ণ।",
    trustCards: [
      {
        title: "প্রমাণভিত্তিক সিদ্ধান্ত-সহায়তা",
        desc: "প্রতিটি সতর্কতা, স্কোর এবং ব্যাখ্যার সঙ্গে নির্দিষ্ট রেকর্ড ও প্রমাণের রেফারেন্স সংযুক্ত থাকে।",
      },
      {
        title: "মানুষের চূড়ান্ত যাচাই অপরিহার্য",
        desc: "এআই সিদ্ধান্ত গ্রহণে সহায়তা করে, তবে জমি রেজিস্ট্রির পূর্বে বিজ্ঞ আইনজীবী ও বালাম তল্লাশি আবশ্যক।",
      },
      {
        title: "সিন্থেটিক প্রদর্শনী ডেটাসেট",
        desc: "প্ল্যাটফর্মটি বর্তমানে ৭০০টি সিন্থেটিক জমি রেকর্ডে চলে এবং এটি কোনো সরকারি দলিলের আইনি প্রমাণ নয়।",
      },
      {
        title: "স্বচ্ছ এআই মডেল সীমাবদ্ধতা",
        desc: "বাংলা দলিলের হস্তলিপি কিংবা অস্পষ্ট তথ্যে নির্ভুলতার তারতম্য হলে সিস্টেম সরাসরি যাচাইয়ের নির্দেশনা দেয়।",
      },
    ],

    // Why LandSure AI
    whyEyebrow: "Why LandSure AI",
    whyTitle: "সিদ্ধান্ত নেওয়ার আগে তথ্য হোক আপনার শক্তি",

    // Free Demo Experience
    freeDemoEyebrow: "Free Demo Experience",
    freeDemoTitle: "LandSure AI ব্যবহার করে দেখুন",
    freeDemoSub: "সিন্থেটিক ডেটার মাধ্যমে জমি অনুসন্ধান, AI বিশ্লেষণ ও রিপোর্ট তৈরির অভিজ্ঞতা নিন।",
    freeDemoBadge: "সম্পূর্ণ ফ্রি ডেমো",
    freeDemoCta: "ফ্রি ডেমো শুরু করুন",
    freeDemoDisclaimer: "এটি একটি ডেমো প্ল্যাটফর্ম। সরকারি রেকর্ড যাচাই বা আইনগত পরামর্শের বিকল্প নয়।",

    // FAQ
    faqTitle: "আপনার প্রশ্ন, আমাদের উত্তর",
    faqSub: "LandSure AI সম্পর্কে গুরুত্বপূর্ণ বিষয়গুলো সহজ ভাষায় জানুন।",
    faqs: [
      {
        q: "LandSure AI কী?",
        a: "LandSure AI একটি AI-চালিত জমি যাচাই ও সিদ্ধান্ত-সহায়ক প্ল্যাটফর্ম। এটি জমির মালিকানা ইতিহাস, দলিল, খতিয়ান ও সম্ভাব্য ঝুঁকি এক জায়গায় বুঝতে সাহায্য করে। বর্তমানে এটি সিন্থেটিক ডেটাভিত্তিক একটি প্রোটোটাইপ।",
      },
      {
        q: "এটি কি সরকারি ভূমি রেকর্ড সরাসরি যাচাই করে?",
        a: "না। বর্তমান ডেমোতে কোনো সরকারি সিস্টেমের সঙ্গে সরাসরি সংযোগ নেই। প্রদর্শিত সব তথ্য সিন্থেটিক। ভবিষ্যতে অনুমোদিত সংযোগের পরিকল্পনা রয়েছে।",
      },
      {
        q: "জমির মালিকানা ইতিহাস কীভাবে দেখা যায়?",
        a: "Parcel Explorer থেকে একটি জমি নির্বাচন করলে Ownership Timeline-এ সময়ানুক্রমে মালিকানা পরিবর্তন, সংশ্লিষ্ট দলিল ও নামজারির তথ্য দেখা যায়।",
      },
      {
        q: "AI Risk Score কি জমি নিরাপদ হওয়ার নিশ্চয়তা দেয়?",
        a: "না। Risk Score শুধুমাত্র উপলব্ধ তথ্যের ভিত্তিতে সম্ভাব্য সতর্কতা নির্দেশ করে। এটি কোনো আইনগত নিশ্চয়তা নয়—চূড়ান্ত সিদ্ধান্তের আগে অবশ্যই সরকারি রেকর্ড ও বিশেষজ্ঞ দিয়ে যাচাই করুন।",
      },
      {
        q: "কাছাকাছি বিকল্প জমি কি দেখা যায়?",
        a: "হ্যাঁ। দূরত্ব, উপলব্ধ তথ্যের মান এবং নমুনা মূল্য অনুযায়ী আশেপাশের বিকল্প ডেমো জমি তুলনা করা যায়।",
      },
      {
        q: "বাংলা দলিল আপলোড করা যাবে?",
        a: "ডেমোতে বাংলা দলিল থেকে OCR-এর মাধ্যমে তথ্য সংগ্রহের প্রদর্শনী রয়েছে। হাতে লেখা বা অস্পষ্ট দলিলে নির্ভুলতা কম হতে পারে, তাই ফলাফল যাচাই করে নিন।",
      },
      {
        q: "রিপোর্ট কি PDF আকারে পাওয়া যাবে?",
        a: "Land Trust Passport রিপোর্ট প্রমাণের রেফারেন্সসহ তৈরি করা যায় এবং ডাউনলোডযোগ্য আকারে সংরক্ষণের সুবিধা মূল অ্যাপে রয়েছে।",
      },
      {
        q: "এটি কি মোবাইলে ব্যবহার করা যায়?",
        a: "হ্যাঁ। LandSure AI মোবাইল, ট্যাবলেট ও ডেস্কটপ—সব ধরনের স্ক্রিনে ব্যবহারের উপযোগী করে তৈরি।",
      },
      {
        q: "ডেমো ব্যবহার করতে কি টাকা লাগে?",
        a: "না। বর্তমান ডেমো সম্পূর্ণ ফ্রি। কোনো সাবস্ক্রিপশন বা পেমেন্টের প্রয়োজন নেই।",
      },
      {
        q: "LandSure AI কি আইনজীবীর বিকল্প?",
        a: "না। এটি তথ্য বুঝতে ও প্রশ্ন তৈরিতে সহায়তা করে, কিন্তু আইনগত পরামর্শের বিকল্প নয়। জমি কেনার আগে একজন অভিজ্ঞ আইনজীবীর পরামর্শ নেওয়া উচিত।",
      },
    ],

    // Final CTA
    finalCtaTitle1: "সঠিক তথ্য জানুন।",
    finalCtaTitle2: "ঝুঁকি বুঝুন।",
    finalCtaTitle3: "আত্মবিশ্বাসের সঙ্গে সিদ্ধান্ত নিন।",
    finalCtaDesc: "জমি কেনার আগে সম্ভাব্য ঝুঁকি সম্পর্কে আরও ভালোভাবে জানুন LandSure AI-এর সঙ্গে।",
    finalCtaBtn: "জমি যাচাই শুরু করুন",

    // Footer
    footerDesc: "বাংলাদেশের জন্য AI-চালিত জমি যাচাই ও সিদ্ধান্ত-সহায়ক প্ল্যাটফর্ম।",
    footerColPlatform: "প্ল্যাটফর্ম",
    footerColSupport: "সহায়তা",
    footerColAccount: "অ্যাকাউন্ট",
    footerRights: "© 2026 LandSure AI. All rights reserved.",
    footerAttribution: "Designed & Developed by",
    footerWatermarkTop: "AFTERTHOUGHT",
    footerWatermarkBottom: "LandSure AI",
  },

  en: {
    // Navbar
    navBadge: "AI LAND INTELLIGENCE",
    navHow: "How it Works",
    navFeatures: "Features",
    navAllFeatures: "All Features",
    navDemo: "Demo",
    navFaq: "FAQ",
    navLogin: "Login",
    navStartDemo: "Get Started",
    navToggleThemeLight: "Light Mode",
    navToggleThemeDark: "Dark Mode",
    navToggleLang: "বাং",

    // Hero
    heroEyebrow: "The Future of Land Verification",
    heroSubEyebrow: "Bangladesh's Smart Land Due Diligence Platform",
    heroTitleLine1: "Before buying land,",
    heroTitleLine2: "Know the truth.",
    heroTitlePrefix: "Before buying land,",
    heroTitleHighlight: "know",
    heroTitleSuffix: "the truth.",
    heroDesc: "Ownership history, deed verification, potential risks, alternative parcels, and legal counsel—all in one intelligent platform.",
    heroCtaPrimary: "Start Land Verification",
    heroCtaSecondary: "Watch Demo",
    heroDisclaimer1: "AI-assisted insights • Evidence-linked analysis • Human verification recommended",
    heroDisclaimer2: "Prototype demonstration. Displayed land records are synthetic and do not replace official verification.",

    // Demo Video
    demoTitle: "Experience LandSure AI at a Glance",
    demoSub: "From parcel search to AI risk review and downloadable verification reports—explore our demo.",
    demoPlayAria: "Play demo video",
    demoNotice: "Demo video coming soon",
    demoNoticePlay: "Click to play",
    demoFullscreen: "Fullscreen",

    // Metrics
    metric1Val: 700,
    metric1Suffix: "+",
    metric1Label: "Synthetic Demo Land Records",
    metric2Val: 26,
    metric2Suffix: "",
    metric2Label: "Planned Core Features & Modules",
    metric3Val: 8,
    metric3Suffix: " Divisions",
    metric3Label: "Administrative Location Coverage in Bangladesh",
    metricFootnote: "Metrics reflect current demonstration system capabilities.",

    // Problem & Solution
    problemEyebrow: "The Problem",
    problemTitle: "Why is land information so fragmented?",
    problemSub: "Deeds, khatians, mutation certificates, and physical boundaries are checked separately across multiple offices. Missing a critical discrepancy leads to costly disputes.",
    problemBeforeLabel: "Before",
    problemBeforeHeading: "Traditional Process",
    problemBeforeItems: [
      "Fragmented, scattered land records",
      "Difficult-to-trace ownership history",
      "Unnoticed deed and survey discrepancies",
      "Lack of clear risk assessment signals",
    ],
    problemAfterLabel: "Now",
    problemAfterHeading: "LandSure AI",
    problemAfterItems: [
      "Unified parcel intelligence in one place",
      "Visual timeline of historical transfers",
      "Field-to-field deed and khatian comparison",
      "AI-assisted risk scores and evidence gap tracking",
    ],

    // How It Works
    howEyebrow: "How It Works",
    howTitle: "Three Steps to Confident Land Verification",
    howSub: "Search parcels, evaluate potential risks, and make informed decisions with clarity.",
    step1Num: "01",
    step1Title: "Find the Parcel",
    step1Desc: "Select division, district, upazila, or mouza to locate parcels on our interactive cadastral map.",
    step2Num: "02",
    step2Title: "Analyze Records & Risks",
    step2Desc: "Review ownership chain continuity, deed mismatches, mutation records, and missing evidence gaps.",
    step3Num: "03",
    step3Title: "Confirm Before Closing",
    step3Desc: "Download your Land Trust Passport report, compare nearby alternatives, and connect with legal experts.",

    // Features Showcase
    featuresEyebrow: "Feature Showcase",
    featuresTitle: "Everything You Need for Land Due Diligence",
    featuresSub: "From cadastral location search to evidence-backed reporting—streamlined for modern buyers.",
    featCategoryDoc: "DOCUMENT INTELLIGENCE",
    featTitleDoc: "Document & Khatian Analysis",
    featDescDoc: "Automated cross-comparison between deed transcripts and cadastral survey records with discrepancy detection.",
    featCategoryNearby: "SPATIAL DISCOVERY",
    featTitleNearby: "Nearby Alternative Land",
    featDescNearby: "Discover comparable verified parcels in the same mouza by distance, land area, and data confidence score.",
    featCategoryCopilot: "INTELLIGENT ADVISORY",
    featTitleCopilot: "LandSure AI Copilot",
    featDescCopilot: "Ask questions about ownership chains and deed clauses in plain language with evidence-cited answers.",
    featCategoryPassport: "DUE DILIGENCE REPORT",
    featTitlePassport: "Land Trust Passport",
    featDescPassport: "Comprehensive digital land diligence report unifying verified records, risk flags, and cited evidence.",
    demoBadge: "Demo Data",

    // All Features Directory
    allFeaturesEyebrow: "All Capabilities",
    allFeaturesTitle: "26 Smart Capabilities on One Platform",
    allFeaturesSub: "Each capability is presented with transparent and honest operational status badges.",
    badgeDemo: "Prototype Demo",
    badgeReview: "Human Review Required",
    badgePending: "Govt Integration Pending",

    // Trust & Responsible AI
    trustEyebrow: "Responsible AI & Trust",
    trustTitle: "Responsible AI & Commitment to Transparency",
    trustSub: "Understanding how LandSure AI works and its ethical and technical boundaries.",
    trustCards: [
      {
        title: "Evidence-Linked Insights",
        desc: "Every warning, score, and explanation cites specific document rows and source references.",
      },
      {
        title: "Mandatory Human Verification",
        desc: "AI assists buyer due diligence, but certified legal counsel and sub-registry volume searches remain essential.",
      },
      {
        title: "Synthetic Demonstration Data",
        desc: "Currently running on 700 synthetic demonstration parcels; does not constitute official legal title.",
      },
      {
        title: "Transparent Model Limits",
        desc: "When handwritten or degraded deeds have ambiguity, the system explicitly highlights human review needs.",
      },
    ],

    // Why LandSure AI
    whyEyebrow: "Why LandSure AI",
    whyTitle: "Let Verified Information Empower Your Decisions",

    // Free Demo Experience
    freeDemoEyebrow: "Free Demo Experience",
    freeDemoTitle: "Try LandSure AI Today",
    freeDemoSub: "Experience parcel exploration, AI document review, and report generation using demo data.",
    freeDemoBadge: "100% Free Demo",
    freeDemoCta: "Start Free Demo",
    freeDemoDisclaimer: "This is a demonstration platform. It does not replace certified land surveys or legal counsel.",

    // FAQ
    faqTitle: "Your Questions, Answered",
    faqSub: "Understand essential information about LandSure AI in clear, simple terms.",
    faqs: [
      {
        q: "What is LandSure AI?",
        a: "LandSure AI is an AI-powered land due diligence and decision-support platform for Bangladesh. It unifies ownership history, deeds, khatians, and potential risk indicators in one place. Currently, it operates as a prototype using synthetic demonstration data.",
      },
      {
        q: "Does it verify official government land records directly?",
        a: "No. The current demonstration system does not connect directly to government land registries. All displayed records are synthetic for workflow demonstration. Authorized integration is planned for future stages.",
      },
      {
        q: "How can I view the ownership history of a parcel?",
        a: "Selecting a parcel from the Parcel Explorer brings up the Ownership Timeline, showing chronological deed transfers, mutation history, and connected legal documents.",
      },
      {
        q: "Does the AI Risk Score guarantee clean land title?",
        a: "No. The Risk Score is an advisory signal highlighting potential anomalies and missing evidence. It does not replace formal title clearance. Physical inspection and lawyer verification remain mandatory.",
      },
      {
        q: "Can I explore nearby alternative parcels?",
        a: "Yes. You can compare nearby parcels by proximity, record completeness, and synthetic benchmark pricing within the same mouza.",
      },
      {
        q: "Can I upload Bengali land deeds for OCR analysis?",
        a: "Yes. The prototype features Bengali document OCR extracting structured entities. Handwritten or faded deeds may yield reduced accuracy and trigger human verification flags.",
      },
      {
        q: "Is the Land Trust Passport available as a PDF export?",
        a: "Yes. The Land Trust Passport report summarizes verified records, warnings, and source citations, and is downloadable in the main application.",
      },
      {
        q: "Is LandSure AI optimized for mobile devices?",
        a: "Yes. The entire platform is built with responsive mobile, tablet, and laptop-first layouts.",
      },
      {
        q: "Is there any cost to test the demo?",
        a: "No. The demonstration platform is completely free to explore without any subscription or payment.",
      },
      {
        q: "Does LandSure AI replace a land lawyer?",
        a: "No. LandSure AI assists buyers in understanding documents and identifying critical questions, but never replaces qualified legal counsel. Always consult an experienced land advocate before property transactions.",
      },
    ],

    // Final CTA
    finalCtaTitle1: "Know the facts.",
    finalCtaTitle2: "Understand the risks.",
    finalCtaTitle3: "Decide with confidence.",
    finalCtaDesc: "Understand property risks before committing to a purchase with LandSure AI.",
    finalCtaBtn: "Start Land Verification",

    // Footer
    footerDesc: "AI-assisted land intelligence and due diligence platform for Bangladesh.",
    footerColPlatform: "Platform",
    footerColSupport: "Support",
    footerColAccount: "Account",
    footerRights: "© 2026 LandSure AI. All rights reserved.",
    footerAttribution: "Designed & Developed by",
    footerWatermarkTop: "AFTERTHOUGHT",
    footerWatermarkBottom: "LandSure AI",
  },
};
