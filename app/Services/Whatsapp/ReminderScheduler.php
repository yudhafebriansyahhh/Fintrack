<?php

namespace App\Services\Whatsapp;

use App\Jobs\SendTelegramMessageJob;
use App\Jobs\SendWhatsappMessageJob;
use App\Models\BillItem;
use App\Models\BillReminder;
use App\Models\WhatsappMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReminderScheduler
{
    /** @return array{queued:int, sent:int} */
    public function dispatch(?Carbon $now = null): array
    {
        $now = $now?->copy() ?? Carbon::now();

        $queued = $this->planReminders($now);
        $sent = $this->dispatchDue($now);

        return [
            'queued' => $queued,
            'sent' => $sent,
        ];
    }

    private function planReminders(Carbon $now): int
    {
        $today = $now->copy()->startOfDay();

        $items = BillItem::query()
            ->with(['billGroup.user'])
            ->where('status', 'unpaid')
            ->whereDate('due_date', '>=', $today->copy()->subDays(30)->toDateString())
            ->whereDate('due_date', '<=', $today->copy()->addDays(30)->toDateString())
            ->get();

        $count = 0;

        foreach ($items as $item) {
            $user = $item->billGroup?->user;
            if (! $user || ! $user->phone_verified_at) {
                continue;
            }

            foreach ($this->plannedSchedules($item, $today) as $remindAt) {
                $reminder = BillReminder::firstOrCreate(
                    [
                        'bill_item_id' => $item->id,
                        'remind_at' => $remindAt,
                    ],
                    [
                        'status' => 'pending',
                    ],
                );

                if ($reminder->wasRecentlyCreated) {
                    $count++;
                }
            }
        }

        return $count;
    }

    /** @return array<int, Carbon> */
    private function plannedSchedules(BillItem $item, Carbon $today): array
    {
        if (! $item->due_date) {
            return [];
        }

        $due = $item->due_date->copy()->startOfDay();
        $offsets = [7, 3, 1, 0];
        $schedules = [];

        foreach ($offsets as $offset) {
            $candidate = $due->copy()->subDays($offset);
            if ($candidate->greaterThanOrEqualTo($today)) {
                $schedules[] = $candidate->setTime(8, 0);
            }
        }

        if ($due->isBefore($today)) {
            $schedules[] = $today->copy()->setTime(8, 0);
        }

        return collect($schedules)->unique(fn ($d) => $d->toDateTimeString())->values()->all();
    }

    private function dispatchDue(Carbon $now): int
    {
        $reminders = BillReminder::query()
            ->with(['billItem.billGroup.user'])
            ->where('status', 'pending')
            ->where('remind_at', '<=', $now)
            ->orderBy('remind_at')
            ->limit(50)
            ->get();

        $sent = 0;

        foreach ($reminders as $reminder) {
            $item = $reminder->billItem;
            $user = $item?->billGroup?->user;

            if (! $item || ! $user || (! $user->phone_verified_at && ! $user->telegram_chat_id)) {
                $reminder->update([
                    'status' => 'failed',
                    'failure_reason' => 'User belum memiliki channel reminder terverifikasi.',
                ]);
                continue;
            }

            if ($item->status !== 'unpaid') {
                $reminder->update(['status' => 'sent', 'sent_at' => $now, 'failure_reason' => 'Tagihan sudah ditutup.']);
                continue;
            }

            $dispatchId = null;
            $channel = $user->telegram_chat_id ? 'telegram' : 'whatsapp';

            DB::transaction(function () use ($reminder, $user, $item, $now, $channel, &$dispatchId) {
                $message = WhatsappMessage::create([
                    'user_id' => $user->id,
                    'phone' => $channel === 'telegram' ? $user->telegram_chat_id : $user->phone,
                    'direction' => 'outbound',
                    'message' => $this->buildMessage($user->name, $item, $now),
                    'status' => 'queued',
                    'provider_message_id' => "{$channel}-reminder-" . $reminder->id,
                    'payload' => [
                        'channel' => $channel,
                        'chat_id' => $channel === 'telegram' ? $user->telegram_chat_id : null,
                        'reminder_id' => $reminder->id,
                    ],
                ]);

                $reminder->update([
                    'status' => 'sent',
                    'sent_at' => $now,
                ]);

                $dispatchId = $message->id;
            });

            if (! empty($dispatchId)) {
                $this->dispatchMessage($dispatchId, $channel);
            }

            $sent++;
        }

        return $sent;
    }

    private function buildMessage(string $name, BillItem $item, Carbon $now): string
    {
        $due = $item->due_date?->copy();
        $diff = $due ? (int) round($now->copy()->startOfDay()->diffInDays($due->copy()->startOfDay(), false)) : 0;

        $when = match (true) {
            $diff > 1 => "{$diff} hari lagi",
            $diff === 1 => 'besok',
            $diff === 0 => 'hari ini',
            default => 'sudah lewat ' . abs($diff) . ' hari',
        };

        return implode("\n", [
            "Halo, {$name}.",
            'Pengingat tagihan FinTrack:',
            '',
            'Nama: ' . ($item->billGroup?->name ?? '-'),
            'Rincian: ' . $item->title,
            'Nominal: Rp' . number_format((float) $item->amount, 0, ',', '.'),
            'Jatuh tempo: ' . optional($due)->translatedFormat('d M Y') . " ({$when})",
            '',
            'Balas perintah tagihan untuk melihat detail.',
        ]);
    }

    private function dispatchMessage(int $messageId, string $channel): void
    {
        $job = $channel === 'telegram'
            ? SendTelegramMessageJob::class
            : SendWhatsappMessageJob::class;

        if (app()->runningInConsole()) {
            $job::dispatch($messageId);

            return;
        }

        $job::dispatchAfterResponse($messageId);
    }
}
