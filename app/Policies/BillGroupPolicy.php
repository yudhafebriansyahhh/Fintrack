<?php

namespace App\Policies;

use App\Models\BillGroup;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BillGroupPolicy
{
    public function view(User $user, BillGroup $billGroup): Response
    {
        return $this->owns($user, $billGroup);
    }

    public function update(User $user, BillGroup $billGroup): Response
    {
        return $this->owns($user, $billGroup);
    }

    public function delete(User $user, BillGroup $billGroup): Response
    {
        return $this->owns($user, $billGroup);
    }

    private function owns(User $user, BillGroup $billGroup): Response
    {
        return $billGroup->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
