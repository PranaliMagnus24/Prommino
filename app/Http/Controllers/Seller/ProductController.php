<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Product;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    public function index()
    {
        $query = Product::with('brands');

        if (Auth::user()->role !== 'admin') {
            $query->where('user_id', Auth::id());
        }

        $products = $query->paginate(10);

        return view('seller.product.index', compact('products'));
    }

    public function create()
    {
        return view('seller.product.create');
    }

    public function store(Request $request)
    {
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

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    public function edit(Product $product)
    {
        
        if ($product->user_id !== Auth::id()) {
            abort(403);
        }

        $product->load('brands');

        return view('seller.product.edit', compact('product'));
    }

    public function update(Request $request, Product $product)
    {

        if ($product->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'product_name' => 'required|string|max:255',
            'product_description' => 'required|string',
            'brands' => 'required|array|min:1',
            'brands.*.name' => 'required|string|max:255',
            'brands.*.description' => 'required|string',
            'brands.*.price' => 'required|numeric|min:0',
            'brands.*.image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $product->update([
            'product_name' => $request->product_name,
            'product_description' => $request->product_description,
        ]);


        $product->brands()->delete();


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

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            abort(403);
        }

        $product->delete();

        return redirect()->route('products.index')->with('success', 'Product deleted successfully.');
    }

    public function previewPdf(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            abort(403);
        }

        $product->load('brands');

        return view('seller.product.pdf', compact('product'));
    }

    public function downloadPdf(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            abort(403);
        }

        $product->load('brands');

        $pdf = Pdf::loadView('seller.product.pdf', compact('product'));

        return $pdf->download('product_'.$product->id.'.pdf');
    }
}
