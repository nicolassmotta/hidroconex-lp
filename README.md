# Hidroconex — Site Oficial

Site institucional e catálogo de produtos da **Hidroconex Luvas**, com painel
administrativo para cadastrar, editar e remover produtos (com fotos) sem precisar
mexer no código.

🔗 **Online:** [hidroconexluvas.com.br](https://hidroconexluvas.com.br/)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-backend-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-GridFS-47A248?logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

## Funcionalidades

- **Landing page institucional** — apresentação da empresa e formulário de contato.
- **Catálogo público** — produtos organizados por categoria e subcategoria, com imagens.
- **Painel administrativo** (`/admin`) — login protegido por senha para gerenciar
  produtos e fotos, com upload de imagens armazenadas no próprio banco.
- **Formulário de contato** — envio pelo backend via Web3Forms com hCaptcha e rate limiting.
- **SEO com HTML estático**: o build pré-renderiza home, catálogo, categorias e produtos
  com título, descrição, canonical, Open Graph e JSON-LD próprios, e gera o `sitemap.xml`.
- **Segurança** — autenticação por token assinado (HMAC), comparação de senha em
  tempo constante e rate limiting nas tentativas de login.

## Tecnologias

| Camada      | Tecnologias                                                        |
| ----------- | ------------------------------------------------------------------ |
| Frontend    | React 18, TypeScript, Vite                                         |
| Interface   | Tailwind CSS, shadcn/ui (Radix UI), lucide-react                   |
| Backend     | Node.js puro (módulo `http` nativo, sem Express)                   |
| Banco       | MongoDB — dados do catálogo + imagens via GridFS                   |
| Integrações | Web3Forms + hCaptcha (formulário de contato)                       |
| Testes      | Vitest + Testing Library + Playwright                              |
| Deploy      | Vercel (frontend estático + API como Serverless Function)          |

## Estrutura do projeto

```
.
├── api/            # Entrada da API na Vercel (reaproveita o backend Node)
├── server/         # Servidor Node + lógica da API (catálogo, admin, imagens)
├── scripts/        # Scripts de build/dev (ex.: geração do catálogo)
├── src/
│   ├── assets/     # Imagens e mídias
│   ├── components/ # Componentes da UI (admin/, ui/ shadcn, contato, etc.)
│   ├── data/       # Categorias e catálogo gerado
│   ├── hooks/      # Hooks reutilizáveis
│   └── pages/      # Páginas (landing, catálogo, admin)
├── public/         # Arquivos estáticos
└── vercel.json     # Rewrites de produção (SPA + API)
```

## Como rodar

**Pré-requisitos:** Node.js 20.19+ e uma instância do MongoDB (local ou Atlas).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um arquivo `.env` na raiz (veja a seção abaixo).

3. Garanta que o MongoDB esteja rodando e suba frontend + backend juntos:

   ```bash
   npm run dev
   ```

   O site abre em `http://localhost:8080` e a API em `http://localhost:3333`.

Quando o banco está vazio, o backend importa automaticamente os produtos iniciais
do catálogo legado.

## Variáveis de ambiente

```env
# Banco de dados
MONGODB_URI="mongodb://127.0.0.1:27017"
MONGODB_DB_NAME="hidroconex"

# Admin (obrigatório para acessar o painel)
ADMIN_PASSWORD="uma_senha_forte"

# Servidor / uploads
PORT=3333
IMAGE_LIMIT_MB=8

# Contato
WEB3FORMS_ACCESS_KEY="sua_chave_web3forms"
```

| Variável                  | Obrigatória | Padrão                | Descrição                                   |
| ------------------------- | ----------- | --------------------- | ------------------------------------------- |
| `MONGODB_URI`             | Sim         | `mongodb://127.0.0.1:27017` | String de conexão do MongoDB          |
| `MONGODB_DB_NAME`         | Não         | `hidroconex`          | Nome do banco                               |
| `ADMIN_PASSWORD`          | Sim         | —                     | Senha do painel administrativo              |
| `PORT`                    | Não         | `3333`                | Porta do backend Node                       |
| `IMAGE_LIMIT_MB`          | Não         | `8` (`3` na Vercel)   | Tamanho máximo de imagem no upload          |
| `WEB3FORMS_ACCESS_KEY`     | Sim       | —                     | Chave do Web3Forms usada pela API de contato |
| `FAILURE_EVENT_TTL_DAYS`  | Não         | `14`                  | Retenção dos eventos de falha no admin      |
| `VERCEL_DEPLOY_HOOK_URL`  | Não         | -                     | Deploy Hook chamado após mudanças no catálogo |

Variáveis opcionais de ajuste fino do login e do contato também são suportadas:
`ADMIN_TOKEN_TTL_HOURS`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MIN`,
`LOGIN_BLOCK_MIN`, `CONTACT_MAX_ATTEMPTS`, `CONTACT_WINDOW_MIN`,
`CONTACT_BLOCK_MIN` e `CORS_ORIGIN`. O painel admin usa sessão em cookie
`HttpOnly`; o frontend não armazena token em `localStorage`. O formulário
envia para `/api/contact`, então a chave do Web3Forms não é exposta no bundle.

O backend cria automaticamente as coleções `products`, `settings`,
`loginAttempts`, `adminSessions`, `contactAttempts`, `failureEvents` e os
buckets `productImages.*` (GridFS) — não é preciso configurá-las manualmente.

## Rotas

| Rota                       | Descrição                                  |
| -------------------------- | ------------------------------------------ |
| `/`                        | Landing page institucional                 |
| `/catalogo`                | Catálogo público completo                  |
| `/catalogo/:categoria`     | Página de cada linha de produto            |
| `/produto/:slug`           | Página de cada produto                     |
| `/admin`                   | Painel para gerenciar produtos e fotos     |
| `/sitemap.xml`             | Sitemap gerado no build a partir do catálogo |
| `/api/catalog`             | API pública do catálogo                    |
| `/api/catalog/images/:id`  | Imagens servidas do MongoDB/GridFS         |
| `/api/contact`             | Envio do formulário de contato             |
| `/api/monitoring/failures` | Registro de falhas do frontend             |
| `/api/admin/failures`      | Resumo de falhas para o painel admin       |
| `/api/health`              | Status leve da API                         |
| `/api/ready`               | Status da API com checagem do MongoDB      |

## Scripts

```bash
npm run dev       # API + Vite juntos
npm run dev:web   # somente frontend
npm run dev:api   # somente backend Node
npm run build     # build de produção + pré-renderização das páginas públicas
npm run start     # serve API + frontend buildado
npm run lint      # lint
npm run test      # testes (Vitest)
npm run test:e2e  # smoke test com Playwright
npm run optimize:images # gera WebP otimizado a partir dos PNG originais
```

## Deploy (Vercel)

O frontend é publicado como build Vite e a API roda em `api/index.js`,
reaproveitando o backend Node do projeto. Configure as variáveis pelo painel da
Vercel:

- `MONGODB_URI` (use MongoDB Atlas ou outro servidor de produção)
- `MONGODB_DB_NAME`
- `ADMIN_PASSWORD` (senha forte)
- `WEB3FORMS_ACCESS_KEY`
- `IMAGE_LIMIT_MB` (recomendado: `3`)

Configure o runtime da Vercel para Node.js 20.x ou superior.

As fotos novas não dependem de disco local — ficam no GridFS do MongoDB.

### Pré-renderização e SEO

O `npm run build` roda três etapas: o build do cliente, um build SSR de
`src/entry-server.tsx` e o `scripts/prerender.js`, que grava em `dist/`:

- um `index.html` por rota pública (home, catálogo, categorias e produtos), com o
  conteúdo já renderizado e as meta tags da página;
- `404.html`, servido pela Vercel com status 404 em qualquer rota inexistente;
- `app-shell.html`, usado só em `/admin` e em produtos cadastrados depois do último
  deploy (o navegador renderiza a página e busca o catálogo na API);
- `sitemap.xml`, com `lastmod` e imagens de cada produto.

O catálogo usado no build vem da API publicada (`https://hidroconexluvas.com.br/api/catalog`).
Se ela não responder, o build usa o catálogo estático do repositório. Para apontar para
outra API, defina `PRERENDER_CATALOG_URL`; com `PRERENDER_CATALOG_URL=""` o build nem
tenta a rede.

Produtos criados ou editados no `/admin` aparecem na hora para quem navega. O HTML
estático e o sitemap são regerados no deploy seguinte: com `VERCEL_DEPLOY_HOOK_URL`
configurada (Vercel > Settings > Git > Deploy Hooks, branch `main`), o próprio admin
dispara esse deploy a cada alteração. Ao renomear um produto, a URL antiga continua
levando à nova.
