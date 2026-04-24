<h1 align="center">
  <br>
  LifeOS
  <br>
</h1>

<h4 align="center">نظام إدارة إنتاجية متكامل يعمل بالذكاء الاصطناعي (AI-Powered Productivity System)</h4>

<p align="center">
  <a href="#مقدمة-عن-المشروع-project-overview">المقدمة</a> •
  <a href="#لماذا-هذه-الهيكلية-why-this-architecture">لماذا هذه الهيكلية؟</a> •
  <a href="#الهيكلية-التقنية-system-architecture">الهيكلية التقنية</a> •
  <a href="#المميزات-الرئيسية-key-features">المميزات</a> •
  <a href="#هيكل-البيانات-data-schema">هيكل البيانات</a> •
  <a href="#دليل-التثبيت-والتشغيل-installation--setup">التثبيت</a> •
  <a href="#خريطة-الطريق-roadmap">خريطة الطريق</a>
</p>

---

## مقدمة عن المشروع (Project Overview)

**ما هو LifeOS؟**
LifeOS هو أكثر من مجرد تطبيق لإدارة المهام؛ إنه **نظام تشغيل متكامل لحياتك** مدعوم بالذكاء الاصطناعي. يهدف المشروع إلى الجمع بين إدارة المهام والمشاريع، التدوين (Writing Space)، القوالب (Templates)، وتوجيهات الذكاء الاصطناعي في بيئة واحدة متناغمة ومرنة.

**الفلسفة من وراء المشروع:**
بدأ LifeOS كنظام تقليدي، لكننا انتقلنا مؤخراً من كتابة الكود المتشابك (Hardcoded Logic) إلى **Architecture مرن يعتمد على البيانات (Data-Driven Architecture)**. الفلسفة الأساسية هي بناء محرك (Engine) عام قادر على استيعاب أي ميزات أو أنماط ذكاء اصطناعي جديدة بمجرد تعديل ملفات التكوين (YAML) بدلاً من إعادة كتابة الشيفرة البرمجية. هذا التحول يجعل النظام قابلاً للتوسع بلا حدود (Infinitely Scalable).

---

## لماذا هذه الهيكلية؟ (Why this Architecture?)

> [!TIP]
> **قوة النظام الجديد:** تكمن قوة LifeOS الحالية في فصل البيانات عن المنطق (Decoupling). 

في الأنظمة التقليدية، إضافة ميزة جديدة تتطلب تغييرات في واجهة المستخدم، مسارات الخادم (Routes)، ونماذج قاعدة البيانات. في LifeOS، الهيكلية مبنية بحيث يكون الـ Core مجرد مشغل (Executor) للتعليمات المعرفة مسبقاً في ملفات الـ Configurations. 
* **سرعة التطوير:** إضافة نمط AI جديد أو ميزة لا يتطلب سوى كتابة ملف YAML وبرومبت (Prompt).
* **سهولة الصيانة:** المنطق البرمجي (Core) معزول تماماً، مما يقلل من الأخطاء العرضية (Bugs).
* **قابلية التوسع:** النظام مستعد للتعامل مع المئات من القوالب وأنماط العمل دون زيادة تعقيد الكود.

---

## الهيكلية التقنية (System Architecture)

يعتمد LifeOS على **Decoupled Design** لفصل المنطق (Logic) عن البيانات (Data) والتعليمات (Prompts). إليك تفاصيل الهيكلية:

| المجلد (Directory) | الوظيفة (Function) |
| --- | --- |
| 📁 `/configs` | يحتوي على ملفات `YAML` التي تعرّف بنية البيانات (Schemas)، واجهات المستخدم المطلوبة، والأكشنز (Actions). |
| 📁 `/prompts` | يحتوي على نصوص التوجيه (System Prompts) الخاصة بكل نمط من أنماط الذكاء الاصطناعي لتسهيل تعديلها دون المساس بالكود. |
| 📁 `/core` | القلب النابض للنظام. يحتوي على محركات معالجة البيانات مثل `Schema Factory` و `Action Registry`. لا يحتوي على أي Business Logic صلب (Hardcoded). |
| 📁 `/api` | يدير الاتصال مع مزودي الذكاء الاصطناعي (مثل Gemini, Grok, Ollama) وتجريد (Abstract) الردود لتناسب النظام. |

### المكونات الأساسية:
- **Schema Factory:** يقوم بقراءة ملفات الـ YAML وتحويلها ديناميكياً إلى نماذج بيانات (Models) للتحقق منها ومعالجتها.
- **Action Registry:** نظام تسجيل يسمح بربط الـ Actions المعرفة في الـ Configs بوظائف (Functions) داخل النظام ليتم تنفيذها عند الطلب.

---

## المميزات الرئيسية (Key Features)

- [x] **نظام المهام والمشاريع الديناميكي:** إدارة مهام متقدمة مع دعم التكرار (Recurrence) وربط المهام بالمشاريع.
- [x] **تعدد أنماط الذكاء الاصطناعي (AI Personas):** 
  - 🧠 *Planning:* للتخطيط الاستراتيجي.
  - 🎯 *Coaching:* للتوجيه وتحسين الإنتاجية.
  - ⚡ *Productivity:* للمساعدة السريعة في إنجاز المهام.
- [x] **دعم أكثر من مزود AI:** إمكانية التبديل بين نماذج متعددة (Gemini, Grok, Ollama) بسهولة.
- [x] **نظام القوالب (Templates):** إنشاء واستيراد قوالب جاهزة للمهام والمشاريع بنقرة واحدة.
- [x] **مساحة التدوين (Writing Space):** محرر متقدم لكتابة الأفكار وتخزينها بتنظيم عالي.

---

## هيكل البيانات (Data Schema)

في LifeOS، لا يتم تعريف الجداول أو الكوليكشنز (Collections) داخل كود بايثون بشكل صلب. بدلاً من ذلك، نستخدم ملفات `YAML` لتعريف الحقول مما يضمن مرونة فائقة. 

```yaml
# مثال مبسط على تعريف كائن في LifeOS
Task:
  fields:
    title:
      type: string
      required: true
    status:
      type: enum
      options: [pending, completed]
    is_recurring:
      type: boolean
```
يقوم الـ **Schema Factory** بقراءة هذا الملف وتوليد القواعد المطلوبة للـ Validation والتخزين في MongoDB.

---

## دليل التثبيت والتشغيل (Installation & Setup)

لتشغيل المشروع محلياً، اتبع الخطوات التالية:

### 1. إعداد البيئة الافتراضية (Virtual Environment)
```bash
# إنشاء بيئة افتراضية
python -m venv .venv

# تفعيل البيئة (Windows)
.venv\Scripts\activate
# تفعيل البيئة (Mac/Linux)
source .venv/bin/activate
```

### 2. تثبيت المتطلبات (Requirements)
```bash
pip install -r requirements.txt
```

### 3. إعداد متغيرات البيئة (Environment Variables)
قم بإنشاء ملف `.env` في المسار الرئيسي للمشروع وأضف المفاتيح التالية:
```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lifeos
# AI Providers API Keys
GEMINI_API_KEY=your_gemini_key
GROK_API_KEY=your_grok_key
```

### 4. تشغيل الخادم (Run Server)
```bash
python server.py
```
> [!NOTE]
> تأكد من إضافة عنوان الـ IP الخاص بك إلى الـ Network Access في **MongoDB Atlas** لتتمكن من الاتصال بقاعدة البيانات محلياً.

---

## خريطة الطريق (Roadmap)

نحن نطمح لجعل LifeOS المساعد الشخصي الأذكى. خططنا المستقبلية تشمل:

- 🌐 **ربط بـ APIs خارجية:** التكامل مع Google Calendar, Notion, وغيرها.
- 👥 **نظام مستخدمين متطور (Multi-tenant):** دعم أكثر من مستخدم مع نظام صلاحيات ومساحات عمل منفصلة.
- 🧠 **ذاكرة طويلة الأمد للـ AI (Long-term Memory):** تمكين الذكاء الاصطناعي من تذكر تفضيلاتك وتاريخ مهامك (عبر RAG أو Vector Databases).

---

## 🛠 ملاحظات تقنية للمطورين

الهيكلية الجديدة صُممت لتكون صديقة للمطورين (Developer-Friendly). 

**لإضافة "أكشن" جديد أو "نمط AI" جديد دون تعديل الكود الأساسي:**
1. **لإضافة نمط AI:** قم بإنشاء ملف نصي بداخل المجلد `/prompts` (مثل `developer_coach.txt`) يحتوي على توجيهات النظام (System Prompt). سيتم قراءته ديناميكياً وعرضه في واجهة المستخدم.
2. **لإضافة أكشن (Action):** قم بتعريف الأكشن في ملف الـ `YAML` بداخل مجلد `/configs` واربطه باسم (Identifier). ثم استخدم الـ `Action Registry` في كود الخادم لربط هذا الاسم بوظيفة (Function) محددة.

```python
# مثال لتسجيل أكشن جديد باستخدام Action Registry
from core.action_registry import action_registry

@action_registry.register('generate_report')
def generate_weekly_report(data):
    # Logic goes here
    pass
```

---
<p align="center">صُنع بشغف لزيادة الإنتاجية وبناء المستقبل المشرق 🚀</p>
