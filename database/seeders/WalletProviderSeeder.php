<?php

namespace Database\Seeders;

use App\Models\WalletProvider;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class WalletProviderSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedFromDirectory('bank', public_path('wallet-providers/banks'), '/wallet-providers/banks');
        $this->seedFromDirectory('e-wallet', public_path('wallet-providers/e-wallets'), '/wallet-providers/e-wallets');
    }

    private function seedFromDirectory(string $type, string $directory, string $publicPath): void
    {
        if (! File::isDirectory($directory)) {
            return;
        }

        foreach (File::files($directory) as $file) {
            if (! in_array(Str::lower($file->getExtension()), ['svg', 'png', 'jpg', 'jpeg', 'webp'], true)) {
                continue;
            }

            $name = pathinfo($file->getFilename(), PATHINFO_FILENAME);
            if ($name === 'Background') {
                continue;
            }

            WalletProvider::updateOrCreate(
                [
                    'user_id' => null,
                    'name' => $this->providerName($name),
                    'type' => $type,
                ],
                [
                    'logo' => $publicPath.'/'.rawurlencode($file->getFilename()),
                    'is_default' => true,
                    'status' => 'active',
                ],
            );
        }
    }

    private function providerName(string $name): string
    {
        return trim(preg_replace('/\s+\(Alt\)$/', '', $name));
    }
}
