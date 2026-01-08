<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Details - {{ $product->product_name }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .product-info {
            margin-bottom: 20px;
        }

        .brands {
            margin-top: 20px;
        }

        .brand {
            margin-bottom: 15px;
            border: 1px solid #ddd;
            padding: 10px;
        }

        .brand img {
            max-width: 100px;
            max-height: 100px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
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
        <p><strong>ID:</strong> {{ $product->id }}</p>
    </div>

    <div class="brands">
        <h3>Brands</h3>
        @if ($product->brands->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Image</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($product->brands as $brand)
                        <tr>
                            <td>{{ $brand->name }}</td>
                            <td>{{ $brand->description }}</td>
                            <td>${{ number_format($brand->price, 2) }}</td>
                            <td>
                                @if ($brand->image)
                                    <img src="{{ asset($brand->image) }}" alt="{{ $brand->name }}">
                                @else
                                    No Image
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>No brands available.</p>
        @endif
    </div>
</body>

</html>
