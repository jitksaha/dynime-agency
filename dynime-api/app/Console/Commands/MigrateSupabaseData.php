<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDO;
use Exception;

class MigrateSupabaseData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'data:migrate-supabase';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate employees, careers, and job applications from Supabase PostgreSQL to local MySQL';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting Supabase -> MySQL Data Migration...");

        $host = 'aws-1-ap-southeast-2.pooler.supabase.com';
        $port = 5432;
        $db = 'postgres';
        $user = 'postgres.isweduliawwjqwhyvwhp';
        $pass = 'Pixel#@!194JkS';

        try {
            $this->info("Connecting to Supabase PostgreSQL...");
            $dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require";
            $supabasePdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 30
            ]);
            $this->info("Connected successfully to Supabase.");
        } catch (Exception $e) {
            $this->error("Connection to Supabase failed: " . $e->getMessage());
            return Command::FAILURE;
        }

        // 1. Migrate Office Locations first to resolve foreign keys
        $officeLocationsMap = $this->migrateOfficeLocations($supabasePdo);

        // 2. Migrate Careers passing the office location mapping
        $this->migrateCareers($supabasePdo, $officeLocationsMap);

        // 3. Migrate Job Applications
        $this->migrateJobApplications($supabasePdo);

        // 4. Migrate Employees
        $this->migrateEmployees($supabasePdo);

        $this->info("All migrations completed!");
        return Command::SUCCESS;
    }

    private function migrateOfficeLocations($pdo)
    {
        $this->info("\n--- Migrating Office Locations ---");
        $map = [];

        try {
            $stmt = $pdo->query("SELECT * FROM public.office_locations ORDER BY created_at ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->info("Found " . count($rows) . " office locations on Supabase.");
        } catch (Exception $e) {
            $this->error("Failed to fetch office locations: " . $e->getMessage());
            return $map;
        }

        $mysqlColumns = Schema::getColumnListing('office_locations');
        
        $idType = 'string';
        try {
            $idType = Schema::getColumnType('office_locations', 'id');
        } catch (Exception $e) {}
        
        $isIntegerId = in_array($idType, ['bigint', 'integer', 'int']);
        $nextId = 1;
        if ($isIntegerId) {
            $maxId = DB::table('office_locations')->max('id');
            $nextId = $maxId ? ($maxId + 1) : 1;
        }

        $imported = 0;
        $updated = 0;

        foreach ($rows as $row) {
            try {
                // Determine ID to write
                $locationId = null;
                $existing = DB::table('office_locations')->where('name', $row['name'])->first();
                if ($isIntegerId) {
                    $locationId = $existing ? $existing->id : $nextId++;
                } else {
                    $locationId = $row['id'];
                }

                // Add to mapping
                $map[$row['id']] = $locationId;

                // Prepare values
                $data = [];
                foreach ($mysqlColumns as $col) {
                    if ($col === 'id') {
                        $data[$col] = $locationId;
                        continue;
                    }

                    if (array_key_exists($col, $row)) {
                        $val = $row[$col];
                        
                        try {
                            $colType = Schema::getColumnType('office_locations', $col);
                        } catch (Exception $e) {
                            $colType = 'text';
                        }

                        if (in_array($colType, ['datetime', 'timestamp'])) {
                            $val = $this->formatTimestamp($val);
                        } elseif ($colType === 'date') {
                            $val = !empty($val) ? date('Y-m-d', strtotime($val)) : null;
                        } elseif (($colType === 'string' || $colType === 'varchar') && is_string($val)) {
                            $val = substr($val, 0, 255);
                        }

                        $data[$col] = $val;
                    }
                }

                if ($existing) {
                    DB::table('office_locations')->where('id', $existing->id)->update($data);
                    $updated++;
                } else {
                    DB::table('office_locations')->insert($data);
                    $imported++;
                }
            } catch (Exception $e) {
                $this->error("Failed to migrate office location '{$row['name']}': " . $e->getMessage());
            }
        }

        $this->info("Office Locations Migration completed: {$imported} imported, {$updated} updated.");
        return $map;
    }

    private function migrateCareers($pdo, $officeLocationsMap = [])
    {
        $this->info("\n--- Migrating Careers ---");
        try {
            $stmt = $pdo->query("SELECT * FROM public.careers ORDER BY created_at ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->info("Found " . count($rows) . " careers on Supabase.");
        } catch (Exception $e) {
            $this->error("Failed to fetch careers: " . $e->getMessage());
            return;
        }

        $mysqlColumns = Schema::getColumnListing('careers');
        
        $idType = 'string';
        try {
            $idType = Schema::getColumnType('careers', 'id');
        } catch (Exception $e) {}
        
        $isIntegerId = in_array($idType, ['bigint', 'integer', 'int']);
        $nextId = 1;
        if ($isIntegerId) {
            $maxId = DB::table('careers')->max('id');
            $nextId = $maxId ? ($maxId + 1) : 1;
        }

        $imported = 0;
        $updated = 0;

        foreach ($rows as $row) {
            try {
                // Determine ID to write
                $careerId = null;
                $existing = DB::table('careers')->where('slug', $row['slug'])->first();
                if ($isIntegerId) {
                    $careerId = $existing ? $existing->id : $nextId++;
                } else {
                    $careerId = $row['id'];
                }

                // Prepare values
                $data = [];
                foreach ($mysqlColumns as $col) {
                    if ($col === 'id') {
                        $data[$col] = $careerId;
                        continue;
                    }
                    if ($col === 'office_location_id') {
                        $oldLocId = $row['office_location_id'] ?? null;
                        $data[$col] = ($oldLocId && isset($officeLocationsMap[$oldLocId])) ? $officeLocationsMap[$oldLocId] : null;
                        continue;
                    }

                    if (array_key_exists($col, $row)) {
                        $val = $row[$col];
                        
                        // Check column type dynamically
                        try {
                            $colType = Schema::getColumnType('careers', $col);
                        } catch (Exception $e) {
                            $colType = 'text';
                        }

                        // Format value by column type
                        if (in_array($colType, ['datetime', 'timestamp'])) {
                            $val = $this->formatTimestamp($val);
                        } elseif ($colType === 'date') {
                            $val = !empty($val) ? date('Y-m-d', strtotime($val)) : null;
                        } elseif (($colType === 'string' || $colType === 'varchar') && is_string($val)) {
                            $val = substr($val, 0, 255);
                        }

                        // Format JSON or boolean columns if necessary
                        if ($col === 'responsibilities' || $col === 'requirements' || $col === 'posting_channels') {
                            $data[$col] = is_string($val) ? $val : json_encode($val);
                        } elseif ($col === 'is_active' || $col === 'is_featured') {
                            $data[$col] = ($val === 't' || $val === true || $val === 1 || $val === '1') ? 1 : 0;
                        } else {
                            $data[$col] = $val;
                        }
                    }
                }

                if ($existing) {
                    DB::table('careers')->where('id', $existing->id)->update($data);
                    $updated++;
                } else {
                    DB::table('careers')->insert($data);
                    $imported++;
                }
            } catch (Exception $e) {
                $this->error("Failed to migrate career slug '{$row['slug']}': " . $e->getMessage());
            }
        }

        $this->info("Careers Migration completed: {$imported} imported, {$updated} updated.");
    }

    private function migrateJobApplications($pdo)
    {
        $this->info("\n--- Migrating Job Applications ---");
        try {
            $stmt = $pdo->query("SELECT * FROM public.job_applications ORDER BY created_at ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->info("Found " . count($rows) . " job applications on Supabase.");
        } catch (Exception $e) {
            $this->error("Failed to fetch job applications: " . $e->getMessage());
            return;
        }

        $mysqlColumns = Schema::getColumnListing('job_applications');

        $idType = 'string';
        try {
            $idType = Schema::getColumnType('job_applications', 'id');
        } catch (Exception $e) {}
        
        $isIntegerId = in_array($idType, ['bigint', 'integer', 'int']);
        $nextId = 1;
        if ($isIntegerId) {
            $maxId = DB::table('job_applications')->max('id');
            $nextId = $maxId ? ($maxId + 1) : 1;
        }

        $imported = 0;
        $skipped = 0;

        // Fetch new career IDs map
        $careers = DB::table('careers')->get(['id', 'slug'])->pluck('id', 'slug')->toArray();

        foreach ($rows as $row) {
            try {
                // Find matching career ID by slug
                $careerSlug = $row['career_slug'] ?? null;
                $newCareerId = null;
                if ($careerSlug && isset($careers[$careerSlug])) {
                    $newCareerId = $careers[$careerSlug];
                }

                // Check if already exists by email and career
                $existing = DB::table('job_applications')
                    ->where('email', $row['email'])
                    ->where('career_slug', $row['career_slug'])
                    ->where('created_at', $this->formatTimestamp($row['created_at']))
                    ->first();

                if ($existing) {
                    $skipped++;
                    continue;
                }

                // Determine ID to write
                $appId = $isIntegerId ? $nextId++ : $row['id'];

                // Prepare values
                $data = [];
                foreach ($mysqlColumns as $col) {
                    if ($col === 'id') {
                        $data[$col] = $appId;
                        continue;
                    }
                    if ($col === 'career_id') {
                        $data[$col] = $newCareerId;
                        continue;
                    }

                    if (array_key_exists($col, $row)) {
                        $val = $row[$col];

                        // Check column type dynamically
                        try {
                            $colType = Schema::getColumnType('job_applications', $col);
                        } catch (Exception $e) {
                            $colType = 'text';
                        }

                        // Format value by column type
                        if (in_array($colType, ['datetime', 'timestamp'])) {
                            $val = $this->formatTimestamp($val);
                        } elseif ($colType === 'date') {
                            $val = !empty($val) ? date('Y-m-d', strtotime($val)) : null;
                        } elseif (($colType === 'string' || $colType === 'varchar') && is_string($val)) {
                            $val = substr($val, 0, 255);
                        }

                        if ($col === 'metadata' || $col === 'ats_contact_links') {
                            $data[$col] = is_string($val) ? $val : json_encode($val);
                        } elseif (in_array($col, ['ats_matched_keywords', 'ats_missing_keywords', 'ats_detected_skills', 'ats_detected_titles', 'ats_red_flags', 'ats_highlights'])) {
                            $data[$col] = json_encode($this->parsePostgresArray($val));
                        } else {
                            $data[$col] = $val;
                        }
                    }
                }

                DB::table('job_applications')->insert($data);
                $imported++;
            } catch (Exception $e) {
                $this->error("Failed to migrate job application for '{$row['email']}': " . $e->getMessage());
            }
        }

        $this->info("Job Applications Migration completed: {$imported} imported, {$skipped} skipped.");
    }

    private function migrateEmployees($pdo)
    {
        $this->info("\n--- Migrating Employees ---");
        try {
            $stmt = $pdo->query("SELECT * FROM public.employees ORDER BY created_at ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->info("Found " . count($rows) . " employees on Supabase.");
        } catch (Exception $e) {
            $this->error("Failed to fetch employees: " . $e->getMessage());
            return;
        }

        $mysqlColumns = Schema::getColumnListing('employees');
        $imported = 0;
        $updated = 0;

        foreach ($rows as $row) {
            try {
                // Check by ID or Email
                $existing = null;
                if (!empty($row['id'])) {
                    $existing = DB::table('employees')->where('id', $row['id'])->first();
                }
                if (!$existing && !empty($row['email'])) {
                    $existing = DB::table('employees')->where('email', $row['email'])->first();
                }

                // Prepare values
                $data = [];
                foreach ($mysqlColumns as $col) {
                    if (array_key_exists($col, $row)) {
                        $val = $row[$col];

                        // Check column type dynamically
                        try {
                            $colType = Schema::getColumnType('employees', $col);
                        } catch (Exception $e) {
                            $colType = 'text';
                        }

                        // Format value by column type
                        if (in_array($colType, ['datetime', 'timestamp'])) {
                            $val = $this->formatTimestamp($val);
                        } elseif ($colType === 'date') {
                            $val = !empty($val) ? date('Y-m-d', strtotime($val)) : null;
                        } elseif (($colType === 'string' || $colType === 'varchar') && is_string($val)) {
                            $val = substr($val, 0, 255);
                        }

                        if ($col === 'allowances' || $col === 'deductions' || $col === 'metadata') {
                            $data[$col] = is_string($val) ? $val : json_encode($val);
                        } else {
                            $data[$col] = $val;
                        }
                    }
                }

                if ($existing) {
                    DB::table('employees')->where('id', $existing->id)->update($data);
                    $updated++;
                } else {
                    // Generate UUID if ID is missing (should not be, but safety first)
                    if (empty($data['id'])) {
                        $data['id'] = (string) \Illuminate\Support\Str::uuid();
                    }
                    DB::table('employees')->insert($data);
                    $imported++;
                }
            } catch (Exception $e) {
                $this->error("Failed to migrate employee '{$row['full_name']}': " . $e->getMessage());
            }
        }

        $this->info("Employees Migration completed: {$imported} imported, {$updated} updated.");
    }

    /**
     * Helper method to format pgsql timestamp to mysql datetime format.
     */
    private function formatTimestamp($val)
    {
        if (empty($val)) {
            return null;
        }
        return date('Y-m-d H:i:s', strtotime($val));
    }

    /**
     * Helper method to parse PostgreSQL array string format.
     */
    private function parsePostgresArray($pgArray)
    {
        if (empty($pgArray)) {
            return [];
        }
        if (is_array($pgArray)) {
            return $pgArray;
        }
        if ($pgArray[0] !== '{' || substr($pgArray, -1) !== '}') {
            return [$pgArray];
        }
        
        $content = substr($pgArray, 1, -1);
        if (empty($content)) {
            return [];
        }
        
        // Parse comma separated values, handling quotes
        $result = [];
        $len = strlen($content);
        $inQuotes = false;
        $currentVal = '';
        
        for ($i = 0; $i < $len; $i++) {
            $char = $content[$i];
            if ($char === '"') {
                $inQuotes = !$inQuotes;
            } elseif ($char === ',' && !$inQuotes) {
                $result[] = trim($currentVal, " \t\n\r\0\x0B\"");
                $currentVal = '';
            } else {
                $currentVal .= $char;
            }
        }
        $result[] = trim($currentVal, " \t\n\r\0\x0B\"");
        
        return $result;
    }
}
