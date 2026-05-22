<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlaceholderController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Endpoint sudah disiapkan sesuai PRD dan menunggu implementasi fitur.',
            'method' => $request->method(),
            'path' => $request->path(),
        ], 501);
    }

    public function index(Request $request): JsonResponse
    {
        return $this($request);
    }

    public function store(Request $request): JsonResponse
    {
        return $this($request);
    }

    public function show(Request $request, mixed ...$parameters): JsonResponse
    {
        return $this($request);
    }

    public function update(Request $request, mixed ...$parameters): JsonResponse
    {
        return $this($request);
    }

    public function destroy(Request $request, mixed ...$parameters): JsonResponse
    {
        return $this($request);
    }
}
