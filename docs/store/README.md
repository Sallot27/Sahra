# سهرة على itch.io: دليل الإطلاق

هذا الدليل يجهّز **النسخة التجارية** من سهرة للبيع، بدون ما يتأثر موقعك الخاص.

## النسختين

| | النسخة الخاصة (موقعك الحالي) | النسخة التجارية |
|---|---|---|
| الإعداد | بدون أي شي (`SAHRA_EDITION` فاضي) | `SAHRA_EDITION=commercial` |
| فئات ديزني، سبيستون، الأفلام، أغاني الأفلام | موجودة | مخفية |
| أسماء الأفلام والكرتون في الإيموجي ولسانك معقود | موجودة | مخفية، وبدالها محتوى أصلي (مهن، رياضة، مناسبات، عبارات) |
| رمز شراء للشاشة الكبيرة | لا | اختياري: `SAHRA_HOST_CODES` |

نفس الكود ونفس الريبو. الفرق كله في متغيرات البيئة.

## ١) جهّز موقع النسخة التجارية على Laravel Cloud

1. في تطبيق Sahra على Laravel Cloud، أضف **Environment** جديدة (مثلاً `commercial`) من نفس الفرع `main`.
2. اربط لها قاعدة بيانات و Reverb (WebSockets) مثل البيئة الحالية.
3. أضف متغيرات البيئة:
   - `SAHRA_EDITION=commercial`
   - `SAHRA_HOST_CODES=SAHRA-XXXX` (اختر رمز صعب التخمين. تقدر تحط أكثر من رمز بينها فاصلة)
   - `ADMIN_PASSWORD=...` (كلمة مرور لوحة الإدارة)
4. أوامر النشر نفس البيئة الحالية:
   `php artisan migrate --force` ثم `php artisan db:seed --force`
5. بعد النشر افتح `/api/status` وتأكد إن `edition` = `commercial` و `host_code_required` = `true`.

> كل بيئة إضافية في Laravel Cloud لها تكلفة شهرية. راجع الأسعار قبل ما تفعّلها.

## ٢) جهّز ملف itch.io

```
python3 tools/make_itch_zip.py https://رابط-النسخة-التجارية SAHRA-XXXX
```

يطلع لك `docs/store/sahra-itch.zip`. هذي الصفحة اللي يشوفها المشتري بعد الدفع: فيها رمز الشاشة الكبيرة وزر يفتح الموقع.

## ٣) صفحة اللعبة على itch.io

1. **Create new project** → Kind of project: **HTML**.
2. ارفع `sahra-itch.zip` واختار **This file will be played in the browser**.
3. Embed options: **Click to launch in fullscreen**.
4. Pricing: **Paid** أو **No payments / Pay what you want** مع سعر مقترح. اقتراحي: **٣–٥ دولار**.
5. الغلاف: `docs/store/cover.png` (630×500).
6. الصور: من `docs/store/screenshots/`.
7. Genre: **Party**. Tags مقترحة: `party-game`, `arabic`, `multiplayer`, `local-multiplayer`, `trivia`, `drawing`, `family-friendly`, `browser`.
8. Languages: Arabic.

### الدفع والأرباح (من وثائق itch.io)
- itch ياخذ نسبة افتراضية **١٠٪**، وتقدر تغيّرها من 0 إلى 100٪.
- الأرباح تتاح بعد **٧ أيام** من الشراء، وتسحبها عن طريق **PayPal أو Payoneer** (أقل مبلغ للسحب ٥ دولار).
- لازم تعبّي **مقابلة الضرائب (tax interview)** قبل أول سحب، وإذا ما عندك رقم ضريبي يطبقون استقطاع افتراضي ٣٠٪.

## ملاحظات مهمة

- **الرمز مشترك:** كل المشترين يشوفون نفس الرمز، فممكن ينتشر. إذا انتشر، غيّر `SAHRA_HOST_CODES` وارفع zip جديد. المشترين القدامى يشوفون الرمز الجديد في صفحة itch.
- **السيرفر عليك:** كل ما زاد اللعب زادت تكلفة السيرفر. راقب الاستهلاك في Laravel Cloud.
- **المحتوى:** النسخة التجارية ما فيها أسماء أفلام أو شخصيات أو أغاني لشركات ثانية. بعض أسئلة فبركة تذكر شركات (نوكيا، نينتندو…) كمعلومات تاريخية، وهذا عادة مقبول، بس أنا مو محامي. إذا تبي تطمّن، استشر مختص قبل البيع.
- **التوقعات:** لعبة عربية جديدة بدون جمهور غالباً تبيع قليل في البداية. أفضل تسويق لألعاب السهرات: مقاطع قصيرة (تيك توك، إنستقرام) لناس تضحك وهي تلعب.

---

## نص صفحة المتجر (عربي)

**سهرة: ألعاب جماعية بالعربي 🎉**

افتحها على التلفزيون، والكل يلعب من جواله. بدون تحميل، بدون حسابات، وبدون يدّات تحكم.

**فيها:**
- 🤥 **فبركة**: حقائق غريبة بس صحيحة، فيها فراغ. اكتب كذبة مقنعة تخدع أصحابك… واكتشف الحقيقة.
- 🎨 **ارسمها**: ارسم موضوعك السري، والباقين يخترعون له عناوين تخدع.
- 🕵️ **برا السالفة**: الكل يعرف السالفة إلا واحد. اكشفوه قبل ما يكشفكم.
- 🧪 **+١٠ ألعاب تجريبية**: مزاد الخردة، الجملة المكسورة، محامي الشيطان، إنسان حيوان، إكس أو، لسانك معقود، وغيرها.

**ليش سهرة؟**
- عربي ١٠٠٪، بلهجة خفيفة ومحتوى يناسب العائلة والصغار والكبار.
- من ٢ إلى ٨ لاعبين.
- اللاعبين يدخلون مجاناً من جوالاتهم. بس الشاشة الكبيرة تحتاج النسخة.
- أكثر من ٢٠٠ سؤال، و١٠٠ موضوع رسم.

**تحتاج:** شاشة كبيرة (كمبيوتر أو تلفزيون فيه متصفح)، وجوال لكل لاعب، وإنترنت.

## Store page text (English)

**Sahra — Arabic party games for your gatherings 🎉**

Put it on the TV, everyone plays from their phone. No downloads, no accounts, no controllers.

- 🤥 **Fabraka**: weird-but-true facts with a blank. Write a convincing lie to fool your friends, then find the truth.
- 🎨 **Arsimha**: draw your secret prompt; everyone else invents fake titles for it.
- 🕵️ **Barra Al-Salfa**: everyone knows the secret word except one player. Find the outsider.
- 🧪 **10+ beta games**: auctions, drawing telephone, silly debates, a letter race, team tic-tac-toe and more.

Fully in Arabic, family-friendly, 2–8 players. Players join free from their phones; only the big screen needs a copy. Requires a browser on a big screen, a phone per player and an internet connection.
