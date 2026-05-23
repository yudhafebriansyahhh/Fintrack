<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'bill_group_id',
        'title',
        'amount',
        'due_date',
        'paid_date',
        'status',
        'notes',
        'transaction_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_date' => 'date',
            'paid_date' => 'date',
        ];
    }

    public function billGroup(): BelongsTo
    {
        return $this->belongsTo(BillGroup::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(BillReminder::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
