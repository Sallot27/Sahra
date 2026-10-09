<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="سهرة: ألعاب جماعية بالعربي. الشاشة الكبيرة للعرض، والجوالات للتحكم.">
<meta name="theme-color" content="#170f38">
<title>سهرة</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎉</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&family=Baloo+Bhaijaan+2:wght@500;700;800&display=swap">
<link rel="stylesheet" href="/css/sahra.css?v={{ filemtime(public_path('css/sahra.css')) }}">
</head>
<body>
<div class="stagebg"></div>
<div id="themebg"></div>
<canvas id="fx"></canvas>
<div id="app"><div class="wrap narrow" id="root"></div></div>

<script>window.SAHRA = @json($config);</script>
<script src="/js/vendor/pusher-8.4.0.min.js"></script>
<script src="/js/sahra.js?v={{ filemtime(public_path('js/sahra.js')) }}"></script>
</body>
</html>
