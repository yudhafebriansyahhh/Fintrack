<?php

namespace App\Policies;

use App\Models\BillItem;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BillItemPolicy
{
    public function view(User $user, BillItem $billItem): Response
    {
        return $this->owns($user, $billItem);
    }

    public function update(User $user, BillItem $billItem): Response
    {
        return $this->owns($user, $billItem);
    }

    public function delete(User $user, BillItem $billItem): Response
    {
        return $this->owns($user, $billItem);
    }

    private function owns(User $user, BillItem $billItem): Response
    {
        return $billItem->billGroup?->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
