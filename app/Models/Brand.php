<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    protected $table = 'brands';

    protected $fillable = ['product_id', 'name', 'description', 'price', 'image'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
