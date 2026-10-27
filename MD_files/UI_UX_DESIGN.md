# 🎨 Life OS (Nexora) — دليل ومواصفات التصميم الشامل وتجربة المستخدم (UI & UX Design System)

> **توثيق مرجعي شامل** يغطي لغة التصميم، نظام التوكنات، الهيكل المعماري للواجهات، تفاصيل تجربة المستخدم (UX)، والسلوكيات التفاعلية لجميع شاشات ووحدات تطبيق **Life OS / Nexora** المستخرجة مباشرة من التصاميم المعتمدة.  
> **الإصدار:** 3.0.0 &nbsp;|&nbsp; **النمط البصري:** Cosmic Violet Neon & Deep Obsidian Glassmorphism &nbsp;|&nbsp; **الشعار:** *"Your Life. Supercharged."*

---

## 📑 فهرس المحتويات (Table of Contents)

1. [فلسفة التصميم والرؤية البصرية (Design Philosophy & Vision)](#1-فلسفة-التصميم-والرؤية-البصرية-design-philosophy--vision)
2. [نظام التصميم والتوكنات (Design Tokens & Visual Foundations)](#2-نظام-التصميم-والتوكنات-design-tokens--visual-foundations)
   - [لوحة الألوان الكونية والخلفيات (Cosmic Obsidian Color Palette)](#21-لوحة-الألوان-الكونية-والخلفيات-cosmic-obsidian-color-palette)
   - [التدرجات النيونية البنفسجية والتوهج (Violet Neon Gradients & Glow)](#22-التدرجات-النيونية-البنفسجية-والتوهج-violet-neon-gradients--glow)
   - [ألوان الوسوم والمجالات والإحصاءات (Tags, Spaces & Accent Colors)](#23-ألوان-الوسوم-والمجالات-والإحصاءات-tags-spaces--accent-colors)
   - [الطباعة ونظام الخطوط (Typography System)](#24-الطباعة-ونظام-الخطوط-typography-system)
   - [المؤثرات الزجاجية والحدود المضيئة (Glassmorphism, Borders & Radii)](#25-المؤثرات-الزجاجية-والحدود-المضيئة-glassmorphism-borders--radii)
3. [الهيكل العام وتوزيع الواجهات (App Shell & Layout Architecture)](#3-الهيكل-العام-وتوزيع-الواجهات-app-shell--layout-architecture)
   - [الشريط العلوي الشامل (Global Top Navigation Bar)](#31-الشريط-العلوي-الشامل-global-top-navigation-bar)
   - [القائمة الجانبية اليمنى/اليسرى ومجالات الحياة (Navigation & Spaces Sidebar)](#32-القائمة-الجانبية-ومجالات-الحياة-navigation--spaces-sidebar)
   - [شبكة المحتوى المركزية واللوحة الجانبية (3-Zone Dashboard Architecture)](#33-شبكة-المحتوى-المركزية-واللوحة-الجانبية-3-zone-dashboard-architecture)
4. [التشريح التفصيلي لواجهات الأقسام (Comprehensive View-by-View Breakdown)](#4-التشريح-التفصيلي-لواجهات-الأقسام-comprehensive-view-by-view-breakdown)
   - [صفحة الهبوط التسويقية (Marketing Landing Page)](#41-صفحة-الهبوط-التسويقية-marketing-landing-page)
   - [شاشة المصادقة والدخول (Login & Authentication Screen)](#42-شاشة-المصادقة-والدخول-login--authentication-screen)
   - [لوحة القيادة المركزية (Main Productivity Dashboard)](#43-لوحة-القيادة-المركزية-main-productivity-dashboard)
   - [مساحة إدارة المشاريع (Projects Workspace)](#44-مساحة-إدارة-المشاريع-projects-workspace)
   - [التقويم والجدولة الزمنية (Calendar & Time Planning)](#45-التقويم-والجدولة-الزمنية-calendar--time-planning)
   - [مساحة الملاحظات والكتابة (Notes & Knowledge Hub)](#46-مساحة-الملاحظات-والكتابة-notes--knowledge-hub)
   - [مساعد الذكاء الاصطناعي (AI Assistant & Personal Copilot)](#47-مساعد-الذكاء-الاصطناعي-ai-assistant--personal-copilot)
   - [معرض القوالب الجاهزة (Templates Gallery)](#48-معرض-القوالب-الجاهزة-templates-gallery)
   - [لوحة الإعدادات والتخصيص الحي (Appearance & Settings Modal)](#49-لوحة-الإعدادات-والتخصيص-الحي-appearance--settings-modal)
5. [التفاعلات الدقيقة وسلوكيات المستخدم (Micro-Interactions & UX Patterns)](#5-التفاعلات-الدقيقة-وسلوكيات-المستخدم-micro-interactions--ux-patterns)
6. [التصميم المتجاوب وتطبيق الهواتف (Responsive & Mobile App View)](#6-التصميم-المتجاوب-وتطبيق-الهواتف-responsive--mobile-app-view)
7. [مرجع متغيرات التصميم للمطورين (CSS Design Tokens Reference)](#7-مرجع-متغيرات-التصميم-للمطورين-css-design-tokens-reference)

---

## 1. فلسفة التصميم والرؤية البصرية (Design Philosophy & Vision)

يجسد تصميم **Life OS (Nexora)** مفهوم **"العقل الثاني الخارق" (Your Second Brain — Plan • Focus • Create • Achieve)** من خلال المزج بين الفخامة الفضائية الداكنة والوضوح المعلوماتي العالي.

```
                        ┌────────────────────────────────────────┐
                        │     Life OS / Nexora Design Identity   │
                        └──────────────────┬─────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  Cosmic Crystal  │             │  3-Zone Command  │             │  Ambient Neon    │
│ ثيم الكريستال    │             │ تخطيط ثلاثي يجمع │             │ حدود زجاجية تشع  │
│ والجبال الكونية  │             │ التنقل والعمل والـAI│            │ بتوهج بنفسجي هادئ│
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

### الركائز الجوهرية للرؤية البصرية في الصور (Core Visual Tenets)

1. **هوية الكريستال الكوني (The Cosmic Crystal Motif):**
   - يرتكز التصميم على رمز بصري أيقوني متكرر هو **"الكريستالة البنفسجية المضيئة المحاطة بحلقة مدارية"** فوق سلسلة جبال ليلية ملحمية، وتظهر في الشعار، وبطاقات التحفيز الجانبية، وشاشة الدخول، وخلفية الملاحظات.
2. **ألواح الأوبسيديان الزجاجية (Obsidian Glass Panels):**
   - أسطح البطاقات ليست رمادية تقليدية، بل تعتمد درجة الكحلي الفحمي العميق (`#0B0C16`) مع حدود دقيقة متوهجة باللون البنفسجي الكهربائي (`rgba(139, 92, 246, 0.22)`) تمنح كل بطاقة حضوراً مستقلاً.
3. **نظام الإجراءات السريعة المرمزة لونياً (Color-Coded Quick Actions):**
   - تمييز الأوامر والبيانات عبر 4 ألوان نيونية متناغمة: **البنفسجي** (للمشاريع والذكاء الاصطناعي)، **الأزرق السماوي** (للملاحظات والملفات)، **الأخضر الزمردي** (للمهام والإنجاز)، و**البرتقالي الذهبي** (للتعلم والصحة).
4. **مركز قيادة شامل بدون تشتيت (All-in-One Command Center):**
   - قدرة المستخدم على رؤية إحصاءات يومه، مهام اليوم، الملفات الأخيرة، التقدم الأسبوعي، الأحداث القادمة، والوصول للمساعد الذكي في شاشة واحدة متوازنة.

---

## 2. نظام التصميم والتوكنات (Design Tokens & Visual Foundations)

### 2.1 لوحة الألوان الكونية والخلفيات (Cosmic Obsidian Color Palette)

تم استخلاص درجات الألوان بدقة من واجهات الصور المرفقة:

| المتغير البرمجي (CSS Variable) | القيمة اللونية (Hex / RGBA) | الاستخدام الأساسي في الواجهة |
| :--- | :--- | :--- |
| `--bg-cosmos` | `#05050A` | الخلفية الكونية الخارجية (تحوي سديم الفضاء والجبال البنفسجية الداكنة) |
| `--bg-app-shell` | `#080912` | خلفية نافذة التطبيق الرئيسية والشريط الجانبي |
| `--bg-card` | `rgba(14, 16, 30, 0.78)` | خلفية البطاقات والويدجات الزجاجية الداخلية |
| `--bg-card-hover` | `rgba(22, 25, 46, 0.90)` | خلفية البطاقات وعناصر القوائم عند التحويم |
| `--bg-input` | `#0D0F1D` | خلفية شريط البحث (`Search anything...`) وحقول الإدخال |
| `--text-primary` | `#FFFFFF` | العناوين الرئيسية، الأرقام الإحصائية الكبرى، وأسماء المهام |
| `--text-secondary` | `#94A3B8` | النصوص الفرعية، التواريخ، وعناوين البطاقات الثانوية |
| `--text-muted` | `#64748B` | التوقيتات الزمنية (`2 hours ago`)، نصوص التلميح، والاختصارات (`⌘K`) |
| `--border-subtle` | `rgba(255, 255, 255, 0.07)` | الفواصل الداخلية بين صفوف المهام والملفات |
| `--border-neon` | `rgba(139, 92, 246, 0.28)` | الإطار الخارجي المضيء لنوافذ التطبيق والبطاقات النشطة |

---

### 2.2 التدرجات النيونية البنفسجية والتوهج (Violet Neon Gradients & Glow)

تعتمد الهوية البصرية في الصور على طيف البنفسجي الفضائي والأزرق النيوني:

```css
/* Primary Brand & Active State Gradient */
--gradient-primary: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #4F46E5 100%);

/* Active Sidebar Item Pill Gradient */
--gradient-sidebar-active: linear-gradient(90deg, rgba(124, 58, 237, 0.35) 0%, rgba(79, 70, 229, 0.10) 100%);

/* Hero Text Gradient ("Productivity Hub") */
--gradient-hero-text: linear-gradient(90deg, #C084FC 0%, #818CF8 100%);

/* Quick Action Card Gradients */
--gradient-card-purple: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(88, 28, 135, 0.40));
--gradient-card-blue:   linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(30, 58, 138, 0.40));
--gradient-card-teal:   linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 78, 59, 0.40));
```

---

### 2.3 ألوان الوسوم والمجالات والإحصاءات (Tags, Spaces & Accent Colors)

تستخدم الواجهة نظام ألوان دلالي للأيقونات، النقاط المضيئة في القائمة الجانبية (Spaces)، وشارات تصنيف المهام:

| العنصر / الفئة | اللون الأساسي (Hex) | خلفية الشارة (Badge BG) | مكان الظهور في الصور |
| :--- | :---: | :---: | :--- |
| **Violet (Design / Planning / AI)** | `#A855F7` | `rgba(168, 85, 247, 0.18)` | شارات `Design`، `Planning`، `Docs`، ومنحنى التقدم الأسبوعي |
| **Cyan / Blue (Work / Notes)** | `#3B82F6` | `rgba(59, 130, 246, 0.18)` | شارة `Work`، أيقونة الملاحظات، وزر `New Note` |
| **Emerald Teal (Tasks / Growth)** | `#10B981` | `rgba(16, 185, 129, 0.18)` | شارة `Meetings`، `Personal`، زر `New Task`، ومؤشرات النمو (`+24%`) |
| **Amber Gold (Learning / Health)** | `#F59E0B` | `rgba(245, 158, 11, 0.18)` | نقاط مجالات `Learning` و `Health`، وأيقونة شمس الصباح ☀️ |
| **Crimson Red (PDF Files)** | `#EF4444` | `rgba(239, 68, 68, 0.18)` | أيقونة ملفات الـ PDF (`Research Plan.pdf`) |

---

### 2.4 الطباعة ونظام الخطوط (Typography System)

تستخدم الواجهة خطوطاً هندسية عصرية ذات حواف ناعمة وأرقام واضحة جداً:

1. **الخط الأساسي للعناوين والأرقام الكبرى:** `Plus Jakarta Sans` أو `Outfit`, sans-serif.
2. **الخط الأساسي للمتن والبيانات والجداول:** `Inter`, sans-serif.
3. **خط الملاحظات اليدوية في صفحة الهبوط:** `Caveat` أو خط يدوي للأسهم التوضيحية (`Ideas → Plans → Results`).

#### سلم الأحجام المعياري (Typography Scale):

| المستوى | الحجم (Font Size) | الوزن (Weight) | الاستخدام في شاشات التصميم |
| :--- | :---: | :---: | :--- |
| **Landing Hero Title** | `48px - 56px` | 800 (ExtraBold) | عنوان صفحة الهبوط (`The Next Generation Productivity Hub`) |
| **KPI Big Numbers** | `28px - 32px` | 700 (Bold) | الأرقام الكبرى في بطاقات الإحصاء (`12`, `4`, `28`, `4h 30m`) |
| **Greeting Header** | `22px - 24px` | 700 (Bold) | ترويسة الترحيب (`Good morning, Abdullah`) |
| **Card Section Title** | `16px - 17px` | 600 (SemiBold) | عناوين الويدجات (`Today's Tasks`, `Recent Files`, `Weekly Progress`) |
| **Body & List Items** | `13.5px - 14px` | 500 (Medium) | نصوص المهام، أسماء الملفات، وعناصر القائمة الجانبية |
| **Metadata & Trends** | `12px` | 400 (Regular) | التوقيتات (`9:00 AM`، `2 hours ago`) ومؤشرات الصعود (`↑ 3 completed today`) |
| **Pills & Shortcuts** | `11px` | 600 (SemiBold) | الكبسولات التصنيفية (`Design`, `Work`) واختصار البحث (`⌘ K`) |

---

### 2.5 المؤثرات الزجاجية والحدود المضيئة (Glassmorphism, Borders & Radii)

- **الترشيح الزجاجي (Backdrop Blur):** `backdrop-filter: blur(16px) saturate(140%)`.
- **الإضاءة المحيطية للحدود (Border Glow):** تحتوي الحاوية الكبرى للتطبيق وبطاقات الـ AI على إطار بنفسجي مضيء:
  `box-shadow: 0 0 25px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);`
- **زوايا التدوير (Border Radii):**
  - نافذة التطبيق الكاملة: `24px`
  - البطاقات والويدجات الداخلية: `16px`
  - الأزرار وعناصر القائمة الجانبية النشطة: `10px - 12px`
  - شريط البحث العلوي والأزرار الكبسولية (Pills): `9999px` (دائري الحواف بالكامل)

---

## 3. الهيكل العام وتوزيع الواجهات (App Shell & Layout Architecture)

تتميز واجهة لوحة القيادة الرئيسية في الصور بتصميم شبكي ثلاثي المناطق (3-Column Command Layout) يعلوه شريط تحكم شامل:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [✦ Nexora] Your Life. Supercharged.     [🔍 Search anything... ⌘K]   [🔔][🌙][🎚][👤▾] │
├──────────────────┬──────────────────────────────────────────────────┬──────────────────┤
│  LEFT SIDEBAR    │              CENTER MAIN WORKSPACE               │   RIGHT PANEL    │
│                  │                                                  │                  │
│  [🏠 Home      ] │  ☀️ Good morning, Abdullah      Tue, 26 Aug [📅] │ ┌──────────────┐ │
│   📁 Projects    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │ │ 💎 Crystal   │ │
│   ☑ Tasks        │  │ Tasks 12 │ │ Proj. 4  │ │ Notes 28 │ │4h 30m│ │ │ [Open AI →]  │ │
│   📝 Notes       │  └──────────┘ └──────────┘ └──────────┘ └──────┘ │ └──────────────┘ │
│   📅 Calendar    │  ┌────────────────────────────┐ ┌──────────────┐ │ ┌──────────────┐ │
│   ✦ AI Assistant │  │ Today's Tasks              │ │Quick Actions │ │ │ ❝ Inspiration│ │
│   📂 Files       │  │ ☐ Finish UI/UX   [Design]  │ │[Proj] [Note] │ │ └──────────────┘ │
│  ──────────────  │  │ ☐ Write docs     [Docs]    │ │[Task] [AskAI]│ │ ┌──────────────┐ │
│  Spaces       +  │  └────────────────────────────┘ └──────────────┘ │ │ Recent       │ │
│  • Personal   🟣 │  ┌────────────────────────────┐ ┌──────────────┐ │ │ Activity     │ │
│  • Work       🟣 │  │ Recent Files               │ │Weekly +24% 📈│ │ └──────────────┘ │
│  • Learning   🟠 │  └────────────────────────────┘ └──────────────┘ │ ┌──────────────┐ │
│  • Health     🟠 │  ┌──────────────┐ ┌───────────────┐ ┌──────────┐ │ │ 🏔 Focused   │ │
│  • Finance    🟢 │  │Upcoming Event│ │ Quick Notes   │ │ 78% Goal │ │ │ Mind... [→]  │ │
│  • Archive    🟣 │  └──────────────┘ └───────────────┘ └──────────┘ │ └──────────────┘ │
│  ┌────────────┐  │                                                  │                  │
│  │✦ AI Copilot│  │                                                  │                  │
│  └────────────┘  │                                                  │                  │
│  ⚙ Settings      │                                                  │                  │
│  👤 Abdullah   → │                                                  │                  │
└──────────────────┴──────────────────────────────────────────────────┴──────────────────┘
```

---

### 3.1 الشريط العلوي الشامل (Global Top Navigation Bar)

- **الارتفاع:** `64px`، يمتد على كامل عرض التطبيق مع خط فاصل سفلي خفيف.
- **الجهة اليسرى (Brand Identity):**
  - أيقونة نجمة رباعية مشعة داخل معين بنفسجي `✦` متبوعة باسم **Nexora** أو **Life OS** بخط عريض، وبجوارها الشعار اللفظي *"Your Life. Supercharged."* بلون ثانوي هادئ.
- **المنتصف (Command Search Bar):**
  - حقل بحث كبسولي عريض (`420px`) بخلفية داكنة، يحمل أيقونة عدسة مكبرة ونص `Search anything...` وفي أقصى يمينه شارة اختصار لوحة المفاتيح `⌘ K`.
- **الجهة اليمنى (System Controls & Profile):**
  - 3 أزرار أيقونية دائرية بحواف زجاجية: زر الإشعارات (`🔔`)، زر تبديل الوضع الليلي (`🌙`)، وزر تخصيص الواجهة (`🎚`).
  - كبسولة الحساب الشخصي: تعرض الصورة الرمزية للمستخدم، الاسم (`Abdullah`)، وسهم منسدل صغير `⌄`.

---

### 3.2 القائمة الجانبية ومجالات الحياة (Navigation & Spaces Sidebar)

تتكون القائمة الجانبية (`240px`) من 4 كتل وظيفية مرتبة رأسياً:

1. **القسم الأول — التنقل الرئيسي (Primary Navigation):**
   - `Home` (الرئيسية - تظهر نشطة بخلفية كبسولية بنفسجية متدرجة وحد مضيء).
   - `Projects` (المشاريع) | `Tasks` (المهام) | `Notes` (الملاحظات) | `Calendar` (التقويم) | `AI Assistant` (المساعد الذكي) | `Files` (الملفات).
2. **القسم الثاني — مجالات الحياة (Spaces):**
   - عنوان فرعي `Spaces` مع زر إضافة سريع `+`.
   - قائمة المجالات الشخصية مع أيقونة مخصصة على اليسار ونقطة لونية مضيئة (Status Dot) على اليمين:
     - `Personal` (نقطة بنفسجية)
     - `Work` (نقطة بنفسجية)
     - `Learning` (نقطة برتقالية ذهبية)
     - `Health` (نقطة برتقالية ذهبية)
     - `Finance` (نقطة خضراء زمردية)
     - `Archive` (نقطة بنفسجية)
3. **القسم الثالث — بطاقة المساعد المصغرة (Sidebar AI Copilot Card):**
   - بطاقة زجاجية مؤطرة بحد نيوني بنفسجي، تحتوي على أيقونة نجمة الـ AI المضيئة، وعنوان `AI Assistant` مع وصف `Your personal copilot`، وزر عريض بالأسفل `Ask Anything →`.
4. **القسم الرابع — الإعدادات وبطاقة المستخدم السفلية (Footer & User Profile):**
   - رابط `⚙ Settings`.
   - بطاقة المستخدم السفلية: تعرض صورة `Abdullah`، وتحتها المسمى الوظيفي `Engineering Student`، مع سهم انتقال `→`.

---

### 3.3 شبكة المحتوى المركزية واللوحة الجانبية (3-Zone Dashboard Architecture)

- **المنطقة الوسطى (Center Workspace):** مقسمة بنظام Bento Grid المرن من 4 أعمدة في الصف الأول، ثم عمودين غير متماثلين في الصفين الثاني والثالث، ثم 3 أعمدة في الصف السفلي.
- **اللوحة الجانبية اليمنى (Right Inspiration & Activity Panel - `280px`):** مخصصة للإلهام البصري، الاقتباسات اليومية، وسجل النشاط الزمني اللحظي (Recent Activity).

---

## 4. التشريح التفصيلي لواجهات الأقسام (Comprehensive View-by-View Breakdown)

---

### 4.1 صفحة الهبوط التسويقية (Marketing Landing Page)

تظهر في الصورة الثانية كواجهة ترويجية سينمائية فخمة للنظام:

1. **شريط التنقل التسويقي:** الشعار على اليسار، روابط (`Home`, `Features`, `Pricing`, `Blog`, `Docs`) في المنتصف مع خط نيوني مضيء تحت الرابط النشط، وشريط بحث مع زر كبسولي متدرج `Get Started →` على اليمين.
2. **منطقة الـ Hero المركزية:**
   - شارة علوية كبسولية: `✦ Your Life. Supercharged.`
   - عنوان ضخم من سطرين: `The Next Generation` باللون الأبيض، وتحته `Productivity Hub` بتدرج البنفسجي النيون.
   - نص وصفي يبرز قيمة المنصة كمساحة عمل شاملة، يتبعه زران: `Start for Free →` (بنفسجي مضيء) و `▷ Watch Video` (زجاجي شفاف).
   - إثبات اجتماعي (Social Proof): صور متداخلة لـ 5 مستخدمين مع نص *"Trusted by 50,000+ creators, learners and professionals"*.
3. **الخلفية والعناصر العائمة ثلاثية الأبعاد:**
   - بوابة كونية مستطيلة مضيئة في الخلفية تطل على كوكب وجبال صخرية.
   - جهاز لوحي (Tablet Mockup) في المنتصف يعرض لوحة القيادة الحية.
   - 3 بطاقات ميزات زجاجية على اليسار: `Manage Everything`، `AI-Powered`، و `Beautiful & Fast`.
   - بطاقات تفاعلية مائلة على اليمين: نافذة `AI Assistant` مع سهم مرسوم يدوياً (`Ideas → Plans → Results`)، وبطاقة الكريستالة الكونية.
4. **شريط الميزات السفلي (6-Pillar Feature Strip):**
   - 6 أعمدة بأيقونات مربعة متوهجة: `Tasks & Projects`، `Notes & Writing`، `Calendar & Planning`، `AI Assistant`، `Files & Knowledge`، و `Analytics & Insights`.

---

### 4.2 شاشة المصادقة والدخول (Login & Authentication Screen)

تظهر في أعلى يسار الصورة الثالثة:

- **الخلفية:** مشهد كامل للجبال الكونية الليلية مع توهج بنفسجي في الأفق.
- **البطاقة المركزية:**
  - أيقونة نجمة Life OS المضيئة في القمة، يتبعها اسم `Life OS`، ثم عنوان `Welcome back` ووصف `Your Life Operating System`.
  - حقل إدخال البريد الإلكتروني `✉ Email address`.
  - حقل إدخال كلمة المرور `🔒 Password` مع أيقونة إظهار/إخفاء.
  - زر دخول عريض بتدرج بنفسجي ساطع `Sign in`.
  - فاصل نصي `or continue with` يتبعه 3 أزرار دائرية للدخول السريع عبر: **Google (G)**، **GitHub**، و **Apple ()**.
  - رابط سفلي: `Don't have an account? Sign up`.

---

### 4.3 لوحة القيادة المركزية (Main Productivity Dashboard)

تتكون من الويدجات التالية مرتبة بدقة كما في الصورة الأولى:

#### 1. ترويسة الترحيب والتاريخ:
- يساراً: أيقونة شمس مشرقة ☀️ مع نص `Good morning, Abdullah` وتحته `Here's what's happening with your day.`.
- يميناً: التاريخ الحالي `Tue, 26 Aug 2026` مع زر أيقونة التقويم.

#### 2. صف بطاقات المؤشرات الأربعة (4 KPI Summary Cards):
- **Total Tasks:** الرقم `12`، أيقونة تقويم بنفسجية، ومؤشر أخضر `↑ 3 completed today`.
- **Active Projects:** الرقم `4`، أيقونة مجلد زرقاء، ومؤشر أخضر `↑ 2 in progress`.
- **Notes:** الرقم `28`، أيقونة ملاحظة زرقاء، ومؤشر أخضر `↑ 5 new today`.
- **Focus Time:** الرقم `4h 30m`، أيقونة مؤقت خضراء، ومؤشر أخضر `↑ 2h from yesterday`.

#### 3. ويدجت مهام اليوم (`Today's Tasks`) + الإجراءات السريعة (`Quick Actions`):
- **Today's Tasks:** قائمة تحتوي على مربع اختيار (Checkbox)، اسم المهمة، شارة التصنيف الكبسولية (`Design`, `Docs`, `Meetings`, `Planning`)، توقيت المهمة (`9:00 AM`)، وزر قائمة ثلاثية النقاط `•••`.
- **Quick Actions:** شبكة `2×2` من البطاقات اللونية المضيئة:
  - `New Project` (بنفسجي) | `New Note` (أزرق)
  - `New Task` (أخضر زمردي) | `Ask AI` (بنفسجي داكن متوهج)

#### 4. ويدجت الملفات الأخيرة (`Recent Files`) + التقدم الأسبوعي (`Weekly Progress`):
- **Recent Files:** يعرض أحدث 4 ملفات (`Product Strategy.docx`, `Design System.fig`, `Meeting Notes.md`, `Research Plan.pdf`) مع أيقونة ملونة لكل صيغة وزمن التعديل.
- **Weekly Progress:** رسم بياني موجي ناعم (Smooth Area Spline Chart) باللون البنفسجي المتوهج يوضح الأداء من `Mon` إلى `Sun`، مع نقطة مضيئة على يوم `Fri` وشارة خضراء بارزة في الأعلى `+24% vs. last week`.

#### 5. الصف السفلي الثلاثي (`Upcoming Events` + `Quick Notes` + `Productivity Stats`):
- **Upcoming Events:** جدول اجتماعات اليوم مع الفترة الزمنية (`10:00 AM – 10:30 AM`) وشارة المجال.
- **Quick Notes:** قائمة مختصرة بأحدث 3 ملاحظات مع سطر معاينة أول وزمن الإنشاء.
- **Productivity Stats:** مخطط حلقي دائري (Donut Progress Chart) يعرض `78% Daily Goal` في المركز، وبجواره تفصيل النسب (`Focus 4h 30m`, `Tasks 8/12`, `Notes 5/10`, `Projects 2/4`).

#### 6. اللوحة اليمنى (Right Panel Widgets):
- **بطاقة الـ AI الترويجية:** صورة الكريستالة الكونية مع نص *"Turn your thoughts into something real."* وزر `Open AI Assistant →`.
- **Today's Inspiration:** اقتباس تحفيزي يومي *"Small steps every day lead to big results." — Unknown*.
- **Recent Activity:** خط زمني عمودي يوثق آخر حركات المستخدم (إنشاء مشروع، إتمام مهمة، إضافة ملاحظة، رفع ملف).
- **بطاقة التركيز السفلية:** مشهد جبلي كوني مع عبارة *"A focused mind builds a better tomorrow."* وزر سهم دائري `→`.

---

### 4.4 مساحة إدارة المشاريع (Projects Workspace)

تظهر في أعلى يمين الصورة الثالثة:

- **الشريط العلوي للقسم:** عنوان `Projects`، شريط بحث `Search projects...`، وأزرار تحكم يتصدرها زر `+ New Project` البنفسجي.
- **تبويبات التصفية الكبسولية:** `All` (نشط)، `Active`، `Completed`، `Archived`.
- **شبكة بطاقات المشاريع (`2×2` Grid):**
  - تعرض مشاريع مثل: `Product Design` (75%)، `Study Plan` (60%)، `Personal Growth` (40%)، `Life Management` (80%).
  - تحتوي كل بطاقة على: اسم المشروع، أيقونة في الزاوية، نسبة التقدم المئوية، شريط تقدم متوهج (Progress Bar) بلون مخصص (أزرق أو بنفسجي)، وصف المشروع، وعداد المهام السفلية (`Tasks 12 • 8 open`).
- **العمود الأيمن في شاشة المشاريع:** يعرض سجل `Recent Activity` المباشر وبطاقة الاقتباس التحفيزي بالأسفل.

---

### 4.5 التقويم والجدولة الزمنية (Calendar & Time Planning)

تظهر في منتصف يسار الصورة الثالثة:

- **ترويسة التقويم:** تعرض الشهر والسنة `August 2026` مع أسهم التنقل `< >`، وأزرار تبديل طريقة العرض الكبسولية: `Month` (نشط)، `Week`، `Day`.
- **شبكة التقويم الشهرية (Calendar Grid):**
  - شبكة جدولية داكنة تعرض أيام الأسبوع (`Mon` إلى `Sun`).
  - تظهر الأحداث داخل خلايا الأيام كبطاقات صغيرة ملونة (أزرق، بنفسجي، كحلي) تحتوي على اسم الحدث وتوقيته (`Design Review 2:00 PM`, `Team Standup 10:00 AM`).
- **اللوحة الجانبية للتقويم (`Today's Tasks`):**
  - تعرض جدول المواعيد التفصيلي لليوم المحدد مع زر سفلي بارز `Add Event →`.

---

### 4.6 مساحة الملاحظات والكتابة (Notes & Knowledge Hub)

تظهر في منتصف أسفل الصورة الثالثة بتصميم ثلاثي الأعمدة (3-Pane Layout):

1. **العمود الأول (التصنيفات والوسوم):**
   - روابط سريعة: `Notes`، `Recent`، `Favorites`، `Archive`.
   - قسم الوسوم `Tags`: قائمة وسوم ملونة مع عداد الملاحظات بجوار كل وسم (`# ideas`, `# projects 6`, `# learning 5`, `# personal 4`, `# work`).
2. **العمود الثاني (قائمة بطاقات الملاحظات):**
   - شريط بحث علوي `Search files...`.
   - قائمة عمودية لبطاقات الملاحظات (`Design Ideas`, `Project Roadmap`, `Learning Notes`, `Personal Journal`, `Meeting Summary`) تعرض العنوان، مقتطفاً نصياً، وزمن التعديل.
3. **العمود الثالث (محرر الملاحظات الغني - Rich Note Editor):**
   - العنوان الكبير `Design Ideas`، وتحته تاريخ الإنشاء ووسوم كبسولية `#ideas` و `#design`.
   - متن الملاحظة يدعم النقاط (Bullet Points)، والصور البانورامية المضمنة (صورة الجبال البنفسجية داخل الملاحظة).
   - شريط أدوات تنسيق سفلي عائم: (`B`, `I`, `U`, قوائم، روابط، صور، كود).

---

### 4.7 مساعد الذكاء الاصطناعي (AI Assistant & Personal Copilot)

تظهر واجهته الكاملة في منتصف يمين الصورة الثالثة:

- **الترويسة:** `AI Assistant — Your personal AI copilot`.
- **منطقة المحادثة التفاعلية:**
  - رسالة المستخدم في فقاعة بنفسجية على اليمين: *"Help me plan my next week"*.
  - رد الذكاء الاصطناعي في بطاقة زجاجية كبيرة مؤطرة بحدود نيونية، وبجوارها مجسم الكريستالة ثلاثي الأبعاد:
    - يعرض خطة أسبوعية منظمة من `Monday` إلى `Friday` مع مربعات اختيار قابلة للتنفيذ.
    - يسأل المستخدم: *"Want me to create tasks for this plan?"* مع زر إجراء مباشر `Create tasks` ينشئ المهام تلقائياً في النظام.
- **عمود الأوامر السريعة (Quick Prompts Sidebar):**
  - أزرار جاهزة على يمين المحادثة: `Summarize this note`، `Generate ideas`، `Write a blog post`، `Explain a concept`، `Plan my day`.
- **حقل الإدخال السفلي:** شريط `Ask anything...` مع زر إرسال دائري بنفسجي.

---

### 4.8 معرض القوالب الجاهزة (Templates Gallery)

يظهر في أسفل يسار الصورة الثالثة:

- **شريط البحث والفلاتر الكبسولية:**
  - حقل `Search templates...`.
  - فلاتر الفئات: `All` (نشط)، `Productivity`، `Business`، `Education`، `Personal`.
- **شبكة القوالب (`3×2` Card Grid):**
  - تحتوي على 6 قوالب جاهزة: `Project Plan`، `Weekly Planner`، `Habit Tracker`، `Meeting Notes`، `Content Calendar`، `Study Plan`.
  - كل بطاقة تضم أيقونة مربعة ملونة في الأعلى، اسم القالب، وصفاً موجزاً، وزر كبسولي `Use Template` لاستنساخ القالب فوراً.

---

### 4.9 لوحة الإعدادات والتخصيص الحي (Appearance & Settings Modal)

تظهر في أسفل يمين الصورة الثالثة:

- **تبويبات الإعدادات:** `Appearance` (نشط)، `Notifications`، `Account`، `Privacy`.
- **عناصر التحكم البصري مع معاينة حية (Live Preview Card):**
  1. **Theme (السمة):** 3 أزرار اختيار (`Dark` نشط، `Light`، `System`).
  2. **Primary Color (اللون الأساسي):** 6 دوائر لونية للاختيار الفوري (بنفسجي، أزرق، سماوي، برتقالي، وردي، أخضر).
  3. **Background (الخلفية):** 3 أنماط (`Gradient`، `Image`، `Solid`).
  4. **المنزلقات الدقيقة (Sliders):**
     - `Transparency` (الشفافية): شريط تمرير مضبوط على `70%`.
     - `Blur Intensity` (كثافة الضبابية): شريط تمرير مضبوط على `60%`.
  5. **بطاقة المعاينة (Preview):** تعرض محاكاة حية لشكل الشعار والواجهة أثناء تغيير الإعدادات.

---

## 5. التفاعلات الدقيقة وسلوكيات المستخدم (Micro-Interactions & UX Patterns)

| العنصر التفاعلي | السلوك البصري في التصميم (Visual Behavior) | القيمة المضافة لتجربة المستخدم |
| :--- | :--- | :--- |
| **الحالة النشطة في القائمة (Active Nav Pill)** | خلفية متدرجة بنفسجية شفافة مع حد مضيء وأيقونة ساطعة | تحديد فوري لموقع المستخدم الحالي داخل النظام |
| **مؤشرات النمو الخضراء (Trend Badges)** | نص أخضر زمردي `#10B981` مع سهم صاعد `↑` في أسفل بطاقات الإحصاء | تعزيز الشعور بالإنجاز والتقدم مقارنة بالأمس أو الأسبوع الماضي |
| **أزرار التحويل من AI إلى مهام (`Create tasks`)** | زر بنفسجي داخل فقاعة رد الذكاء الاصطناعي يحول النص إلى مهام فعلية | إزالة الفجوة بين التخطيط مع الـ AI والتنفيذ الفعلي في جدول المهام |
| **توهج البطاقات عند التحويم (Ambient Hover)** | ازدياد سطوع الحد البنفسجي من `10%` إلى `35%` مع بروز خفيف | إضفاء طابع حيوي مستقبلي يستجيب لحركة المؤشر |
| **اختصار البحث الشامل (`⌘ K`)** | شارة مدمجة داخل شريط البحث العلوي | تمكين المستخدمين المحترفين من التنقل وإصدار الأوامر عبر لوحة المفاتيح |

---

## 6. التصميم المتجاوب وتطبيق الهواتف (Responsive & Mobile App View)

تظهر واجهة الهاتف المحمول (Mobile View) بوضوح في الزاوية السفلية اليمنى من الصورة الثالثة، وتعتمد القواعد التالية:

```
┌──────────────────────────────┐
│ 9:41                  📶 🔋  │
│ ✦ Life OS             🔍 👤  │
├──────────────────────────────┤
│ Good morning, Abdullah       │
│ Here's your day at a glance. │
│                              │
│ ┌──────────────────────────┐ │
│ │ ☑ 3 tasks due today    › │ │
│ │ 📁 2 active projects   › │ │
│ │ 📅 1 meeting today     › │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 📈 Weekly Curve          │ │
│ │ Focus Time: 4h 30m       │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  🏠     ☑      📝     •••   │
│ Home   Tasks  Notes   More   │
└──────────────────────────────┘
```

1. **الشريط العلوي للهاتف:** يعرض شعار `✦ Life OS` على اليسار، وأيقونتي البحث السريع والصورة الشخصية على اليمين.
2. **ملخص اليوم المدمج (At a Glance Stack):** بدلاً من 4 بطاقات منفصلة، تندمج الإحصاءات في قائمة عمودية مدمجة قابلة للنقر (`3 tasks due today`, `2 active projects`, `1 meeting today`).
3. **بطاقة التركيز والمنحنى:** تعرض الرسم البياني الموجي البنفسجي وتحته إجمالي وقت التركيز `4h 30m`.
4. **شريط التنقل السفلي الثابت (Bottom Tab Bar):** يحل محل القائمة الجانبية ويضم 4 أيقونات رئيسية: `Home` (نشط باللون البنفسجي)، `Tasks`، `Notes`، و `More`.

---

## 7. مرجع متغيرات التصميم للمطورين (CSS Design Tokens Reference)

الكود المرجعي الكامل لتطبيق هوية **Life OS / Nexora** كما ظهر في الصور:

```css
/* ==============================================================
   LIFE OS (NEXORA) — OFFICIAL VISUAL DESIGN TOKENS
   ============================================================== */
:root {
  /* ── Cosmic & Obsidian Backgrounds ─────────────────────────── */
  --bg-cosmos: #05050A;
  --bg-app-shell: #080912;
  --bg-sidebar: rgba(10, 11, 22, 0.92);
  --bg-card: rgba(14, 16, 30, 0.78);
  --bg-card-hover: rgba(22, 25, 46, 0.90);
  --bg-input: #0D0F1D;

  /* ── Typography Colors ─────────────────────────────────────── */
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;

  /* ── Neon Violet Brand & Gradients ─────────────────────────── */
  --accent-violet: #8B5CF6;
  --accent-indigo: #6366F1;
  --accent-purple-bright: #A855F7;
  --gradient-primary: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #4F46E5 100%);
  --gradient-active-nav: linear-gradient(90deg, rgba(139, 92, 246, 0.32) 0%, rgba(79, 70, 229, 0.08) 100%);
  --glow-violet: 0 0 24px rgba(139, 92, 246, 0.35);

  /* ── Category, Space & Action Colors ───────────────────────── */
  --color-blue: #3B82F6;      /* Notes, Work, Docx */
  --color-emerald: #10B981;   /* Tasks, Meetings, Positive Trends (+24%) */
  --color-amber: #F59E0B;     /* Learning, Health, Morning Sun */
  --color-crimson: #EF4444;   /* PDF Files & Alerts */

  /* ── Borders, Glass & Shadows ──────────────────────────────── */
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-neon: rgba(139, 92, 246, 0.28);
  --glass-blur: blur(16px) saturate(140%);
  --shadow-card: 0 12px 32px rgba(0, 0, 0, 0.65);

  /* ── Layout & Border Radii ─────────────────────────────────── */
  --sidebar-width: 240px;
  --right-panel-width: 280px;
  --topbar-height: 64px;
  --radius-app: 24px;
  --radius-card: 16px;
  --radius-btn: 10px;
  --radius-pill: 9999px;

  /* ── Fonts ─────────────────────────────────────────────────── */
  --font-display: "Plus Jakarta Sans", "Outfit", sans-serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

<div align="center">
  <b>Life OS (Nexora) — Plan • Focus • Create • Achieve</b><br>
  <i>Your Life. Supercharged.</i>
</div>