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
}
