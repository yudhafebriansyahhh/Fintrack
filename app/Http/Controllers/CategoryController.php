<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Support\DefaultCategories;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Categories/Index', [
            'categories' => $request->user()
                ->categories()
                ->withCount('transactions')
                ->orderByDesc('is_active')
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->user()->categories()->create($this->validated($request) + [
            'is_default' => false,
            'is_active' => true,
        ]);

        return back()->with('success', 'Kategori berhasil ditambahkan.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $this->authorize('update', $category);

        $category->update($this->validated($request));

        return back()->with('success', 'Kategori berhasil diperbarui.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        $this->authorize('delete', $category);

        if ($category->transactions()->exists()) {
            $category->update(['is_active' => false]);

            return back()->with('success', 'Kategori memiliki riwayat transaksi, jadi dinonaktifkan.');
        }

        $category->delete();

        return back()->with('success', 'Kategori berhasil dihapus.');
    }

    public function seedDefaults(Request $request): RedirectResponse
    {
        $created = DefaultCategories::ensureFor($request->user());

        if ($created === 0) {
            return back()->with('success', 'Semua kategori bawaan sudah tersedia.');
        }

        return back()->with('success', "Berhasil menambahkan {$created} kategori bawaan.");
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['income', 'expense'])],
            'icon' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

}
