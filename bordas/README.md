# Bordas: gestos de borda para Android

App no estilo do *One Hand Operation+* da Samsung, para qualquer Android 8+ (feito pensando no Honor 400 Pro / MagicOS 9).
Uma alça fina fica na borda esquerda e/ou direita da tela, e cada jeito de deslizar a partir dela executa uma ação.

## Gestos (por borda)

| Gesto | Padrão (esquerda) | Padrão (direita) |
|---|---|---|
| → Reto, curto | Voltar | Voltar |
| ⇒ Reto, longo | Voltar ao último app | Voltar ao último app |
| ↗ Diagonal para cima, curto | Tela inicial | Tela inicial |
| ↗ Diagonal para cima, longo | Apps recentes | Apps recentes |
| ↘ Diagonal para baixo, curto | Notificações | Notificações |
| ↘ Diagonal para baixo, longo | Configurações rápidas | Lanterna |
| ↑ Pela borda, para cima | Nada | Nada |
| ↓ Pela borda, para baixo | Nada | Nada |

São 16 gestos no total. "Longo" é arrastar além da 2ª vibração (distância ajustável).

## Ações disponíveis

Voltar, tela inicial, recentes, último app, notificações, configurações rápidas, captura de tela, bloquear a tela,
menu de energia, tela dividida, lanterna, tocar/pausar, próxima/anterior faixa, volume (+, −, painel), câmera,
assistente de voz, **escanear QR code**, **abrir qualquer app**, **abrir uma tela específica de um app** (inclusive apps de sistema sem ícone, como o leitor de QR do Honor) e **abrir link ou atalho** (`https://`, `tel:`, `mailto:`, `https://wa.me/...`).

## Ajustes

Posição vertical, altura e largura da alça, distância mínima do gesto, distância do gesto longo, visibilidade da alça
(0% = transparente), seta animada saindo da borda com o nome da ação (como na Samsung), vibração, mostrar o nome do gesto (para aprender) e funcionar ou não na horizontal.

## Instalação

1. Baixe `Bordas-<versão>-android.apk` em *Releases* (tag `bordas-v...`) ou em *Actions → Build Bordas → Artifacts*.
2. Instale e abra o app → **Abrir Acessibilidade** → ligue **Bordas**.
   - Android 13+ com APK baixado: se aparecer *configuração restrita*, vá em **Informações do app → ⋮ → Permitir configurações restritas** e tente de novo.
3. Honor/MagicOS: *Configurações → Bateria → Inicialização de apps → Bordas* → **Gerenciar manualmente** com tudo ligado.

## Navegação por gestos do Android

A borda da tela também é o "voltar" do sistema. O Bordas pede ao Android para reservar a área da alça, mas o sistema
aceita no máximo ~200 dp de altura por lado. Com alça maior que isso, o voltar do sistema pode ganhar a disputa.

## Como funciona

- `EdgeService`: serviço de acessibilidade que desenha as alças (`TYPE_ACCESSIBILITY_OVERLAY`, sem permissão de sobreposição)
  e executa ações globais (`performGlobalAction`). Não lê o conteúdo da tela (`canRetrieveWindowContent=false`).
- `EdgeHandleView`: recebe o toque, vibra ao passar dos limites e classifica o gesto com `GestureClassifier`
  (ângulo: até 22,5° = reto; até 62° = diagonal; acima = pela borda).
- `ActionRunner`: executa cada ação. `MainActivity`: tela de configuração em Jetpack Compose.

## Compilar

```bash
cd bordas
./gradlew testReleaseUnitTest assembleRelease   # precisa do Android SDK (ANDROID_HOME)
```

O GitHub Actions (`.github/workflows/build-bordas.yml`) compila a cada push que mexe em `bordas/`.
