<?php

namespace App\Http\Controllers\Api\Media;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;

class MediaController extends Controller
{
    private const ALLOWED_MIMES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    private const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    public function index(Request $request): JsonResponse
    {
        $files = MediaFile::query()
            ->when($request->folder, fn($q) => $q->where('folder', $request->folder))
            ->when($request->type, function ($q) use ($request) {
                if ($request->type === 'image') {
                    $q->where('mime_type', 'like', 'image/%');
                } else {
                    $q->where('mime_type', 'not like', 'image/%');
                }
            })
            ->orderByDesc('created_at')
            ->paginate(60);

        return response()->json($files);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'     => 'required|file|max:10240',
            'folder'   => 'nullable|string|max:100|alpha_dash',
            'alt_text' => 'nullable|string|max:500',
        ]);

        $file = $request->file('file');

        // Security: validate mime type
        if (!in_array($file->getMimeType(), self::ALLOWED_MIMES)) {
            return response()->json(['message' => 'File type not allowed.'], 422);
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            return response()->json(['message' => 'File exceeds 10MB limit.'], 422);
        }

        $folder   = $request->input('folder', 'uploads');
        $ext      = $file->extension();
        $filename = Str::uuid() . '.' . $ext;
        $path     = "{$folder}/{$filename}";

        // Optimize images before storing
        if (str_starts_with($file->getMimeType(), 'image/') && $file->getMimeType() !== 'image/svg+xml') {
            try {
                $image = Image::read($file->getPathname());
                // Max width 2000px while keeping aspect ratio
                if ($image->width() > 2000) {
                    $image->scale(width: 2000);
                }
                Storage::disk('public')->put($path, $image->toJpeg(85));
                $ext = 'jpg';
                $filename = Str::uuid() . '.jpg';
                $path = "{$folder}/{$filename}";
            } catch (\Exception $e) {
                // Fall back to direct store if optimization fails
                Storage::disk('public')->putFileAs($folder, $file, $filename);
            }
        } else {
            Storage::disk('public')->putFileAs($folder, $file, $filename);
        }

        $url = Storage::disk('public')->url($path);

        $media = MediaFile::create([
            'filename'      => $filename,
            'original_name' => $file->getClientOriginalName(),
            'path'          => $path,
            'url'           => $url,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'disk'          => 'public',
            'alt_text'      => $request->input('alt_text'),
            'folder'        => $folder,
            'uploaded_by'   => $request->user()?->id,
        ]);

        return response()->json($media, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $media = MediaFile::findOrFail($id);
        $data  = $request->validate([
            'alt_text' => 'nullable|string|max:500',
            'folder'   => 'nullable|string|max:100|alpha_dash',
        ]);
        $media->update($data);
        return response()->json($media);
    }

    public function destroy(string $id): JsonResponse
    {
        $media = MediaFile::findOrFail($id);
        Storage::disk('public')->delete($media->path);
        $media->delete();
        return response()->json(['message' => 'File deleted successfully.']);
    }

    public function folders(): JsonResponse
    {
        $folders = MediaFile::distinct()->orderBy('folder')->pluck('folder');
        return response()->json($folders);
    }
}
