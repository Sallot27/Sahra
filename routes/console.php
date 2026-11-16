<?php

use Illuminate\Support\Facades\Schedule;

// Remove rooms, drawings and selfies older than 6 hours, as the privacy page promises.
// Runs every hour; needs the scheduler enabled on Laravel Cloud.
Schedule::command('model:prune')->hourly()->onOneServer()->withoutOverlapping();
