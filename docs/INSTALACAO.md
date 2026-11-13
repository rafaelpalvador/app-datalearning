# Como instalar o DataLingo

Os três apps funcionam **100% offline**: o banco SQLite e o Python (com pandas, NumPy,
matplotlib, BeautifulSoup e sqlite3) vêm dentro do app.

## Onde baixar

Cada vez que o código é enviado ao GitHub, o **GitHub Actions** compila os apps automaticamente:

1. Abra o repositório no GitHub → aba **Actions** → workflow **Build apps (Android, Windows, Linux)**
2. Clique na execução mais recente com ✅
3. Em **Artifacts**, baixe:
   - `DataLingo-Android` → o `.apk` para o celular
   - `DataLingo-Windows` → instalador `.exe` e versão portátil
   - `DataLingo-Linux` → `.AppImage` e `.deb`

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

1. Baixe o artifact `DataLingo-Android` no celular (pelo navegador, logado no GitHub) ou no PC e passe o `.apk` por cabo/Google Drive.
2. Extraia o `.zip` e toque em `DataLingo-x.y.z-android.apk`.
3. O MagicOS vai pedir permissão para **instalar apps desconhecidos** para o app que abriu o arquivo
   (ex.: *Arquivos* ou *Chrome*): toque em **Configurações** → ative **Permitir desta fonte** → volte e toque em **Instalar**.
4. Se aparecer o aviso do **Play Protect**, toque em **Mais detalhes → Instalar mesmo assim**
   (o app não está na Play Store, por isso o aviso).
5. Abra o DataLingo. Em **Perfil → Preferências**, ative o **Lembrete diário** e permita as notificações.

**Dica do MagicOS (lembretes):** o Honor fecha apps em segundo plano de forma agressiva. Se o lembrete não aparecer:
*Configurações → Bateria → Inicialização de apps → DataLingo* → desative "Gerenciar automaticamente" e ative
"Executar em segundo plano".

**Atualizações:** todo APK gerado pelo GitHub é assinado com a mesma chave, então basta instalar a versão nova
por cima — o progresso é mantido.

## 🪟 Windows 11

- **Instalador** (`DataLingo-x.y.z-windows-instalador.exe`): dê dois cliques e siga o assistente. Cria atalho na área de trabalho e no menu Iniciar.
- **Portátil** (`DataLingo-x.y.z-windows-portable.exe`): roda sem instalar (bom para pendrive ou PC do trabalho).

Como o app não tem certificado de assinatura de código (custa caro), o **SmartScreen** pode avisar
"O Windows protegeu o computador": clique em **Mais informações → Executar assim mesmo**.

## 🐧 Linux

**AppImage** (qualquer distribuição):
```bash
chmod +x DataLingo-*-linux-x86_64.AppImage
./DataLingo-*-linux-x86_64.AppImage
```
Se reclamar de FUSE no Ubuntu 22.04+: `sudo apt install libfuse2` (ou `libfuse2t64` no 24.04).

**.deb** (Ubuntu, Debian, Mint, Pop!_OS):
```bash
sudo apt install ./DataLingo-*-linux-amd64.deb
```
O DataLingo aparece no menu de aplicativos, em *Educação*.

## 🔄 Levar o progresso do celular para o PC

Não há servidor (ainda), então a sincronização é manual:
**Perfil → Backup → Exportar** num aparelho (o código é copiado) → envie para você mesmo (WhatsApp, e-mail...) →
**Perfil → Backup → Importar** no outro aparelho.

## 🛠️ Compilar você mesmo

```bash
npm ci
npm run fetch:pyodide      # baixa o Python offline (~80 MB) para vendor/pyodide
npm run desktop            # abre o app de desktop em modo desenvolvimento
npm run dist:linux         # gera AppImage e .deb em release/
npm run dist:win           # (no Windows) gera instalador e portátil
npm run android:sync       # prepara o projeto Android; depois abra a pasta android/ no Android Studio
```
