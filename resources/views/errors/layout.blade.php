<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#170f38">
<title>@yield('title') · سهرة</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&family=Baloo+Bhaijaan+2:wght@500;700;800&display=swap">
<link rel="stylesheet" href="/css/sahra.css">
</head>
<body>
<div class="stagebg"></div>
<div id="app"><main class="wrap narrow" style="justify-content:center">
  <div class="card center" style="gap:16px">
    <div style="font-size:84px;line-height:1">@yield('emoji')</div>
    <h1 style="font-size:40px;color:var(--sun)">@yield('title')</h1>
    <p class="note" style="font-size:18px">@yield('message')</p>
    <a class="btn coral wide" href="/" style="text-decoration:none;text-align:center">العودة للصفحة الرئيسية</a>
  </div>
</main></div>
</body>
</html>
