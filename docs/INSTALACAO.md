# Como instalar o Datum

> A partir da versão 1.2.0 o app se chama **Datum** (antes: DataLingo). A atualização é instalada por cima e mantém o seu progresso.

Os três apps funcionam **100% offline**: o banco SQLite e o Python (com pandas, NumPy,
matplotlib, BeautifulSoup e sqlite3) vêm dentro do app.

## Onde baixar

Cada vez que o código é enviado ao GitHub, o **GitHub Actions** compila os apps automaticamente:

1. Abra o repositório no GitHub → aba **Actions** → workflow **Build apps (Android, Windows, Linux)**
2. Clique na execução mais recente com ✅
3. Em **Artifacts**, baixe:
   - `Datum-Android` → o `.apk` para o celular
   - `Datum-Windows` → instalador `.exe` e versão portátil
   - `Datum-Linux` → `.AppImage` e `.deb`

Os artifacts vêm dentro de um `.zip` — extraia antes de instalar.

**Versões oficiais (Releases):** cada vez que o código é enviado, o GitHub Actions publica (ou atualiza)
a Release `v<versão>` usando a versão do `package.json`. Para lançar uma versão nova, aumente `"version"`
no `package.json` (ex.: `1.1.0` → `1.2.0`). Página: https://github.com/rafaelpalvador/app-datalearning/releases

### Atualizações automáticas com o Obtainium (Android)

1. Instale o [Obtainium](https://github.com/ImranR98/Obtainium) no celular.
2. Toque em **Adicionar app** e cole: `https://github.com/rafaelpalvador/app-datalearning`
3. Toque em **Adicionar**. O Obtainium encontra o `.apk` da Release mais recente e instala.
4. A cada versão nova, ele avisa e atualiza (o progresso é mantido, a assinatura é sempre a mesma).

## 📱 Android — Honor 400 Pro (MagicOS 9 / Android 15)

1. Baixe o artifact `Datum-Android` no celular (pelo navegador, logado no GitHub) ou no PC e passe o `.apk` por cabo/Google Drive.
2. Extraia o `.zip` e toque em `Datum-x.y.z-android.apk`.
3. O MagicOS vai pedir permissão para **instalar apps desconhecidos** para o app que abriu o arquivo
   (ex.: *Arquivos* ou *Chrome*): toque em **Configurações** → ative **Permitir desta fonte** → volte e toque em **Instalar**.
4. Se aparecer o aviso do **Play Protect**, toque em **Mais detalhes → Instalar mesmo assim**
   (o app não está na Play Store, por isso o aviso).
5. Abra o Datum. Em **Perfil → Preferências**, ative o **Lembrete diário** e permita as notificações.

**Dica do MagicOS (lembretes):** o Honor fecha apps em segundo plano de forma agressiva. Se o lembrete não aparecer:
*Configurações → Bateria → Inicialização de apps → Datum* → desative "Gerenciar automaticamente" e ative
"Executar em segundo plano".

**Atualizações:** todo APK gerado pelo GitHub é assinado com a mesma chave, então basta instalar a versão nova
por cima — o progresso é mantido.

## 🪟 Windows 11

- **Instalador** (`Datum-x.y.z-windows-instalador.exe`): dê dois cliques e siga o assistente. Cria atalho na área de trabalho e no menu Iniciar.
- **Portátil** (`Datum-x.y.z-windows-portable.exe`): roda sem instalar (bom para pendrive ou PC do trabalho).

Como o app não tem certificado de assinatura de código (custa caro), o **SmartScreen** pode avisar
"O Windows protegeu o computador": clique em **Mais informações → Executar assim mesmo**.

### Atualizar o Windows

**Dentro do app (a partir da 1.7.0):** o Datum procura versões novas sozinho ao abrir (e a cada 6 horas) e mostra um aviso.
Também dá para buscar em **Perfil → Atualizações do app** ou no menu **Datum → Buscar atualizações** (tecla Alt mostra o menu).
Na versão instalada, o botão **Atualizar agora** baixa o instalador, instala em segundo plano e reabre o app; o progresso é mantido.
Na versão portátil, o botão abre a página de download.

**Pelo terminal (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/rafaelpalvador/app-datalearning/HEAD/scripts/atualizar-windows.ps1 | iex
```
O comando compara a versão instalada com a última Release, baixa o instalador, fecha o Datum, instala sem perguntas e abre o app de novo.
Se o Datum ainda não estiver instalado, ele instala. Para forçar a reinstalação: `$env:DATUM_FORCAR = '1'` antes do comando.

## 🐧 Linux

**AppImage** (qualquer distribuição):
```bash
chmod +x Datum-*-linux-x86_64.AppImage
./Datum-*-linux-x86_64.AppImage
```
Se reclamar de FUSE no Ubuntu 22.04+: `sudo apt install libfuse2` (ou `libfuse2t64` no 24.04).

**.deb** (Ubuntu, Debian, Mint, Pop!_OS):
```bash
sudo apt install ./Datum-*-linux-amd64.deb
```
O Datum aparece no menu de aplicativos, em *Educação*.

## 🤖 Ativar o tutor com a sua IA

1. Crie uma chave no provedor que você prefere. O jeito mais barato de começar é o **Gemini**, que tem cota gratuita: acesse aistudio.google.com/apikey, entre com sua conta Google e toque em **Create API key**.
2. No Datum: **Perfil → Tutor de IA** → escolha **Gemini** → cole a chave → **Usar esta IA**.
3. Pronto: use o botão **Dúvida** dentro de qualquer exercício ou a aba **Dúvidas**.

Para trocar de IA, volte ao Perfil e escolha outro provedor; as chaves de cada um ficam guardadas.

## 🔄 Sincronizar celular e computador

**Automático (a partir da 1.8.0), pela sua conta do GitHub:**
1. No navegador, abra https://github.com/settings/tokens/new?scopes=gist&description=Datum%20sincroniza%C3%A7%C3%A3o
   (a permissão **gist** já vem marcada; é a única necessária). Escolha a validade e clique em **Generate token**. Copie o token.
2. No Datum: **Perfil → Sincronizar celular e computador** → cole o token → **Conectar**.
3. Faça o mesmo no outro aparelho, com o mesmo token.

O progresso fica num Gist **secreto** da sua conta (`datum-progresso.json`) e é sincronizado ao abrir o app, ao voltar para ele e
ao terminar cada lição. Lições concluídas, XP, revisão espaçada, erros, conquistas e entrevistas dos dois aparelhos são somados
sem contar duas vezes. O token, as chaves das IAs e as preferências (som, tema, lembrete) ficam só em cada aparelho.

**Preferências (1.9.0):** com a opção ligada, tema, som, vibração, meta diária e a IA escolhida no tutor também sincronizam
(vale a alteração mais recente). As chaves das IAs continuam só em cada aparelho.

**Portfólio no GitHub (1.9.0):** em **Perfil → Sincronizar → Portfólio no GitHub**, o Datum publica num Gist (público ou secreto)
as soluções de SQL e Python que você escreveu sem ver a resposta, organizadas por trilha, mais os problemas de entrevista resolvidos.
Use o mesmo botão para atualizar; os dois aparelhos atualizam o mesmo Gist.

**Manual:** **Perfil → Backup manual → Exportar** num aparelho (o código é copiado) → envie para você mesmo →
**Perfil → Backup manual → Importar** no outro.

## 🛠️ Compilar você mesmo

```bash
npm ci
npm run fetch:pyodide      # baixa o Python offline (~80 MB) para vendor/pyodide
npm run desktop            # abre o app de desktop em modo desenvolvimento
npm run dist:linux         # gera AppImage e .deb em release/
npm run dist:win           # (no Windows) gera instalador e portátil
npm run android:sync       # prepara o projeto Android; depois abra a pasta android/ no Android Studio
```
