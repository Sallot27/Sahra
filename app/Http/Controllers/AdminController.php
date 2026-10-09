<?php

namespace App\Http\Controllers;

use App\Models\DrawPrompt;
use App\Models\Question;
use App\Models\Word;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class AdminController extends Controller
{
    /* ---------- sign in ---------- */

    public function login(): View
    {
        abort_if(blank(config('services.admin.password')), 404);

        return view('admin.login');
    }

    public function authenticate(Request $request): RedirectResponse
    {
        abort_if(blank(config('services.admin.password')), 404);

        $key = 'admin-login:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return back()->withErrors(['password' => 'محاولات كثيرة. جرّب بعد دقيقة.']);
        }

        if (! hash_equals((string) config('services.admin.password'), (string) $request->input('password'))) {
            RateLimiter::hit($key, 60);

            return back()->withErrors(['password' => 'كلمة المرور غير صحيحة.']);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();
        $request->session()->put('is_admin', true);

        return redirect()->route('admin.questions');
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget('is_admin');
        $request->session()->regenerate();

        return redirect()->route('admin.login');
    }

    /* ---------- فبركة: questions ---------- */

    public function questions(Request $request): View
    {
        $search = trim((string) $request->query('q', ''));

        $questions = Question::query()
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('text', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%")
                ->orWhere('topic', 'like', "%{$search}%")
                ->orWhere('answer', 'like', "%{$search}%")))
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        return view('admin.questions', [
            'questions' => $questions,
            'search' => $search,
            'counts' => $this->counts(),
        ]);
    }

    public function editQuestion(?Question $question = null): View
    {
        return view('admin.question-form', [
            'question' => $question ?? new Question(['active' => true, 'alternates' => [], 'decoys' => []]),
            'counts' => $this->counts(),
        ]);
    }

    public function saveQuestion(Request $request, ?Question $question = null): RedirectResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'max:60'],
            'topic' => ['required', Rule::in(Question::TOPICS)],
            'text' => ['required', 'string', 'max:400', function ($attr, $value, $fail) {
                if (substr_count($value, '_____') !== 1) {
                    $fail('السؤال لازم يحتوي على فراغ واحد مكتوب هكذا: _____');
                }
            }],
            'answer' => ['required', 'string', 'max:80'],
            'alternates' => ['nullable', 'string', 'max:1000'],
            'decoys' => ['required', 'string', 'max:1000'],
            'active' => ['nullable', 'boolean'],
        ]);

        $decoys = $this->lines($data['decoys']);
        if (count($decoys) < 3) {
            return back()->withInput()->withErrors(['decoys' => 'اكتب ٣ كذبات جاهزة على الأقل، كل وحدة في سطر.']);
        }

        $question ??= new Question();
        $question->fill([
            'category' => $data['category'],
            'topic' => $data['topic'],
            'text' => $data['text'],
            'answer' => $data['answer'],
            'alternates' => $this->lines($data['alternates'] ?? ''),
            'decoys' => $decoys,
            'active' => $request->boolean('active'),
        ])->save();

        GameController::forgetContent();

        return redirect()->route('admin.questions')->with('status', 'تم حفظ السؤال.');
    }

    /* ---------- ارسمها: prompts ---------- */

    public function prompts(): View
    {
        return view('admin.prompts', [
            'prompts' => DrawPrompt::orderByDesc('id')->get(),
            'counts' => $this->counts(),
        ]);
    }

    public function addPrompts(Request $request): RedirectResponse
    {
        $request->validate(['texts' => ['required', 'string', 'max:5000']]);

        $added = 0;
        foreach ($this->lines($request->input('texts')) as $text) {
            $prompt = DrawPrompt::firstOrCreate(['text' => mb_substr($text, 0, 80)]);
            $added += $prompt->wasRecentlyCreated ? 1 : 0;
        }

        GameController::forgetContent();

        return back()->with('status', "تمت إضافة {$added} موضوع رسم.");
    }

    /* ---------- برا السالفة: words ---------- */

    public function words(): View
    {
        return view('admin.words', [
            'groups' => Word::orderBy('category')->orderBy('word')->get()->groupBy('category'),
            'counts' => $this->counts(),
        ]);
    }

    public function addWords(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'max:60'],
            'words' => ['required', 'string', 'max:5000'],
        ]);

        $added = 0;
        foreach ($this->lines($data['words']) as $word) {
            $w = Word::firstOrCreate(['category' => trim($data['category']), 'word' => mb_substr($word, 0, 60)]);
            $added += $w->wasRecentlyCreated ? 1 : 0;
        }

        GameController::forgetContent();

        return back()->with('status', "تمت إضافة {$added} كلمة.");
    }

    /* ---------- shared: show/hide and delete ---------- */

    public function toggle(Request $request, string $type, int $id): RedirectResponse
    {
        $model = $this->model($type)::findOrFail($id);
        $model->update(['active' => ! $model->active]);
        GameController::forgetContent();

        return back()->with('status', $model->active ? 'صار ظاهر في اللعبة.' : 'تم إخفاؤه من اللعبة.');
    }

    public function destroy(string $type, int $id): RedirectResponse
    {
        $this->model($type)::findOrFail($id)->delete();
        GameController::forgetContent();

        return back()->with('status', 'تم الحذف.');
    }

    /* ---------- helpers ---------- */

    private function model(string $type): string
    {
        return match ($type) {
            'questions' => Question::class,
            'prompts' => DrawPrompt::class,
            'words' => Word::class,
            default => abort(404),
        };
    }

    /** Splits a textarea into trimmed, unique, non-empty lines. */
    private function lines(string $value): array
    {
        return array_values(array_unique(array_filter(
            array_map('trim', preg_split('/\R/u', $value) ?: []),
            fn ($line) => $line !== '',
        )));
    }

    private function counts(): array
    {
        return [
            'questions' => Question::count(),
            'prompts' => DrawPrompt::count(),
            'words' => Word::count(),
        ];
    }
}
