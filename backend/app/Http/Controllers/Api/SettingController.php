<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(Request $request)
    {
        $query = Setting::query();
        if ($request->filled('group')) {
            $query->where('group', $request->group);
        }
        return response()->json($query->orderBy('group')->orderBy('key')->get());
    }

    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable|string',
        ]);

        foreach ($request->settings as $setting) {
            Setting::setValue($setting['key'], $setting['value']);
        }

        return response()->json(['message' => 'Configuración actualizada.']);
    }
}
