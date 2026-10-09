# سهرة 🎉

باقة ألعاب جماعية بالعربي، مثل Jackbox. شاشة كبيرة للعرض (كمبيوتر أو تلفزيون)، وكل واحد يلعب من جواله. مبنية على Laravel وتشتغل على Laravel Cloud.

## الألعاب

| اللعبة | اللاعبين | الفكرة |
|---|---|---|
| 🤥 **فبركة** | ٢–٨ | حقيقة غريبة فيها فراغ. كل واحد يكتب كذبة مقنعة، والكل يحاول يلقى الحقيقة. |
| 🎨 **ارسمها** | ٣–٨ | كل واحد يرسم موضوع سري بجواله، والباقين يخترعون له عنوان كذب. |
| 🕵️ **برا السالفة** | ٣–٨ | الكل يعرف السالفة إلا واحد. اسألوا بعض واكشفوه. |

## كيف تشتغل

- **الشاشة الكبيرة** تفتح الموقع وتضغط «افتح سهرة جديدة»، فيطلع رمز من ٤ حروف.
- **اللاعبين** يفتحون نفس الرابط من جوالاتهم ويكتبون الرمز.
- الاتصال الحي بين الأجهزة عن طريق **Laravel Reverb** (WebSockets): كل غرفة قناة presence، والشاشة الكبيرة هي الحكم.
- الأسئلة ومواضيع الرسم والكلمات محفوظة في قاعدة البيانات، وتتعدّل من **لوحة التحكم** على `/admin`.
- الرسومات تنرفع من الجوال عن طريق HTTP (أكبر من حد رسائل WebSocket).

## النشر على Laravel Cloud

1. في Laravel Cloud اضغط **New application** واختر هذا الريبو (`Sallot27/Sahra`) وفرع `main`.
2. أضف **Database** (MySQL أو Postgres) للبيئة.
3. أنشئ **WebSocket cluster** من صفحة **Resources ← WebSockets**، وبعدين من صفحة التطبيق اضغط **Add resource ← WebSockets** واربطه. Cloud يعبّي متغيرات `REVERB_*` تلقائياً.
4. في **Environment variables** أضف:
   ```
   APP_LOCALE=ar
   ADMIN_PASSWORD=كلمة-مرور-قوية
   ```
5. في **Deploy commands** خلّها كذا:
   ```
   php artisan migrate --force
   php artisan db:seed --force
   ```
   (الـ seeder آمن يشتغل كل مرة: يضيف المحتوى الناقص بس، وما يمسح تعديلاتك.)
6. اضغط **Deploy**. بعدها افتح الرابط وابدأ اللعب، ولوحة التحكم على `/admin`.
7. اختياري: فعّل **Scheduler** عشان تنحذف الغرف والرسومات القديمة تلقائياً كل يوم.

> ملاحظة: الريبو ما فيه `composer.lock`، فأول نشر بيحمّل أحدث الإصدارات المتوافقة. بعد ما يشتغل عندك محلياً، شغّل `composer install` وارفع `composer.lock` عشان تثبت الإصدارات.

## التشغيل على جهازك

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
npm install && npm run build

# في نافذتين:
php artisan reverb:start
php artisan serve
```

افتح `http://localhost:8000` في تبويب للشاشة الكبيرة، وتبويب ثاني (أو جوال على نفس الشبكة) كلاعب.

## الاختبارات

```bash
php artisan test
```

## هيكل المشروع

- `public/js/sahra.js` و `public/css/sahra.css`: اللعبة كاملة (الشاشة الكبيرة والجوال).
- `app/Http/Controllers/RoomController.php`: إنشاء الغرف وتوثيق الدخول لقناة Reverb.
- `app/Http/Controllers/GameController.php`: صفحة اللعبة والمحتوى.
- `app/Http/Controllers/DrawingController.php`: رفع الرسومات وجلبها.
- `app/Http/Controllers/AdminController.php` و `resources/views/admin`: لوحة التحكم.
- `database/seeders/data/*.json`: المحتوى الأولي (141 سؤال، 100 موضوع رسم، 180 كلمة).
