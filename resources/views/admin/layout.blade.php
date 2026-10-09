<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>لوحة سهرة</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&family=Baloo+Bhaijaan+2:wght@500;700;800&display=swap">
<style>
:root{--night:#170f38;--night2:#21164f;--plum:#2e1f6b;--line:#3d2c86;--paper:#fff4dc;--ink:#1a1033;--sun:#ffcc33;--coral:#ff4f6d;--mint:#2ee6a6;--text:#f7f2ff;--muted:#a99bd9;
  --display:"Lalezar",system-ui,sans-serif;--body:"Baloo Bhaijaan 2",system-ui,Tahoma,sans-serif;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--night);color:var(--text);font-family:var(--body);font-size:16px}
a{color:var(--sun)}
.wrap{max-width:1100px;margin:0 auto;padding:16px;padding-block:20px;display:flex;flex-direction:column;gap:18px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.logo{font-family:var(--display);font-size:34px;color:var(--sun);text-decoration:none}
nav{display:flex;gap:8px;flex-wrap:wrap}
nav a{padding:8px 14px;border-radius:12px;background:var(--plum);color:var(--text);text-decoration:none;font-weight:800}
nav a.on{background:var(--sun);color:var(--ink)}
nav a small{opacity:.7;font-weight:500}
.card{background:var(--night2);border:2px solid var(--line);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px}
h1,h2{font-family:var(--display);font-weight:400;margin:0}
label{display:flex;flex-direction:column;gap:6px;font-weight:800;color:var(--muted);font-size:14px}
input[type=text],input[type=password],input[type=search],textarea{font-family:var(--body);font-size:17px;padding:10px 12px;border-radius:12px;border:2px solid var(--line);background:var(--ink);color:var(--text);width:100%}
textarea{min-height:110px;resize:vertical}
input:focus,textarea:focus{outline:none;border-color:var(--sun)}
.btn{font-family:var(--display);font-size:18px;padding:8px 18px;border-radius:12px;border:0;background:var(--sun);color:var(--ink);cursor:pointer;text-decoration:none;display:inline-block}
.btn.ghost{background:transparent;color:var(--text);border:2px solid var(--line)}
.btn.danger{background:var(--coral);color:#fff}
.btn.sm{font-size:15px;padding:4px 12px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.flash{background:var(--mint);color:var(--ink);padding:10px 14px;border-radius:12px;font-weight:800}
.errors{background:var(--coral);color:#fff;padding:10px 14px;border-radius:12px;font-weight:700}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:720px}
th,td{text-align:right;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-size:13px}
.tag{display:inline-block;background:var(--coral);color:#fff;border-radius:8px;padding:0 8px;font-size:13px;font-weight:800}
.off{opacity:.45}
.ans{color:var(--mint);font-weight:800}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:4px;background:var(--plum);border-radius:99px;padding:2px 4px 2px 12px}
.chip form{display:inline}
.chip button{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:14px;padding:2px 6px}
.note{color:var(--muted);font-size:14px;line-height:1.7}
button:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
  @if (session('is_admin'))
  <header>
    <a class="logo" href="{{ route('game') }}">🎉 سهرة</a>
    <nav>
      <a href="{{ route('admin.questions') }}" class="{{ request()->routeIs('admin.questions*') ? 'on' : '' }}">🤥 فبركة <small>{{ $counts['questions'] ?? '' }}</small></a>
      <a href="{{ route('admin.prompts') }}" class="{{ request()->routeIs('admin.prompts*') ? 'on' : '' }}">🎨 ارسمها <small>{{ $counts['prompts'] ?? '' }}</small></a>
      <a href="{{ route('admin.words') }}" class="{{ request()->routeIs('admin.words*') ? 'on' : '' }}">🕵️ برا السالفة <small>{{ $counts['words'] ?? '' }}</small></a>
    </nav>
    <form method="post" action="{{ route('admin.logout') }}">@csrf<button class="btn ghost sm">خروج</button></form>
  </header>
  @endif

  @if (session('status'))<div class="flash">{{ session('status') }}</div>@endif
  @if ($errors->any())<div class="errors">@foreach ($errors->all() as $e)<div>{{ $e }}</div>@endforeach</div>@endif

  @yield('content')
</div>
</body>
</html>
