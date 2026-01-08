@extends('admin.layouts.layout')

@section('title', 'Products')

@section('content')
    <div class="container-fluid py-4">
        <!-- Header -->
        <div class="card mb-3 border-0 shadow-sm">
            <div class="card-body">
                <h5 class="mb-0 fw-semibold">My Products</h5>
            </div>
        </div>

        <!-- Table Card -->
        <div class="card border-0 shadow-sm">
            <div class="card-body">

                <!-- Add Button -->
                <div class="d-flex justify-content-end mb-3">
                    <a href="{{ route('products.create') }}" class="btn btn-success">
                        Add Product
                    </a>
                </div>

                <!-- Table -->
                <div class="table-responsive">
                    <table class="table align-middle mb-0">
                        <thead class="border-bottom">
                            <tr class="text-muted small">
                                <th>ID</th>
                                <th>PRODUCT NAME</th>
                                <th>DESCRIPTION</th>
                                <th>BRANDS</th>
                                <th class="text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($products as $product)
                                <tr>
                                    <td>{{ $product->id }}</td>
                                    <td>{{ $product->product_name }}</td>
                                    <td>{{ Str::limit($product->product_description, 50) }}</td>
                                    <td>
                                        @if ($product->brands->count() > 0)
                                            {{ $product->brands->pluck('name')->implode(', ') }}
                                        @else
                                            <span class="text-muted">No brands</span>
                                        @endif
                                    </td>
                                    <td class="text-center" style="white-space: nowrap;">
                                        <a href="{{ route('products.edit', $product->id) }}"
                                            class="btn btn-sm btn-outline-primary" style="width: 50px;">
                                            <i class="ri-edit-line"></i>
                                        </a>
                                        <form action="{{ route('products.destroy', $product->id) }}" method="POST"
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
                                    <td colspan="5" class="text-center py-4">No products found</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <!-- Footer with Pagination -->
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div class="text-muted small">
                        Showing {{ $products->firstItem() }} to {{ $products->lastItem() }} of {{ $products->total() }}
                        entries
                    </div>

                    <nav>
                        {{ $products->links('pagination::bootstrap-5') }}
                    </nav>
                </div>

            </div>
        </div>
    </div>

@endsection
