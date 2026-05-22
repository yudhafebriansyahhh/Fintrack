<?php

namespace App\Policies;

use App\Models\Debt;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class DebtPolicy
{
    public function view(User $user, Debt $debt): Response
    {
        return $debt->user_id === $user->id ? Response::allow() : Response::denyAsNotFound();
    }

    public function update(User $user, Debt $debt): Response
    {
        return $debt->user_id === $user->id ? Response::allow() : Response::denyAsNotFound();
    }

    public function delete(User $user, Debt $debt): Response
    {
        return $debt->user_id === $user->id ? Response::allow() : Response::denyAsNotFound();
    }
}
