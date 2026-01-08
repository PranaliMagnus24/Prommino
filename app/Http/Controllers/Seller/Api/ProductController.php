<?php

namespace App\Http\Controllers\Seller\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Product;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::where('user_id', Auth::id())
            ->with('brands')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'product_name' => 'required|string|max:255',
                'product_description' => 'required|string',
                'brands' => 'required|array|min:1',
                'brands.*.name' => 'required|string|max:255',
                'brands.*.description' => 'required|string',
                'brands.*.price' => 'required|numeric|min:0',
                'brands.*.image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            $product = Product::create([
                'user_id' => Auth::id(),
                'product_name' => $request->product_name,
                'product_description' => $request->product_description,
            ]);

            foreach ($request->brands as $brandData) {
                $imagePath = null;
                if (isset($brandData['image'])) {
                    $filename = time().'_'.$brandData['image']->getClientOriginalName();
                    $brandData['image']->move(public_path('upload/brand'), $filename);
                    $imagePath = 'upload/brand/'.$filename;
                }

                Brand::create([
                    'product_id' => $product->id,
                    'name' => $brandData['name'],
                    'description' => $brandData['description'],
                    'price' => $brandData['price'],
                    'image' => $imagePath,
                ]);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Server error',
            ], 500);
        }
    }

    public function destroy(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully.']);
    }

    public function generatePdf(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $product->load('brands');
        $totalPrice = $product->brands->sum('price');

        $pdf = Pdf::loadView('seller.product.pdf', compact('product', 'totalPrice'));

        return response()->streamDownload(
    fn () => print($pdf->output()),
    'product_'.$product->id.'.pdf'
);

    }
}