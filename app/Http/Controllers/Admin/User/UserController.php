<?php

namespace App\Http\Controllers\Admin\User;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('skills')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return view('admin.users.index', compact('users'));
    }

    public function create()
    {
        return view('admin.users.create');
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

        return redirect()->route('users.index')
            ->with('success', 'Seller created successfully with skills.');
    }

    public function edit($id)
    {
        $user = User::with('skills')->findOrFail($id);

        return view('admin.users.edit', compact('user'));
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'phone' => 'nullable|string|max:10|unique:users,phone,'.$user->id,
            'country' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'password' => 'nullable|min:8',
            'skills' => 'nullable|array',
            'skills.*' => 'nullable|string|max:255',
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'country' => $request->country,
            'state' => $request->state,
        ]);

        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        $user->skills()->delete();

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

        return redirect()->route('users.index')
            ->with('success', 'User updated successfully.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->skills()->delete(); 
        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'User deleted successfully.');
    }
}