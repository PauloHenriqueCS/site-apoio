# Envio do formulário — `api/enviar-email.php`

O formulário de orçamento (`index.html`, `#quoteForm`) envia um `POST` em JSON para
`/api/enviar-email.php`. O PHP valida, monta o e-mail **"Novo pedido de orçamento pelo site"**
e envia por SMTP autenticado da HostGator com o PHPMailer. Só responde `200 {"success":true}`
depois do envio real. O JavaScript confirma para o visitante, limpa o formulário e dispara o
evento `form_submit_success`, que no Google Tag Manager aciona a conversão do Google Ads
(`AW-1001597529/wKKxCPe8w_wcENnUzN0D`). Nada disso acontece no clique nem em caso de erro.

**Nenhuma credencial está no repositório.** Tudo o que falta está listado abaixo.

## 1. O que está pendente (preencher no servidor)

| Chave | O que é | Exemplo (não é o valor real) |
| --- | --- | --- |
| `SMTP_HOST` | Servidor SMTP da conta de e-mail do domínio | `mail.apoiocortafogo.com` ou o host que o cPanel mostra em *Contas de e-mail → Conectar dispositivos* |
| `SMTP_PORT` | `465` (SSL, padrão HostGator) ou `587` (STARTTLS) | `465` |
| `SMTP_SECURE` | `ssl` para 465, `tls` para 587 | `ssl` |
| `SMTP_USER` | Conta de e-mail criada no cPanel do domínio. **Ela assina o `From`** | `contato@apoiocortafogo.com` |
| `SMTP_PASS` | Senha dessa conta | — |
| `CONTACT_EMAIL` | Quem recebe os pedidos (pode ser a mesma conta) | `orcamento@apoiocortafogo.com` |

Opcionais: `FROM_EMAIL` (vazio = `SMTP_USER`), `FROM_NAME` (padrão "Site Apoio Corta Fogo"),
`LIMITE_ENVIOS`/`LIMITE_MINUTOS` (padrão 5 envios por IP a cada 15 min), `SIMULAR_ENVIO`
(ver §5).

A HostGator costuma recusar `From` de domínio diferente da conta autenticada, por isso o
remetente é sempre a conta SMTP e o e-mail do visitante vai em `Reply-To` (responder no
cliente de e-mail já fala direto com ele).

## 2. Onde colocar as credenciais

Copie `api/config.exemplo.php` e preencha a cópia. O endpoint procura o arquivo nesta ordem
e usa o primeiro que existir:

1. Caminho da variável de ambiente `APOIO_EMAIL_CONFIG` (útil em outros hosts).
2. **`/home/USUARIO/apoio-config/email.php`** — pasta irmã de `public_html`, fora da área
   pública. **Recomendado.** No cPanel: *Gerenciador de arquivos → home → Nova pasta
   `apoio-config` → enviar `email.php`*.
3. `public_html/api/config.php` — só se o plano não deixar gravar fora de `public_html`.
   O `api/.htaccess` bloqueia o acesso pelo navegador a `config*.php`, mas a opção 2 é mais
   segura. Esse arquivo está no `.gitignore`.

Variáveis de ambiente com os mesmos nomes (`SMTP_HOST`, `SMTP_PASS`, …), se existirem,
têm prioridade sobre o arquivo. Se o site for publicado num subdiretório (ex.:
`public_html/novo/`), a opção 2 continua valendo: o caminho é calculado a partir da raiz
pública do domínio.

Enquanto qualquer chave estiver vazia ou começando com `PREENCHER`, o endpoint responde
`500 {"success":false,"message":"Não foi possível enviar a mensagem."}` e grava no log do
PHP quais chaves faltam. O visitante vê a mensagem amigável com o WhatsApp como alternativa.

## 3. Estrutura publicada na HostGator

```
/home/USUARIO/
├── apoio-config/
│   └── email.php                 ← credenciais (copiado de api/config.exemplo.php)
└── public_html/
    ├── index.html, blog/, css/, js/, assets/ …   (site estático)
    └── api/
        ├── .htaccess             ← bloqueia lib/, config*.php, testar-envio.php, *.md
        ├── enviar-email.php      ← único arquivo acessível pelo navegador
        ├── config.exemplo.php    ← modelo (pode subir; só tem placeholders)
        ├── testar-envio.php      ← teste por SSH/terminal, nunca pelo navegador
        └── lib/
            ├── configuracao.php
            └── PHPMailer/        ← PHPMailer v7.1.1 vendido (3 arquivos + LICENSE)
```

O PHPMailer já está em `api/lib/PHPMailer/` (`PHPMailer.php`, `SMTP.php`, `Exception.php`),
**sem Composer**: é só subir a pasta `api/` junto com o site. Versão em `VERSAO.txt`.

Requisitos no servidor: PHP 7.4+ (a HostGator oferece 8.x no *Seletor de PHP*), extensões
`mbstring`, `json`, `openssl` e `filter` (todas padrão). Nada de `mail()`/sendmail.

## 4. Deploy

1. Subir a raiz do site (ver "Deploy" no `README.md`) **incluindo `api/`** e o `api/.htaccess`.
2. Criar `apoio-config/email.php` fora de `public_html` com as chaves preenchidas.
3. Conferir no cPanel que o PHP está em 8.x.
4. Testar (§5). Depois, confirmar que `SIMULAR_ENVIO` está `false`.

O frontend não muda entre ambientes: `data-endpoint="/api/enviar-email.php"` no `<form>`
é relativo ao domínio.

## 5. Como testar

**Com as credenciais, por SSH ou terminal do cPanel** (não roda pelo navegador):

```sh
php public_html/api/testar-envio.php            # mostra a configuração encontrada, sem enviar
php public_html/api/testar-envio.php --enviar   # envia um e-mail de teste para CONTACT_EMAIL
php public_html/api/testar-envio.php --enviar --debug   # com o diálogo SMTP (senha não aparece)
```

**Pelo site**: preencha o formulário e envie. Sucesso = mensagem "Solicitação recebida" e
o e-mail na caixa `CONTACT_EMAIL`. Em `localhost` ou com `localStorage.apoio_debug = "1"`
o console mostra `[Analytics] form_submit_success`.

**Modo de simulação** — `'SIMULAR_ENVIO' => true` no arquivo de configuração. O endpoint
valida tudo, monta o e-mail e responde `{"success":true,"simulado":true}` **sem enviar**,
gravando um aviso no log a cada chamada. É explícito (só liga por configuração), visível na
resposta e nunca deve ficar ativo em produção: o JavaScript trata como sucesso e a conversão
dispara.

**Sem credenciais, localmente** (foi assim que este código foi validado):

```sh
# 1. uma configuração de teste fora do repositório
cp api/config.exemplo.php /tmp/email-teste.php   # editar: SIMULAR_ENVIO => true e valores fictícios
# 2. servidor PHP embutido servindo o site inteiro
APOIO_EMAIL_CONFIG=/tmp/email-teste.php php -S 127.0.0.1:8080 -t .
# 3. chamadas diretas
curl -i http://127.0.0.1:8080/api/enviar-email.php                                   # 405
curl -i -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:8080/api/enviar-email.php   # 400
curl -i -X POST -H 'Content-Type: application/json' \
  -d '{"nome":"Ana","email":"ana@exemplo.com","assunto":"Orçamento","tempo_preenchimento":5000}' \
  http://127.0.0.1:8080/api/enviar-email.php                                          # 200 simulado
```

Casos verificados: GET → 405; corpo que não é JSON → 400; campos faltando → 400 com
`errors` por campo; e-mail inválido ou com quebra de linha → 400; honeypot preenchido → 400;
`tempo_preenchimento` ausente ou < 3 s → 400; `Origin` de outro domínio → 403; corpo > 16 KB
→ 413; 4º envio do mesmo IP com limite 3 → 429; placeholders → 500; SMTP fora do ar → 500;
envio real contra um servidor SMTP de teste → 200 com `From` da conta, `Reply-To` do
visitante e assunto correto. No navegador: três cliques rápidos → 1 POST e 1
`form_submit_success`; 500 → sem conversão, dados mantidos; `200 {"success":false}` → não
confirma; erro de campo do servidor marca o campo.

## 6. Proteções

- **Honeypot** `empresa_hp` (campo escondido; preenchido = 400).
- **Tempo de preenchimento** medido pelo JS (`tempo_preenchimento`, mínimo 3 s). Robôs que
  postam direto não mandam o campo.
- **Origem**: se o navegador enviar `Origin`, precisa ser o próprio domínio (com ou sem www).
- **Só JSON e só POST**; corpo limitado a 16 KB; `nome` ≤ 100, `email` ≤ 150, `assunto` ≤ 150,
  `mensagem` ≤ 3000 caracteres, parâmetros de campanha ≤ 200.
- **Injeção de cabeçalho**: campos de uma linha perdem quebras e caracteres de controle;
  e-mail passa por `filter_var`; o PHPMailer codifica os cabeçalhos.
- **Saída HTML escapada** (`htmlspecialchars`) em todos os campos do e-mail.
- **Limite por IP** com arquivo temporário (falha aberta: se não conseguir gravar, deixa passar).
- **Nada sensível chega ao navegador**: só `{success, message[, errors]}`; detalhes ficam no
  `error_log` sem dados do visitante; `SMTPDebug = 0`; cabeçalho `X-Mailer` suprimido.
- **Servidor decide** `From`, destinatário e cabeçalhos. O visitante só influencia `Reply-To`.
- `.htaccess` nega acesso a `lib/`, `config*.php`, `testar-envio.php`, `*.md`, `*.txt`.
