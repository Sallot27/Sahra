@extends('admin.layout')

@section('content')
<h1 style="font-size:32px">🕵️ كلمات برا السالفة</h1>

<form method="post" action="{{ route('admin.words.store') }}" class="card">
  @csrf
  <div class="grid2">
    <label>الموضوع (موجود أو جديد)
      <input type="text" name="category" id="category" list="cats" required maxlength="60" placeholder="مثلاً: أكلات">
      <datalist id="cats">@foreach ($groups->keys() as $c)<option value="{{ $c }}">@endforeach</datalist>
    </label>
    <label>الكلمات (سطر لكل كلمة)
      <textarea name="words" id="words" required placeholder="كبسة&#10;مندي"></textarea>
    </label>
  </div>
  <p class="note">كل موضوع يحتاج ٨ كلمات على الأقل، لأن اللي برا السالفة يختار من ٨ خيارات.</p>
  <div><button class="btn">إضافة</button></div>
</form>

@foreach ($groups as $category => $words)
  <div class="card">
    <h2 style="font-size:24px">{{ $category }} <span class="note">({{ $words->where('active', true)->count() }} ظاهرة)</span></h2>
    <div class="chips">
      @foreach ($words as $w)
        <span class="chip {{ $w->active ? '' : 'off' }}">
          <form method="post" action="{{ route('admin.toggle', ['words', $w->id]) }}">@csrf @method('PATCH')<button style="color:var(--text);font-size:15px;font-family:var(--body)" title="إخفاء/إظهار">{{ $w->word }}</button></form>
          <form method="post" action="{{ route('admin.destroy', ['words', $w->id]) }}" onsubmit="return confirm('حذف هذه الكلمة؟')">@csrf @method('DELETE')<button aria-label="حذف">✕</button></form>
        </span>
      @endforeach
    </div>
  </div>
@endforeach
@endsection
