<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class WalletProviderController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('wallet_providers')->where(fn ($query) => $query
                    ->where('type', $request->input('type'))
                    ->where(function ($query) use ($request) {
                        $query->whereNull('user_id')
                            ->orWhere('user_id', $request->user()->id);
                    })),
            ],
            'type' => ['required', Rule::in(['bank', 'e-wallet'])],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024'],
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('wallet-provider-logos', 'public');
            $data['logo'] = '/storage/'.$path;
        }

        $request->user()->walletProviders()->create([
            'name' => $data['name'],
            'type' => $data['type'],
            'logo' => $data['logo'] ?? null,
            'is_default' => false,
            'status' => 'active',
        ]);

        return back()->with('success', 'Provider dompet berhasil ditambahkan.');
    }
}
