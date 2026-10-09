@extends('admin.layout')

@section('content')
<h1 style="font-size:32px">{{ $question->exists ? 'تعديل سؤال' : 'سؤال جديد' }}</h1>

<form method="post" action="{{ $question->exists ? route('admin.questions.update', $question) : route('admin.questions.store') }}" class="card">
  @csrf
  @if ($question->exists) @method('PUT') @endif

  <div class="grid2">
    <label>الفئة (اللي يختارها اللاعبين)
      <select name="topic" id="topic" required style="font-family:var(--body);font-size:17px;padding:10px 12px;border-radius:12px;border:2px solid var(--line);background:var(--ink);color:var(--text)">
        @foreach (\App\Models\Question::TOPICS as $t)
          <option value="{{ $t }}" @selected(old('topic', $question->topic) === $t)>{{ $t }}</option>
        @endforeach
      </select>
    </label>
    <label>عنوان طريف للسؤال (يظهر فوقه)
      <input type="text" name="category" id="category" maxlength="60" required value="{{ old('category', $question->category) }}" placeholder="مثلاً: حرب غريبة">
    </label>
  </div>

  <label>الحقيقة الغريبة، مع فراغ مكتوب هكذا _____
    <textarea name="text" id="text" required maxlength="400" placeholder="في عام 1932 خاض الجيش الأسترالي حرباً ضد _____ وخسرها.">{{ old('text', $question->text) }}</textarea>
  </label>

  <div class="grid2">
    <label>الإجابة الحقيقية
      <input type="text" name="answer" id="answer" maxlength="80" required value="{{ old('answer', $question->answer) }}">
    </label>
    <label>طرق ثانية لكتابة نفس الإجابة (سطر لكل وحدة)
      <textarea name="alternates" id="alternates" placeholder="إيمو&#10;طيور الامو">{{ old('alternates', implode("\n", $question->alternates ?? [])) }}</textarea>
    </label>
  </div>

  <label>كذبات جاهزة (٣ على الأقل، سطر لكل وحدة)
    <textarea name="decoys" id="decoys" required placeholder="الكناغر&#10;الكوالا&#10;التماسيح">{{ old('decoys', implode("\n", $question->decoys ?? [])) }}</textarea>
  </label>
  <p class="note">الكذبات الجاهزة تطلع لما لاعب ما يكتب كذبة، وكاقتراحات للي ما جاه إلهام. تأكد إنها مو صحيحة بالغلط.</p>

  <label style="flex-direction:row;align-items:center">
    <input type="hidden" name="active" value="0">
    <input type="checkbox" name="active" id="active" value="1" {{ old('active', $question->active) ? 'checked' : '' }} style="width:20px;height:20px">
    يظهر في اللعبة
  </label>

  <div class="row">
    <button class="btn">حفظ</button>
    <a class="btn ghost" href="{{ route('admin.questions') }}">رجوع</a>
  </div>
</form>
@endsection
