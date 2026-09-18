<?php
/**
 * Teste do SMTP pela linha de comando (SSH ou terminal do cPanel). NÃO roda pelo navegador.
 *
 *   php api/testar-envio.php                      → só confere a configuração (não envia)
 *   php api/testar-envio.php --enviar             → envia um e-mail de teste para CONTACT_EMAIL
 *   php api/testar-envio.php --enviar --debug     → idem, mostrando o diálogo SMTP (senha não aparece)
 *
 * Usa exatamente a mesma configuração do endpoint (APOIO_EMAIL_CONFIG, ../apoio-config/email.php
 * ou api/config.php). Nenhuma credencial é impressa.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require_once __DIR__ . '/lib/configuracao.php';

$config = carregarConfig();
$pendentes = configPendente($config);

$mascara = static fn (string $v): string => $v === '' ? '(vazio)' : (strncmp($v, 'PREENCHER', 9) === 0 ? $v : preg_replace('/(?<=.{2}).(?=.{2})/u', '*', $v));

echo "Configuração encontrada:\n";
echo '  SMTP_HOST      ' . $config['SMTP_HOST'] . "\n";
echo '  SMTP_PORT      ' . $config['SMTP_PORT'] . ' (' . ($config['SMTP_SECURE'] ?: 'sem criptografia') . ")\n";
echo '  SMTP_USER      ' . $mascara((string) $config['SMTP_USER']) . "\n";
echo '  SMTP_PASS      ' . ((string) $config['SMTP_PASS'] === '' ? '(vazio)' : (strncmp((string) $config['SMTP_PASS'], 'PREENCHER', 9) === 0 ? $config['SMTP_PASS'] : '********')) . "\n";
echo '  CONTACT_EMAIL  ' . $config['CONTACT_EMAIL'] . "\n";
echo '  FROM_EMAIL     ' . $config['FROM_EMAIL'] . "\n";
echo '  SIMULAR_ENVIO  ' . ($config['SIMULAR_ENVIO'] ? 'SIM (desligue em produção)' : 'não') . "\n\n";

if ($pendentes) {
    echo 'PENDENTE: preencha ' . implode(', ', $pendentes) . " (ver api/LEIA-ME.md).\n";
    exit(2);
}
echo "Configuração completa.\n";

if (!in_array('--enviar', $argv, true)) {
    echo "Para enviar um e-mail de teste: php api/testar-envio.php --enviar\n";
    exit(0);
}

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

try {
    $mail = new PHPMailer(true);
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->isSMTP();
    $mail->Host       = $config['SMTP_HOST'];
    $mail->Port       = $config['SMTP_PORT'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['SMTP_USER'];
    $mail->Password   = $config['SMTP_PASS'];
    $mail->SMTPSecure = $config['SMTP_SECURE'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS
                      : ($config['SMTP_SECURE'] === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : '');
    $mail->SMTPAutoTLS = $config['SMTP_SECURE'] !== '';
    $mail->Timeout    = 20;
    $mail->SMTPDebug  = in_array('--debug', $argv, true) ? 2 : 0;
    $mail->setFrom($config['FROM_EMAIL'], (string) $config['FROM_NAME']);
    $mail->addAddress($config['CONTACT_EMAIL']);
    $mail->Subject = 'Teste do formulário do site';
    $mail->Body    = 'Se você recebeu este e-mail, o SMTP do formulário está configurado corretamente. Enviado em ' . date('d/m/Y H:i:s') . '.';
    $mail->send();
    echo "E-mail de teste enviado para " . $config['CONTACT_EMAIL'] . ".\n";
} catch (MailException $e) {
    echo "FALHA no envio: " . $e->getMessage() . "\n";
    exit(1);
}
