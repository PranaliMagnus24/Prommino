<?php

namespace App\Http\Controllers\Admin\Api;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with('skills')
            ->where('role', 'seller')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string|max:10|unique:users',
            'country' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'password' => 'required|min:8',
            'skills' => 'nullable|array',
            'skills.*' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'country' => $request->country,
            'state' => $request->state,
            'password' => Hash::make($request->password),
            'role' => 'seller',
        ]);

        if ($request->skills) {
            foreach ($request->skills as $skillName) {
                if ($skillName) {
                    Skill::create([
                        'name' => $skillName,
                        'user_id' => $user->id,
                    ]);
                }
            }
        }

        return response()->json([
            'message' => 'Seller created successfully.',
            'user' => $user->load('skills'),
        ], 201);
    }
}
