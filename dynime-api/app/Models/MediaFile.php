<?php
namespace App\Models;

use App\Traits\HasDynamicIdType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class MediaFile extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'filename', 'original_name', 'path', 'url',
        'mime_type', 'size', 'disk', 'alt_text', 'folder', 'uploaded_by',
    ];

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk ?? 'public')->url($this->path);
    }

    public function isImage(): bool {
        return str_starts_with($this->mime_type, 'image/');
    }
}
