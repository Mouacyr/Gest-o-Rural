# RAIZ — Gestão e Continuidade Rural

Aplicação web inicial inspirada no conceito visual enviado: verde-floresta, tons de creme e dourado, linguagem acolhedora e foco em gestão rural familiar.

## O que já funciona no modo de demonstração

- Site institucional responsivo com benefícios, módulos, FAQ e formulário de contato.
- Painel de gestão com navegação entre módulos.
- Cadastros locais de culturas, receitas/despesas, propriedades e bens, documentos, familiares, tarefas e etapas sucessórias.
- Exclusão com confirmação, indicadores calculados, pesquisa de registros e exportação CSV.
- Cópia de segurança em JSON e impressão/Salvar como PDF pelo navegador.
- Dados de demonstração persistidos no `localStorage` do navegador.

## Importante sobre o modo de demonstração

O modo local **não é um sistema multiusuário seguro**. Os dados ficam no navegador atual e não são sincronizados com outros dispositivos. Não use dados pessoais, documentos reais ou informações financeiras confidenciais antes de configurar backend, autenticação e políticas de acesso.

O arquivo `sql/supabase.sql` contém um ponto de partida para o banco. A integração de cliente está preparada em `js/config.js`, mas os módulos ainda precisam ser conectados às consultas do Supabase para que os dados sejam sincronizados online. O login atualmente é demonstrativo, não autentica usuários reais.

## Iniciar rapidamente no Windows

1. Extraia todos os arquivos do ZIP para uma pasta.
2. Dê dois cliques em `INICIAR_RAIZ.bat`.
3. Acesse `http://localhost:8080` no navegador.
4. **Mantenha a janela preta aberta** enquanto estiver usando o site. Para parar o servidor, pressione `Ctrl + C` nessa janela.

Se a porta 8080 já estiver ocupada, feche o outro servidor que estiver usando essa porta ou use o método Live Server abaixo.

## Executar no Visual Studio Code

1. Extraia o ZIP para uma pasta.
2. Abra a pasta `raiz_gestao_continuidade_rural` no VS Code.
3. Instale a extensão **Live Server**.
4. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.
5. Clique em **Acessar sistema** e entre no modo de demonstração.

Também é possível abrir `index.html` diretamente, mas o Live Server é recomendado.

## Estrutura

```text
raiz_gestao_continuidade_rural/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── config.js
├── sql/
│   └── supabase.sql
└── README.md
```

## Configurar Supabase para uso online

1. Crie um projeto no Supabase.
2. No SQL Editor, revise e execute `sql/supabase.sql`.
3. Configure Supabase Auth e os URLs permitidos (local e domínio de produção).
4. Configure `js/config.js` com a URL do projeto e a chave publicável/anon.
5. Implemente e teste o fluxo de cadastro, criação da família, associação de membros e provisionamento de perfil.
6. Conecte cada módulo às tabelas correspondentes, usando o usuário autenticado e o `familia_id`.
7. Crie um bucket privado para documentos e políticas de Storage específicas.
8. Teste as políticas RLS com usuários Administrador, Financeiro e Familiar.
9. Nunca exponha a chave `service_role` no frontend.
10. Antes de uso real, revise as políticas com cuidado: não permita que uma pessoa escolha o papel de Administrador em cadastro público.

### Variáveis / configuração

O projeto estático usa `js/config.js`. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` com os valores públicos do projeto. Para uma arquitetura de produção, prefira um processo de build com variáveis de ambiente e revisão das permissões.

## Publicar

Pode publicar os arquivos estáticos em GitHub Pages, Netlify ou Vercel. Se usar GitHub Pages, lembre-se de que ele hospeda o frontend, não executa backend. Para autenticação e banco de dados, use Supabase ou outro backend seguro.

## Próximos passos para produção

- Integrar autenticação real e recuperação de senha.
- Implementar criação/convite de membros da família.
- Ligar os CRUDs ao PostgreSQL do Supabase.
- Adicionar upload/download de documentos em bucket privado.
- Implementar edição de registros e trilha de auditoria no backend.
- Gerar PDF e XLSX com bibliotecas apropriadas.
- Adicionar testes, logs, validação e revisão de segurança.
- Conectar o formulário de contato a uma função de backend ou serviço de formulários.

## Aviso

O RAIZ é uma ferramenta de organização e acompanhamento. Não substitui orientação jurídica, contábil, tributária ou sucessória profissional.


### Fotos das propriedades

No módulo **Propriedades e bens**, o formulário permite selecionar uma foto da propriedade. A imagem é redimensionada/comprimida no navegador e salva junto ao registro no armazenamento local deste navegador. Ao editar o registro, a foto atual aparece como prévia e pode ser substituída ou removida. Para uso real compartilhado entre dispositivos, configure armazenamento de arquivos no Supabase Storage; imagens locais não são sincronizadas entre computadores.


## Identidade visual
A logo oficial do projeto está em `assets/logo-raiz.png` e é utilizada no cabeçalho, rodapé, acesso ao sistema, área de gestão e ícone da aba do navegador. Mantenha essa pasta junto com `index.html` ao publicar ou mover o projeto.
