# دليل رفع LifeOS على Vercel

## المتطلبات
- حساب على [Vercel](https://vercel.com)
- Vercel CLI (اختياري): `npm i -g vercel`
- Git (للمستودع)

---

## خطوات الرفع السريعة

### 1. عبر Git (الطريقة الموصى بها)

1. ارفع المشروع إلى GitHub/GitLab/Bitbucket
2. ادخل إلى [vercel.com](https://vercel.com) واضغط **Add New Project**
3. اختر المستودع وقم بربطه
4. **Root Directory**: اختر `LifeOS_Integrated` إذا كان المشروع داخل مجلد فرعي
5. اضغط **Deploy** (لا تحتاج تعديلات إضافية)

### 2. عبر Vercel CLI

```bash
cd LifeOS_Integrated
vercel
```

اتبع التعليمات، ثم للرفع النهائي:

```bash
vercel --prod
```

---

## ملاحظات مهمة

### قاعدة البيانات (JSON)

- المشروع يستخدم ملفات JSON محلياً (`database/tasks.json`, `database/projects.json`, `database/notes/`).
- على Vercel، البيئة Serverless **لا تحفظ تغييرات الملفات** بين الطلبات.
- الحلول الممكنة:
  1. **Supabase** أو **Firebase** كقاعدة بيانات سحابية
  2. **Vercel KV** أو **PostgreSQL** لإدارة البيانات
  3. الاستمرار بـ LocalStorage في المتصفح (يعمل من جانب العميل فقط)

### تسجيل الدخول

- بيانات الدخول الافتراضية: `admin` / `admin123`
- يتم التحقق حالياً من LocalStorage (عميل فقط)
- للتحقق من جانب الخادم: استخدم Firebase Auth أو Supabase Auth

---

## هيكلة الملفات

```
LifeOS_Integrated/
├── api/
│   └── index.py          # Vercel Serverless handler
├── web/
│   ├── static/
│   └── templates/
├── routes/
├── core/
├── server.py
├── vercel.json
├── requirements.txt
└── DEPLOY_VERCEL.md
```

---

## vercel.json

- `builds`: استخدام `@vercel/python` لبناء الدالة
- `routes`: إعادة توجيه الطلبات إلى الدالة Python
