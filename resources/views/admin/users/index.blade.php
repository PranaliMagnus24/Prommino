@extends('admin.layouts.layout')

@section('title', 'User')

@section('content')
    <div class="container-fluid py-4">
        <!-- Header -->
        <div class="card mb-3 border-0 shadow-sm">
            <div class="card-body">
                <h5 class="mb-0 fw-semibold">List</h5>
            </div>
        </div>

        <!-- Table Card -->
        <div class="card border-0 shadow-sm">
            <div class="card-body">

                <!-- Add Button -->
                <div class="d-flex justify-content-end mb-3">
                    <a href="{{ route('users.create') }}" class="btn btn-success">
                        Add
                    </a>
                </div>

                <!-- Table -->
                <div class="table-responsive">
                    <table class="table align-middle mb-0">
                        <thead class="border-bottom">
                            <tr class="text-muted small">
                                <th>ID</th>
                                <th>NAME</th>
                                <th>EMAIL</th>
                                <th>PHONE NO</th>
                                <th>SKILLS</th>
                                <th class="text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($users as $user)
                                <tr>
                                    <td>{{ $user->id }}</td>
                                    <td>{{ $user->name }}</td>
                                    <td>{{ $user->email }}</td>
                                    <td>{{ $user->phone ?? 'N/A' }}</td>
                                    <td>
                                        @if ($user->skills->count() > 0)
                                            {{ $user->skills->pluck('name')->implode(', ') }}
                                        @else
                                            <span class="text-muted">No skills</span>
                                        @endif
                                    </td>
                                    <td class="text-center" style="white-space: nowrap;">
                                        <a href="{{ route('users.edit', $user->id) }}"
                                            class="btn btn-sm btn-outline-primary" style="width: 50px;">
                                            <i class="ri-edit-line"></i>
                                        </a>
                                        <form action="{{ route('users.destroy', $user->id) }}" method="POST"
                                            class="d-inline">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="btn btn-sm btn-outline-danger"
                                                onclick="return confirm('Are you sure?')" style="width: 40px;">
                                                <i class="ri-delete-bin-line"></i>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="6" class="text-center py-4">No users found</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div class="text-muted small">
                        Showing {{ $users->firstItem() }} to {{ $users->lastItem() }} of {{ $users->total() }} entries
                    </div>

                    <nav>
                        {{ $users->links('pagination::bootstrap-5') }}
                    </nav>
                </div>

            </div>
        </div>
    </div>

@endsection

@push('scripts')
@endpush
