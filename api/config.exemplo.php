<?php
/**
 * Configuração de e-mail do formulário — MODELO com placeholders.
 *
 * NÃO preencha este arquivo no repositório. Copie-o para FORA da pasta pública
 * no servidor e preencha lá. O endpoint procura a configuração nesta ordem:
 *
 *   1. Caminho indicado pela variável de ambiente APOIO_EMAIL_CONFIG
 *   2. /home/USUARIO/apoio-config/email.php   (pasta irmã de public_html — recomendado)
 *   3. api/config.php                          (dentro da pasta pública, protegido pelo .htaccess;
 *                                               use só se o plano não permitir gravar fora do public_html)
 *
 * Qualquer valor que continue como "PREENCHER..." faz o endpoint responder 500
 * ("Não foi possível enviar a mensagem.") e registrar o motivo no log do PHP.
 * Ver api/LEIA-ME.md.
 */
return [
    // Servidor SMTP da HostGator. Exemplos comuns: mail.SEUDOMINIO.com.br ou
    // o hostname informado em cPanel > Contas de e-mail > Conectar dispositivos.
    'SMTP_HOST'     => 'PREENCHER_SMTP_HOST',

    // 465 com SMTP_SECURE = 'ssl' (padrão HostGator) ou 587 com SMTP_SECURE = 'tls'.
    'SMTP_PORT'     => 465,
    'SMTP_SECURE'   => 'ssl',            // 'ssl' | 'tls' | '' (sem criptografia — só para testes locais)

    // Conta de e-mail criada no cPanel do domínio. É ela que autentica e assina o "From".
    'SMTP_USER'     => 'PREENCHER_SMTP_USER',   // ex.: contato@apoiocortafogo.com
    'SMTP_PASS'     => 'PREENCHER_SMTP_PASS',

    // Quem RECEBE os pedidos de orçamento. Pode ser a mesma conta ou outra.
    'CONTACT_EMAIL' => 'PREENCHER_CONTACT_EMAIL',

    // Remetente exibido. Vazio = usa SMTP_USER (recomendado: a HostGator exige que o
    // From seja uma conta do domínio autenticado).
    'FROM_EMAIL'    => '',
    'FROM_NAME'     => 'Site Apoio Corta Fogo',

    // Modo de simulação: valida tudo, monta o e-mail e responde sucesso SEM enviar.
    // A resposta vem com "simulado": true e o log registra o aviso. Só para testes.
    'SIMULAR_ENVIO' => false,

    // Limite por IP: quantos envios em quantos minutos (proteção simples contra rajadas).
    'LIMITE_ENVIOS'  => 5,
    'LIMITE_MINUTOS' => 15,
];
