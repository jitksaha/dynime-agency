<?php

namespace App\Services\Contracts;

interface AtsProviderInterface
{
    /**
     * Fetch all active jobs from the ATS.
     *
     * @return array<\App\DTOs\AtsJobDTO>
     */
    public function fetchJobs(): array;
}
