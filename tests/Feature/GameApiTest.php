<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Room;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'reverb.apps.apps.0.key' => 'test-key',
            'reverb.apps.apps.0.secret' => 'test-secret',
        ]);
    }

    public function test_content_is_seeded_and_served(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->getJson('/api/content')
            ->assertOk()
            ->assertJsonStructure(['questions' => [['id', 'c', 'q', 'a', 'alt', 'd']], 'prompts', 'words']);

        $this->assertGreaterThan(100, Question::count());

        // Second request is served from the cache and must still be real data.
        $this->getJson('/api/content')
            ->assertOk()
            ->assertJsonPath('questions.0.id', Question::active()->orderBy('id')->value('id'));
    }

    public function test_seeder_can_run_twice_without_duplicates(): void
    {
        $this->seed(DatabaseSeeder::class);
        $count = Question::count();
        $this->seed(DatabaseSeeder::class);

        $this->assertSame($count, Question::count());
    }

    public function test_host_gets_host_role_and_others_get_player_role(): void
    {
        $room = $this->postJson('/api/rooms')->assertCreated()->json();
        $channel = 'presence-room.'.$room['code'];

        $host = $this->postJson('/api/rooms/auth', [
            'socket_id' => '123.456', 'channel_name' => $channel, 'uid' => 'abc12345', 'host_token' => $room['host_token'],
        ])->assertOk()->json();

        $player = $this->postJson('/api/rooms/auth', [
            'socket_id' => '123.789', 'channel_name' => $channel, 'uid' => 'xyz12345', 'name' => 'نورة', 'host_token' => 'wrong',
        ])->assertOk()->json();

        $this->assertSame('host', json_decode($host['channel_data'], true)['user_info']['role']);
        $this->assertSame('player', json_decode($player['channel_data'], true)['user_info']['role']);

        // Signature matches the Pusher protocol.
        $expected = 'test-key:'.hash_hmac('sha256', "123.789:{$channel}:{$player['channel_data']}", 'test-secret');
        $this->assertSame($expected, $player['auth']);
    }

    public function test_unknown_room_is_rejected(): void
    {
        $this->getJson('/api/rooms/ZZZZ')->assertNotFound();
        $this->postJson('/api/rooms/auth', [
            'socket_id' => '1.2', 'channel_name' => 'presence-room.ZZZZ', 'uid' => 'abc12345',
        ])->assertNotFound();
    }

    public function test_drawings_round_trip_and_are_cleaned(): void
    {
        Room::create(['code' => 'ABCD', 'host_token_hash' => hash('sha256', 'x')]);

        $id = $this->postJson('/api/rooms/ABCD/drawings', [
            'strokes' => [['c' => 1, 'w' => 2, 'p' => [10, 20, 5000, -3]], ['c' => 9, 'p' => [1]]],
        ])->assertCreated()->json('id');

        $this->getJson("/api/drawings/{$id}")
            ->assertOk()
            ->assertExactJson(['strokes' => [['c' => 1, 'w' => 2, 'p' => [10, 20, 1000, 0]]]]);
    }

    public function test_admin_is_hidden_without_a_password_and_locked_with_one(): void
    {
        config(['services.admin.password' => null]);
        $this->get('/admin/questions')->assertNotFound();

        config(['services.admin.password' => 'secret']);
        $this->get('/admin/questions')->assertRedirect('/admin/login');
        $this->post('/admin/login', ['password' => 'secret'])->assertRedirect('/admin/questions');
        $this->get('/admin/questions')->assertOk();
    }

    public function test_kicked_player_cannot_rejoin_and_only_host_can_kick(): void
    {
        $room = $this->postJson('/api/rooms')->assertCreated()->json();
        $channel = 'presence-room.'.$room['code'];
        $join = fn (string $uid) => $this->postJson('/api/rooms/auth', [
            'socket_id' => '123.456', 'channel_name' => $channel, 'uid' => $uid, 'name' => 'سعود',
        ]);

        $join('kick12345')->assertOk();
        $this->postJson("/api/rooms/{$room['code']}/kick", ['host_token' => 'wrong', 'uid' => 'kick12345'])->assertForbidden();
        $this->postJson("/api/rooms/{$room['code']}/kick", ['host_token' => $room['host_token'], 'uid' => 'kick12345'])->assertOk();

        $join('kick12345')->assertForbidden();
        $join('other1234')->assertOk();
    }

    public function test_rude_nicknames_are_refused(): void
    {
        $room = $this->postJson('/api/rooms')->assertCreated()->json();
        $auth = fn (string $name) => $this->postJson('/api/rooms/auth', [
            'socket_id' => '123.456', 'channel_name' => 'presence-room.'.$room['code'], 'uid' => 'name1234', 'name' => $name,
        ]);

        $auth('ش ر م و ط')->assertStatus(422);
        $auth('f u c k')->assertStatus(422);
        $auth('عبدالله')->assertOk();
        $auth('زبدة')->assertOk();
    }

    public function test_host_keeps_room_alive(): void
    {
        $room = $this->postJson('/api/rooms')->assertCreated()->json();

        $this->postJson("/api/rooms/{$room['code']}/alive", ['host_token' => $room['host_token']])->assertOk();
        $this->postJson("/api/rooms/{$room['code']}/alive", ['host_token' => 'nope'])->assertForbidden();
    }

    public function test_privacy_page_and_security_headers(): void
    {
        $this->get('/privacy')->assertOk()->assertSee('سياسة الخصوصية')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $this->get('/no-such-page')->assertNotFound()->assertSee('العودة للصفحة الرئيسية');
    }
}
