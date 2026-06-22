<?php
namespace App\Traits;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

trait HasDynamicIdType
{
    protected static function bootHasDynamicIdType()
    {
        static::creating(function ($model) {
            try {
                if (Schema::hasColumn($model->getTable(), 'id')) {
                    $type = Schema::getColumnType($model->getTable(), 'id');
                    if (in_array($type, ['string', 'varchar', 'char'])) {
                        if (empty($model->id)) {
                            $model->id = (string) Str::uuid();
                        }
                    }
                }
            } catch (\Exception $e) {}
        });
    }

    public function getKeyType()
    {
        try {
            if (Schema::hasColumn($this->getTable(), 'id')) {
                $type = Schema::getColumnType($this->getTable(), 'id');
                if (in_array($type, ['string', 'varchar', 'char'])) {
                    return 'string';
                }
            }
        } catch (\Exception $e) {}
        return parent::getKeyType();
    }

    public function getIncrementing()
    {
        try {
            if (Schema::hasColumn($this->getTable(), 'id')) {
                $type = Schema::getColumnType($this->getTable(), 'id');
                if (in_array($type, ['string', 'varchar', 'char'])) {
                    return false;
                }
            }
        } catch (\Exception $e) {}
        return parent::getIncrementing();
    }
}
