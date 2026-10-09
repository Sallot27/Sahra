@extends('admin.layout')

@section('content')
<div class="card" style="max-width:420px;margin:60px auto 0;width:100%">
  <h1 style="font-size:38px;color:var(--sun)">لوحة سهرة</h1>
  <p class="note">من هنا تضيف وتعدّل أسئلة الألعاب.</p>
  <form method="post" action="{{ route('admin.authenticate') }}" class="card" style="padding:0;border:0;background:none">
    @csrf
    <label>كلمة المرور<input type="password" name="password" id="password" required autofocus></label>
    <button class="btn">دخول</button>
  </form>
</div>
@endsection
