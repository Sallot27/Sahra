<?php

use Illuminate\Support\Facades\Schedule;

// Remove old rooms and drawings once a day (needs the scheduler enabled on Laravel Cloud).
Schedule::command('model:prune')->daily();
