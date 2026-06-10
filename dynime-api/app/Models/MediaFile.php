<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MediaFile extends Model
{
    protected $fillable = [
        'filename', 'original_name', 'path', 'url',
        'mime_type', 'size', 'disk', 'alt_text', 'folder', 'uploaded_by',
    ];

    public function isImage(): bool {
        return str_starts_with($this->mime_type, 'image/');
    }
}
