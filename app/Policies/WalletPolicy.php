<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Auth\Access\Response;

class WalletPolicy
{
    public function view(User $user, Wallet $wallet): Response
    {
        return $this->owns($user, $wallet);
    }

    public function update(User $user, Wallet $wallet): Response
    {
        return $this->owns($user, $wallet);
    }

    public function delete(User $user, Wallet $wallet): Response
    {
        return $this->owns($user, $wallet);
    }

    private function owns(User $user, Wallet $wallet): Response
    {
        return $wallet->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
