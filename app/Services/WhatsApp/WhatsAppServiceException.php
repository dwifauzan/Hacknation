<?php

namespace App\Services\WhatsApp;

use RuntimeException;

class WhatsAppServiceException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 503,
        public readonly array $context = [],
    ) {
        parent::__construct($message, $status);
    }
}
