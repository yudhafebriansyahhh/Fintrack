<?php

namespace App\Services\Telegram;

use App\Models\Wallet;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class WalletMatcher
{
    /**
     * @var array<string, array<int, string>>
     */
    private const ALIAS_MAP = [
        'Bank BCA' => ['bca', 'bank bca', 'rekening bca'],
        'Bank Mandiri' => ['mandiri', 'bank mandiri', 'rekening mandiri'],
        'Bank BRI' => ['bri', 'bank bri', 'rekening bri'],
        'Bank BNI' => ['bni', 'bank bni', 'rekening bni'],
        'Bank BSI' => ['bsi', 'bank bsi', 'rekening bsi'],
        'Bank CIMB' => ['cimb', 'cimb niaga', 'bank cimb'],
        'SeaBank' => ['seabank', 'sea bank', 'rekening seabank'],
        'Jago' => ['jago', 'bank jago'],
        'Cash' => ['cash', 'tunai', 'duit cash'],
        'DANA' => ['dana'],
        'Gopay' => ['gopay', 'go pay', 'gojek'],
        'OVO' => ['ovo'],
        'ShopeePay' => ['shopeepay', 'shopee pay', 'spay'],
        'LinkAja' => ['linkaja', 'link aja'],
    ];

    /**
     * @param  Collection<int, Wallet>|iterable<int, Wallet>  $wallets
     */
    public function findByKeyword(?string $keyword, iterable $wallets): ?Wallet
    {
        if (! $keyword) {
            return null;
        }

        $needle = $this->normalize($keyword);
        if ($needle === '') {
            return null;
        }

        $collection = $wallets instanceof Collection ? $wallets : collect($wallets);
        $active = $collection->filter(fn (Wallet $wallet) => $wallet->is_active);

        $exact = $active->first(fn (Wallet $wallet) => $this->normalize($wallet->name) === $needle);
        if ($exact) {
            return $exact;
        }

        $aliasMatchName = $this->resolveAlias($needle);
        if ($aliasMatchName) {
            $aliased = $active->first(fn (Wallet $wallet) => $this->normalize($wallet->name) === $this->normalize($aliasMatchName));
            if ($aliased) {
                return $aliased;
            }
        }

        $contains = $active->first(function (Wallet $wallet) use ($needle) {
            $name = $this->normalize($wallet->name);

            return str_contains($name, $needle) || str_contains($needle, $name);
        });

        return $contains;
    }

    private function resolveAlias(string $needle): ?string
    {
        foreach (self::ALIAS_MAP as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($this->normalize($alias) === $needle) {
                    return $canonical;
                }
            }
        }

        return null;
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace("\xc2\xa0", ' ')
            ->replaceMatches('/\s+/u', ' ')
            ->trim()
            ->__toString();
    }
}
