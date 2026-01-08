<!DOCTYPE html>
<html>

<head>
    <title>Product Details</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .product-info {
            margin-bottom: 20px;
        }

        .brands {
            margin-top: 20px;
        }

        .brand {
            margin-bottom: 15px;
            border: 1px solid #ccc;
            padding: 10px;
        }

        .total {
            font-weight: bold;
            margin-top: 20px;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>Product Details</h1>
    </div>

    <div class="product-info">
        <h2>{{ $product->product_name }}</h2>
        <p><strong>Description:</strong> {{ $product->product_description }}</p>
    </div>

    <div class="brands">
        <h3>Brands</h3>
        @foreach ($product->brands as $brand)
            <div class="brand">
                <h4>{{ $brand->name }}</h4>
                <p><strong>Description:</strong> {{ $brand->description }}</p>
                <p><strong>Price:</strong> ${{ number_format($brand->price, 2) }}</p>
                @if ($brand->image)
                    <p><strong>Image:</strong> {{ $brand->image }}</p>
                @endif
            </div>
        @endforeach
    </div>

    <div class="total">
        <p>Total Price: ${{ number_format($totalPrice, 2) }}</p>
    </div>
</body>

</html>
