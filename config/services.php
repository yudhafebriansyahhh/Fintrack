<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'whatsapp' => [
        'bot_phone' => env('WHATSAPP_BOT_PHONE', '081995851174'),
        'otp_ttl_minutes' => (int) env('WHATSAPP_OTP_TTL', 10),
        'driver' => env('WHATSAPP_DRIVER', 'log'),
        'webhook_token' => env('WHATSAPP_WEBHOOK_TOKEN'),
        'http' => [
            'endpoint' => env('WHATSAPP_ENDPOINT'),
            'token' => env('WHATSAPP_TOKEN'),
            'sender' => env('WHATSAPP_SENDER'),
        ],
    ],

    'telegram' => [
        'bot_username' => env('TELEGRAM_BOT_USERNAME'),
        'driver' => env('TELEGRAM_DRIVER', 'log'),
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
