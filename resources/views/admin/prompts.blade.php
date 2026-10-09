@extends('admin.layout')

@section('content')
<h1 style="font-size:32px">🎨 مواضيع ارسمها</h1>

<form method="post" action="{{ route('admin.prompts.store') }}" class="card">
  @csrf
  <label>أضف مواضيع رسم (سطر لكل موضوع)
    <textarea name="texts" id="texts" required placeholder="قطو يركب سيكل&#10;شمس لابسة شماغ"></textarea>
  </label>
  <div><button class="btn">إضافة</button></div>
</form>

<div class="card">
  <p class="note">اضغط على الموضوع لإخفائه أو إظهاره في اللعبة. الباهت مخفي.</p>
  <div class="chips">
    @foreach ($prompts as $p)
      <span class="chip {{ $p->active ? '' : 'off' }}">
        <form method="post" action="{{ route('admin.toggle', ['prompts', $p->id]) }}">@csrf @method('PATCH')<button style="color:var(--text);font-size:15px;font-family:var(--body)" title="إخفاء/إظهار">{{ $p->text }}</button></form>
        <form method="post" action="{{ route('admin.destroy', ['prompts', $p->id]) }}" onsubmit="return confirm('حذف هذا الموضوع؟')">@csrf @method('DELETE')<button aria-label="حذف">✕</button></form>
      </span>
    @endforeach
  </div>
</div>
@endsection
