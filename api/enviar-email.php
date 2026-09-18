<?php
/**
 * Endpoint do formulário de orçamento — POST /api/enviar-email.php
 *
 * Recebe JSON, valida, monta o e-mail e envia por SMTP autenticado (PHPMailer).
 * Responde SEMPRE em JSON:
 *   200 {"success":true}                       — só depois do envio real (ou simulação explícita)
 *   400 {"success":false,"message":"..."}      — payload inválido, campo faltando, honeypot, e-mail inválido
 *   405 {"success":false,"message":"..."}      — método diferente de POST
 *   413 / 429                                  — corpo grande demais / muitas tentativas do mesmo IP
 *   500 {"success":false,"message":"..."}      — configuração pendente ou falha no SMTP
 *
 * Credenciais: NUNCA aqui. Ver config.exemplo.php e LEIA-ME.md.
 * O browser recebe apenas {success, message}; detalhes de erro vão para o error_log do PHP.
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

/* ---------- respostas ---------- */

const MSG_ERRO_ENVIO   = 'Não foi possível enviar a mensagem.';
const MSG_DADOS        = 'Revise os campos e tente de novo.';
const LIMITE_CORPO     = 16384;   // 16 KB de JSON é muito mais do que o formulário produz
const TEMPO_MINIMO_MS  = 3000;    // preenchimento humano leva mais que 3 s

function responder(int $status, array $dados): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    if ($status === 405) {
        header('Allow: POST');
    }
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function falhar(int $status, string $mensagem, string $motivoLog = ''): void
{
    if ($motivoLog !== '') {
        error_log('[apoio-form] ' . $motivoLog);   // sem dados do visitante
    }
    responder($status, ['success' => false, 'message' => $mensagem]);
}

require_once __DIR__ . '/lib/configuracao.php';

/* ---------- saneamento ---------- */

/** Uma linha só: remove quebras e caracteres de controle (bloqueia injeção de cabeçalho). */
function linha(string $valor, int $max): string
{
    $valor = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $valor) ?? '';
    $valor = trim(preg_replace('/\s+/u', ' ', $valor) ?? '');
    return mb_substr($valor, 0, $max, 'UTF-8');
}

/** Texto livre: mantém quebras de linha, remove os demais caracteres de controle. */
function texto(string $valor, int $max): string
{
    $valor = str_replace(["\r\n", "\r"], "\n", $valor);
    $valor = preg_replace('/[^\P{C}\n\t]+/u', '', $valor) ?? '';
    return mb_substr(trim($valor), 0, $max, 'UTF-8');
}

function campo(array $dados, string $nome): string
{
    $valor = $dados[$nome] ?? '';
    if (is_int($valor) || is_float($valor)) {
        $valor = (string) $valor;
    }
    if (!is_string($valor)) {
        return '';
    }
    if (!mb_check_encoding($valor, 'UTF-8')) {
        return '';
    }
    return $valor;
}

function esc(string $valor): string
{
    return htmlspecialchars($valor, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

/* ---------- limite por IP (arquivo temporário, falha aberta) ---------- */

function limitarPorIp(int $maximo, int $minutos): bool
{
    if ($maximo <= 0) {
        return true;
    }
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if ($ip === '') {
        return true;
    }
    $arquivo = rtrim(sys_get_temp_dir(), '/\\') . '/apoio-form-' . hash('sha256', 'apoio|' . $ip) . '.json';
    $agora = time();
    $janela = $minutos * 60;
    $h = @fopen($arquivo, 'c+');
    if (!$h) {
        return true;
    }
    if (!flock($h, LOCK_EX)) {
        fclose($h);
        return true;
    }
    $conteudo = stream_get_contents($h) ?: '[]';
    $marcas = json_decode($conteudo, true);
    $marcas = is_array($marcas) ? array_values(array_filter($marcas, static fn ($t) => is_int($t) && $t > $agora - $janela)) : [];
    $permitido = count($marcas) < $maximo;
    if ($permitido) {
        $marcas[] = $agora;
        ftruncate($h, 0);
        rewind($h);
        fwrite($h, json_encode($marcas));
    }
    flock($h, LOCK_UN);
    fclose($h);
    return $permitido;
}

/* ---------- 1. método e cabeçalhos ---------- */

if (PHP_SAPI === 'cli') {
    fwrite(STDERR, "Este arquivo é um endpoint HTTP. Para testar o SMTP pela linha de comando use testar-envio.php.\n");
    exit(1);
}

$metodo = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? ''));
if ($metodo !== 'POST') {
    falhar(405, 'Método não permitido.');
}

// Só aceita a origem do próprio site quando o navegador informa Origin (fetch sempre informa)
$origem = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$hostAtual = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
if ($origem !== '' && $hostAtual !== '') {
    $hostOrigem = strtolower((string) (parse_url($origem, PHP_URL_HOST) ?? ''));
    $portaOrigem = parse_url($origem, PHP_URL_PORT);
    if ($portaOrigem) {
        $hostOrigem .= ':' . $portaOrigem;
    }
    if ($hostOrigem !== $hostAtual && preg_replace('/^www\./', '', $hostOrigem) !== preg_replace('/^www\./', '', $hostAtual)) {
        falhar(403, MSG_ERRO_ENVIO, 'origem rejeitada');
    }
}

$tipo = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
if (strpos($tipo, 'application/json') !== 0) {
    falhar(400, 'Envie os dados em JSON.');
}

$tamanho = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($tamanho > LIMITE_CORPO) {
    falhar(413, 'Mensagem grande demais.');
}

$corpo = file_get_contents('php://input', false, null, 0, LIMITE_CORPO + 1);
if ($corpo === false || $corpo === '' || strlen($corpo) > LIMITE_CORPO) {
    falhar($corpo && strlen($corpo) > LIMITE_CORPO ? 413 : 400, $corpo ? 'Mensagem grande demais.' : 'Envie os dados em JSON.');
}

$dados = json_decode($corpo, true, 8);
if (!is_array($dados)) {
    falhar(400, 'Envie os dados em JSON.');
}

/* ---------- 2. anti-spam sem CAPTCHA ---------- */

// honeypot: campo escondido que só robôs preenchem
if (campo($dados, 'empresa_hp') !== '') {
    falhar(400, MSG_DADOS, 'honeypot preenchido');
}

// tempo de preenchimento medido pelo JS (robôs que postam direto não mandam ou mandam 0)
$tempo = $dados['tempo_preenchimento'] ?? null;
if (!is_int($tempo) && !(is_string($tempo) && ctype_digit($tempo))) {
    falhar(400, MSG_DADOS, 'tempo de preenchimento ausente');
}
if ((int) $tempo < TEMPO_MINIMO_MS) {
    falhar(400, 'Aguarde um instante e tente enviar de novo.', 'envio rápido demais');
}

/* ---------- 3. campos do formulário (só os que existem no HTML) ---------- */

$nome     = linha(campo($dados, 'nome'), 100);
$email    = linha(campo($dados, 'email'), 150);
$assunto  = linha(campo($dados, 'assunto'), 150);
$mensagem = texto(campo($dados, 'mensagem'), 3000);

$erros = [];
if (mb_strlen($nome, 'UTF-8') < 2) {
    $erros['nome'] = 'Informe seu nome.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $erros['email'] = 'Informe um e-mail válido.';
}
if (mb_strlen($assunto, 'UTF-8') < 3) {
    $erros['assunto'] = 'Informe o assunto.';
}

// parâmetros de campanha: opcionais, uma linha, tamanho limitado
$campanha = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'] as $chave) {
    $valor = linha(campo($dados, $chave), 200);
    if ($valor !== '') {
        $campanha[$chave] = $valor;
    }
}
$primeiraVisita = linha(campo($dados, 'attribution_first'), 1000);

if ($erros) {
    responder(400, ['success' => false, 'message' => MSG_DADOS, 'errors' => $erros]);
}

/* ---------- 4. configuração ---------- */

$config = carregarConfig();
$pendentes = configPendente($config);
if ($pendentes) {
    falhar(500, MSG_ERRO_ENVIO, 'configuração SMTP pendente: ' . implode(', ', $pendentes) . ' (ver api/LEIA-ME.md)');
}

if (!limitarPorIp($config['LIMITE_ENVIOS'], $config['LIMITE_MINUTOS'])) {
    falhar(429, 'Muitas tentativas em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.', 'limite por IP atingido');
}

/* ---------- 5. e-mail ---------- */

$quando = date('d/m/Y H:i');
$linhas = [
    ['Nome', $nome],
    ['E-mail', $email],
    ['Assunto', $assunto],
    ['Mensagem', $mensagem !== '' ? $mensagem : '(não informada)'],
];

$html  = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Novo pedido de orçamento pelo site</title></head>';
$html .= '<body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1e2a3a">';
$html .= '<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">';
$html .= '<tr><td style="background:#1e2a3a;padding:20px 28px;color:#fff;font-size:18px;font-weight:bold;border-top:4px solid #f5a21e">Novo pedido de orçamento pelo site</td></tr>';
$html .= '<tr><td style="padding:24px 28px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px;line-height:1.5">';
foreach ($linhas as [$rotulo, $valor]) {
    $conteudo = $rotulo === 'Mensagem' ? nl2br(esc($valor)) : esc($valor);
    if ($rotulo === 'E-mail') {
        $conteudo = '<a href="mailto:' . esc($valor) . '" style="color:#1e2a3a">' . esc($valor) . '</a>';
    }
    $html .= '<tr><td style="padding:8px 0;border-bottom:1px solid #e6e8eb;width:120px;color:#6b7280;vertical-align:top">' . esc($rotulo) . '</td>';
    $html .= '<td style="padding:8px 0;border-bottom:1px solid #e6e8eb;vertical-align:top">' . $conteudo . '</td></tr>';
}
$html .= '</table>';
if ($campanha || $primeiraVisita !== '') {
    $html .= '<p style="margin:20px 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Origem da visita</p>';
    $html .= '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#4b5563">';
    foreach ($campanha as $chave => $valor) {
        $html .= '<tr><td style="padding:3px 0;width:120px">' . esc($chave) . '</td><td style="padding:3px 0">' . esc($valor) . '</td></tr>';
    }
    if ($primeiraVisita !== '') {
        $html .= '<tr><td style="padding:3px 0;width:120px">primeira visita</td><td style="padding:3px 0">' . esc($primeiraVisita) . '</td></tr>';
    }
    $html .= '</table>';
}
$html .= '<p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Enviado em ' . esc($quando) . ' pelo formulário de apoiocortafogo.com. Responda este e-mail para falar direto com o cliente.</p>';
$html .= '</td></tr></table></body></html>';

$textoPlano = "Novo pedido de orçamento pelo site\n\n";
foreach ($linhas as [$rotulo, $valor]) {
    $textoPlano .= $rotulo . ': ' . $valor . "\n";
}
foreach ($campanha as $chave => $valor) {
    $textoPlano .= $chave . ': ' . $valor . "\n";
}
if ($primeiraVisita !== '') {
    $textoPlano .= 'primeira visita: ' . $primeiraVisita . "\n";
}
$textoPlano .= "\nEnviado em " . $quando . ' pelo formulário de apoiocortafogo.com';

if ($config['SIMULAR_ENVIO']) {
    error_log('[apoio-form] SIMULAR_ENVIO ativo: e-mail montado e NÃO enviado. Desligue em produção.');
    responder(200, ['success' => true, 'simulado' => true]);
}

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

try {
    $mail = new PHPMailer(true);
    $mail->CharSet  = PHPMailer::CHARSET_UTF8;
    $mail->Encoding = PHPMailer::ENCODING_BASE64;
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
    $mail->SMTPDebug  = 0;                        // nunca ecoar o diálogo SMTP na resposta
    $mail->XMailer    = ' ';                      // não anunciar a biblioteca/versão no cabeçalho

    // From = conta autenticada do domínio (o servidor decide, nunca o visitante)
    $mail->setFrom($config['FROM_EMAIL'], linha((string) $config['FROM_NAME'], 80));
    $mail->addAddress($config['CONTACT_EMAIL']);
    $mail->addReplyTo($email, $nome);            // responder vai direto para o visitante

    $mail->Subject = 'Novo pedido de orçamento pelo site';
    $mail->isHTML(true);
    $mail->Body    = $html;
    $mail->AltBody = $textoPlano;

    $mail->send();
} catch (MailException $e) {
    falhar(500, MSG_ERRO_ENVIO, 'falha no envio SMTP: ' . $e->getMessage());
} catch (Throwable $e) {
    falhar(500, MSG_ERRO_ENVIO, 'erro inesperado: ' . get_class($e) . ': ' . $e->getMessage());
}

responder(200, ['success' => true]);
