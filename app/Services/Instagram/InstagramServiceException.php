<?php

namespace App\Services\Instagram;

use RuntimeException;

class InstagramServiceException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 503)
    {
        parent::__construct($message, $status);
    }
}
