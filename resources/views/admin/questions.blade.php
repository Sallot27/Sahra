@extends('admin.layout')

@section('content')
<div class="row" style="justify-content:space-between">
  <h1 style="font-size:32px">🤥 أسئلة فبركة</h1>
  <a class="btn" href="{{ route('admin.questions.new') }}">+ سؤال جديد</a>
</div>

<form method="get" class="row">
  <input type="search" name="q" id="q" value="{{ $search }}" placeholder="ابحث في الأسئلة أو الأجوبة أو المواضيع…" style="flex:1;min-width:220px">
  <button class="btn ghost">بحث</button>
</form>

<div class="card table-wrap" style="padding:0">
  <table>
    <thead><tr><th>الموضوع</th><th>السؤال</th><th>الإجابة الحقيقية</th><th>الكذبات الجاهزة</th><th></th></tr></thead>
    <tbody>
    @forelse ($questions as $q)
      <tr class="{{ $q->active ? '' : 'off' }}">
        <td><span class="tag">{{ $q->category }}</span></td>
        <td style="max-width:420px">{{ $q->text }}</td>
        <td class="ans">{{ $q->answer }}</td>
        <td class="note">{{ implode('، ', $q->decoys ?? []) }}</td>
        <td>
          <div class="row" style="gap:6px;flex-wrap:nowrap">
            <a class="btn ghost sm" href="{{ route('admin.questions.edit', $q) }}">تعديل</a>
            <form method="post" action="{{ route('admin.toggle', ['questions', $q->id]) }}">@csrf @method('PATCH')<button class="btn ghost sm">{{ $q->active ? 'إخفاء' : 'إظهار' }}</button></form>
            <form method="post" action="{{ route('admin.destroy', ['questions', $q->id]) }}" onsubmit="return confirm('حذف هذا السؤال نهائياً؟')">@csrf @method('DELETE')<button class="btn danger sm">حذف</button></form>
          </div>
        </td>
      </tr>
    @empty
      <tr><td colspan="5" class="note">ما فيه أسئلة{{ $search ? ' تطابق البحث' : '' }}.</td></tr>
    @endforelse
    </tbody>
  </table>
</div>

<div class="row">{{ $questions->links('pagination::simple-default') }}</div>
@endsection
