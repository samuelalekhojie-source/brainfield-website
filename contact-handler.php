<?php
/**
 * Brainfield Group — contact form handler (PHP / non-Netlify hosting only).
 *
 * NOT CURRENTLY WIRED UP. The live site's contact form is currently
 * configured for Netlify Forms instead (see contact.html's data-netlify
 * attribute and js/main.js) because the site is hosted on Netlify, which
 * doesn't execute PHP.
 *
 * Keep this file around in case Brainfield ever moves to PHP-capable
 * hosting (cPanel etc.) instead — in that case, point js/main.js's fetch()
 * back at this file and remove the data-netlify/form-name markup from
 * contact.html's <form>.
 *
 * Receives the contact form as JSON (via fetch), validates it, and emails
 * it to the Brainfield inbox with the visitor's address set as Reply-To.
 *
 * Requirements: PHP with mail() enabled. This is on by default on virtually
 * all cPanel / shared hosting (Truehost, Whogohost, Qservers, Namecheap,
 * etc.). It will NOT work on static-only hosts (GitHub Pages, Netlify,
 * Vercel, S3) — those need a form service like Formspree or Web3Forms
 * instead, since they don't run PHP.
 *
 * Before going live: change RECIPIENT_EMAIL / SENDER_EMAIL below if needed.
 * Some hosts disable mail() or require extra SMTP setup — if messages
 * still don't arrive after this file returns success, check your host's
 * mail / SMTP settings, or check error_log() output in cPanel.
 *
 * --- Hardening note -------------------------------------------------------
 * This script guarantees the HTTP response body is ALWAYS clean JSON, even
 * if PHP itself throws a warning/notice internally (e.g. a host that has
 * disabled mail() prints "Warning: mail() has been disabled..."). Without
 * this, that warning text gets prepended to the JSON and breaks
 * response.json() on the frontend, which is what "Unexpected response from
 * the server" means. Every code path below is wrapped so stray output is
 * discarded before we ever echo the real response.
 * ---------------------------------------------------------------------- */

// Buffer everything from this point on, so any incidental output (a BOM
// before "<?php", a notice, a deprecation warning) can be discarded before
// we send the real JSON response.
ob_start();

@ini_set('display_errors', '0');
error_reporting(E_ALL);

// Turn PHP warnings/notices into exceptions so a single try/catch below
// can handle them the same way as everything else, instead of them being
// printed into the response body.
set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

const RECIPIENT_EMAIL = 'info@brainfieldng.com';
const SENDER_EMAIL    = 'info@brainfieldng.com';
const MAX_LEN         = 5000;

function send_json(int $status, array $payload): never {
    // Discard anything buffered so far (warnings, notices, whitespace) —
    // the client only ever sees this clean JSON body.
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload);
    exit;
}

function respond(int $status, bool $success, string $message): never {
    send_json($status, ['success' => $success, 'message' => $message]);
}

function clean_field(mixed $value, int $maxLen = 300): string {
    $value = is_string($value) ? $value : '';
    $value = trim($value);
    // Strip CR/LF (and their encoded forms) to block header-injection attacks
    // against mail(), which is the classic vulnerability in PHP contact forms.
    $value = str_replace(["\r", "\n", "%0a", "%0d", "%0A", "%0D"], ' ', $value);
    // Truncate without the mbstring extension (not guaranteed on every
    // host) — this can split a multi-byte character at the boundary,
    // which is an acceptable trade-off for a plain length cap.
    if (strlen($value) > $maxLen) {
        $value = substr($value, 0, $maxLen);
    }
    return $value;
}

try {

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, false, 'Method not allowed.');
    }

    $raw = file_get_contents('php://input');
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        // Fall back to normal form-encoded POST too, in case fetch isn't used.
        $data = $_POST;
    }

    // Honeypot: a hidden field real visitors never see or fill. Bots that
    // auto-fill every field will trip it; we quietly report success so they
    // don't learn anything, and skip sending mail.
    if (!empty($data['website'] ?? '')) {
        respond(200, true, "Thanks — we'll be in touch shortly.");
    }

    $name     = clean_field($data['name'] ?? '', 150);
    $email    = clean_field($data['email'] ?? '', 200);
    $division = clean_field($data['division'] ?? 'General enquiry', 150);
    $message  = clean_field($data['message'] ?? '', MAX_LEN);

    $errors = [];
    if ($name === '')                                    $errors[] = 'Please enter your name.';
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Please enter a valid email address.';
    if ($message === '')                                 $errors[] = 'Please enter a message.';

    if ($errors) {
        respond(422, false, implode(' ', $errors));
    }

    $subject = 'New enquiry from brainfieldng.com — ' . $division;

    $body = "You've received a new message from the Brainfield website contact form.\n\n"
          . "Name: {$name}\n"
          . "Email: {$email}\n"
          . "Interested in: {$division}\n\n"
          . "Message:\n{$message}\n"
          . "\n---\nSent from the contact form at brainfieldng.com\n";

    $headers = [
        'From: Brainfield Website <' . SENDER_EMAIL . '>',
        'Reply-To: ' . $name . ' <' . $email . '>',
        'X-Mailer: PHP/' . phpversion(),
        'Content-Type: text/plain; charset=utf-8',
    ];

    $sent = false;
    try {
        $sent = @mail(RECIPIENT_EMAIL, $subject, $body, implode("\r\n", $headers));
    } catch (Throwable $mailError) {
        error_log('Brainfield contact form: mail() threw — ' . $mailError->getMessage());
        $sent = false;
    }

    if ($sent) {
        respond(200, true, "Thanks {$name} — we've received your message and will be in touch shortly.");
    }

    error_log('Brainfield contact form: mail() returned false for ' . $email);
    respond(500, false, "Something went wrong sending your message. Please email us directly at " . RECIPIENT_EMAIL . ".");

} catch (Throwable $e) {
    // Absolute last resort: log the real error server-side for debugging,
    // but never leak internals to the client — just a clean, generic
    // JSON error so the frontend can display something sensible instead
    // of failing to parse the response.
    error_log('Brainfield contact form error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    send_json(500, [
        'success' => false,
        'message' => 'Something went wrong on our end. Please email us directly at ' . RECIPIENT_EMAIL . '.',
    ]);
}
