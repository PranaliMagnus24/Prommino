@extends('admin.layouts.layout')

@section('title', 'Edit Product')

@section('content')
    <div class="container-fluid py-4">
        <!-- Header -->
        <div class="card mb-3 border-0 shadow-sm">
            <div class="card-body">
                <h5 class="mb-0 fw-semibold">Edit Product</h5>
                <a href="{{ route('products.index') }}" class="btn btn-link btn-sm mt-2">← Back to Products</a>
            </div>
        </div>
        <!-- Form Card -->
        <form method="POST" action="{{ route('products.update', $product) }}" enctype="multipart/form-data">
            @csrf
            @method('PUT')
            <div class="card border-0 shadow-sm">
                <div class="card-body">

                    <h5>Product Details</h5>
                    <div class="mb-3">
                        <label for="product_name" class="form-label">Product Name</label>
                        <input type="text" class="form-control" id="product_name" name="product_name"
                            value="{{ old('product_name', $product->product_name) }}">
                        @error('product_name')
                            <span class="text-danger">{{ $message }}</span>
                        @enderror
                    </div>
                    <div class="mb-3">
                        <label for="product_description" class="form-label">Product Description</label>
                        <textarea class="form-control" id="product_description" name="product_description" rows="4">{{ old('product_description', $product->product_description) }}</textarea>
                        @error('product_description')
                            <span class="text-danger">{{ $message }}</span>
                        @enderror
                    </div>

                    <hr>

                    <h5>Brands</h5>
                    <div id="brands-container">
                        @foreach ($product->brands as $index => $brand)
                            <div class="brand-row mb-3 border p-3 rounded">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Brand Name</label>
                                        <input type="text" class="form-control" name="brands[{{ $index }}][name]"
                                            value="{{ old('brands.' . $index . '.name', $brand->name) }}"
                                            placeholder="Brand Name">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Price</label>
                                        <input type="number" step="0.01" class="form-control"
                                            name="brands[{{ $index }}][price]"
                                            value="{{ old('brands.' . $index . '.price', $brand->price) }}"
                                            placeholder="Price">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" name="brands[{{ $index }}][description]" rows="2" placeholder="Description">{{ old('brands.' . $index . '.description', $brand->description) }}</textarea>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label class="form-label">Image</label>
                                        <input type="file" class="form-control"
                                            name="brands[{{ $index }}][image]" accept="image/*">
                                        @if ($brand->image)
                                            <img src="{{ asset($brand->image) }}" alt="Brand Image" class="mt-2"
                                                style="max-width: 100px;">
                                        @endif
                                    </div>
                                </div>
                                <div class="col-md-1 d-flex align-items-end">
                                    <button type="button" class="btn btn-outline-danger btn-sm remove-brand">×</button>
                                </div>
                            </div>
                        @endforeach
                    </div>
                    <button type="button" class="btn btn-outline-success btn-sm" id="add-brand">
                        <i class="fas fa-plus"></i> Add New Brand
                    </button>

                    <!-- Buttons -->
                    <div class="d-flex justify-content-end mt-4">
                        <button type="submit" class="btn btn-primary">
                            UPDATE PRODUCT
                        </button>
                    </div>

                </div>
            </div>
        </form>

    </div>
@endsection
@section('scripts')
    <script>
        let brandIndex = {{ $product->brands->count() }};

        // Brands functionality
        document.getElementById('add-brand').addEventListener('click', function() {
            addBrandRow();
        });

        document.getElementById('brands-container').addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-brand')) {
                e.target.closest('.brand-row').remove();
            }
        });

        function addBrandRow() {
            const container = document.getElementById('brands-container');
            const row = document.createElement('div');
            row.className = 'brand-row mb-3 border p-3 rounded';
            row.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Brand Name</label>
                        <input type="text" class="form-control" name="brands[${brandIndex}][name]" placeholder="Brand Name">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Price</label>
                        <input type="number" step="0.01" class="form-control" name="brands[${brandIndex}][price]" placeholder="Price">
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-12">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" name="brands[${brandIndex}][description]" rows="2" placeholder="Description"></textarea>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-12">
                        <label class="form-label">Image</label>
                        <input type="file" class="form-control" name="brands[${brandIndex}][image]" accept="image/*">
                    </div>
                </div>
                <div class="col-md-1 d-flex align-items-end">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-brand">×</button>
                </div>
            `;
            container.appendChild(row);
            brandIndex++;
        }
    </script>
@endsection
