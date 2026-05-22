<?php

namespace App\Console\Commands;

use App\Services\Whatsapp\ReminderScheduler;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class DispatchBillReminders extends Command
{
    protected $signature = 'bot:reminders {--now= : Override current time (Y-m-d H:i:s)}';

    protected $description = 'Plan and dispatch upcoming bill reminders via the linked chat bot.';

    public function handle(ReminderScheduler $scheduler): int
    {
        $now = $this->option('now') ? Carbon::parse($this->option('now')) : null;

        $stats = $scheduler->dispatch($now);

        $this->info(sprintf('Reminder dijadwalkan: %d, terkirim: %d.', $stats['queued'], $stats['sent']));

        return self::SUCCESS;
    }
}
