<?php
/**
 * Leitura da configuração SMTP (fora do Git). Usado por enviar-email.php e testar-envio.php.
 * Ver config.exemplo.php e LEIA-ME.md.
 */

declare(strict_types=1);

function carregarConfig(): array
{
    $candidatos = [];
    $env = getenv('APOIO_EMAIL_CONFIG');
    if (is_string($env) && $env !== '') {
        $candidatos[] = $env;
    }
    if (!empty($_SERVER['DOCUMENT_ROOT'])) {
        // HostGator: /home/usuario/public_html  →  /home/usuario/apoio-config/email.php
        $candidatos[] = dirname((string) $_SERVER['DOCUMENT_ROOT']) . '/apoio-config/email.php';
    }
    $candidatos[] = dirname(__DIR__, 2) . '/apoio-config/email.php';   // mesmo caminho, relativo a este arquivo
    $candidatos[] = __DIR__ . '/config.php';                            // último recurso, protegido pelo .htaccess

    $config = [];
    foreach ($candidatos as $arquivo) {
        if (is_file($arquivo) && is_readable($arquivo)) {
            $lido = include $arquivo;
            if (is_array($lido)) {
                $config = $lido;
                break;
            }
        }
    }

    // Variáveis de ambiente têm prioridade sobre o arquivo (ex.: SetEnv no .htaccess ou painel do host)
    foreach (['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'CONTACT_EMAIL', 'FROM_EMAIL', 'FROM_NAME', 'SIMULAR_ENVIO'] as $chave) {
        $valor = getenv($chave);
        if (is_string($valor) && $valor !== '') {
            $config[$chave] = $valor;
        }
    }

    $padrao = [
        'SMTP_HOST' => '', 'SMTP_PORT' => 465, 'SMTP_USER' => '', 'SMTP_PASS' => '', 'SMTP_SECURE' => 'ssl',
        'CONTACT_EMAIL' => '', 'FROM_EMAIL' => '', 'FROM_NAME' => 'Site Apoio Corta Fogo',
        'SIMULAR_ENVIO' => false, 'LIMITE_ENVIOS' => 5, 'LIMITE_MINUTOS' => 15,
    ];
    $config = array_merge($padrao, $config);
    $config['SMTP_PORT']      = (int) $config['SMTP_PORT'];
    $config['SMTP_SECURE']    = strtolower(trim((string) $config['SMTP_SECURE']));
    $config['SIMULAR_ENVIO']  = filter_var($config['SIMULAR_ENVIO'], FILTER_VALIDATE_BOOLEAN);
    $config['LIMITE_ENVIOS']  = max(0, (int) $config['LIMITE_ENVIOS']);
    $config['LIMITE_MINUTOS'] = max(1, (int) $config['LIMITE_MINUTOS']);
    if ($config['FROM_EMAIL'] === '') {
        $config['FROM_EMAIL'] = $config['SMTP_USER'];
    }
    return $config;
}

function configPendente(array $config): array
{
    $pendentes = [];
    foreach (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_EMAIL'] as $chave) {
        $valor = (string) $config[$chave];
        if ($valor === '' || strncmp($valor, 'PREENCHER', 9) === 0) {
            $pendentes[] = $chave;
        }
    }
    if ($config['SMTP_PORT'] < 1 || $config['SMTP_PORT'] > 65535) {
        $pendentes[] = 'SMTP_PORT';
    }
    if (!in_array($config['SMTP_SECURE'], ['ssl', 'tls', ''], true)) {
        $pendentes[] = 'SMTP_SECURE';
    }
    if (!filter_var($config['CONTACT_EMAIL'], FILTER_VALIDATE_EMAIL)) {
        $pendentes[] = 'CONTACT_EMAIL';
    }
    if (!in_array('SMTP_USER', $pendentes, true) && !filter_var($config['FROM_EMAIL'], FILTER_VALIDATE_EMAIL)) {
        $pendentes[] = 'FROM_EMAIL';   // só quando foi preenchido à mão com valor inválido
    }
    return array_values(array_unique($pendentes));
}
