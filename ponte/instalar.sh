#!/usr/bin/env bash
# Instala a Ponte para o seu usuário no CachyOS / Arch.
#   ./instalar.sh            instala ou atualiza
#   ./instalar.sh --remover  desinstala (mantém configuração e arquivos recebidos)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
BIN="$HOME/.local/bin/ponte"
AUTOSTART="$HOME/.config/autostart/ponte.desktop"
APP="$HOME/.local/share/applications/ponte-clipboard.desktop"
APP_PRINCIPAL="$HOME/.local/share/applications/ponte.desktop"
MENU="$HOME/.local/share/kio/servicemenus/ponte-enviar.desktop"
PORTA=53317

parar() { pkill -f "ponte servidor" 2>/dev/null || true; }

if [[ "${1:-}" == "--remover" ]]; then
    parar
    rm -f "$BIN" "$AUTOSTART" "$APP" "$APP_PRINCIPAL" "$MENU"
    echo "Ponte removida. Configuração em ~/.config/ponte e dados em ~/.local/share/ponte foram mantidos."
    exit 0
fi

echo "==> Conferindo dependências"
faltam=()
command -v python3     >/dev/null || faltam+=(python)
command -v openssl     >/dev/null || faltam+=(openssl)
command -v notify-send >/dev/null || faltam+=(libnotify)
command -v wl-copy     >/dev/null || faltam+=(wl-clipboard)
command -v xclip       >/dev/null || faltam+=(xclip)
if ((${#faltam[@]})); then
    echo "    Instalando: ${faltam[*]}"
    sudo pacman -S --needed --noconfirm "${faltam[@]}"
fi
python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))' \
    || { echo "Precisa do Python 3.11 ou mais novo."; exit 1; }

echo "==> Copiando o programa para $BIN"
install -Dm755 "$DIR/ponte.py" "$BIN"

echo "==> Ligando a Ponte ao entrar na sessão"
mkdir -p "$(dirname "$AUTOSTART")" "$(dirname "$APP")" "$(dirname "$MENU")"
cat > "$AUTOSTART" <<EOF
[Desktop Entry]
Type=Application
Name=Ponte
Comment=Recebe textos e arquivos do LocalSend
Exec=$BIN servidor
Icon=document-send
X-GNOME-Autostart-enabled=true
NoDisplay=true
EOF

# "Ponte" no menu de aplicativos: liga se estiver desligada e mostra o estado
cat > "$APP_PRINCIPAL" <<EOF
[Desktop Entry]
Type=Application
Name=Ponte
Comment=Copiar, colar e enviar arquivos com o celular (LocalSend)
Exec=$BIN abrir
Icon=document-send
Terminal=false
Categories=Utility;Network;
EOF

# Entrada de menu usada para o atalho de teclado
cat > "$APP" <<EOF
[Desktop Entry]
Type=Application
Name=Ponte: enviar área de transferência
Comment=Envia o que está copiado para o celular
Exec=$BIN clipboard
Icon=document-send
Terminal=false
Categories=Utility;Network;
EOF

# Menu do botão direito no Dolphin
cat > "$MENU" <<EOF
[Desktop Entry]
Type=Service
MimeType=all/allfiles;inode/directory;
Actions=enviar
X-KDE-Priority=TopLevel

[Desktop Action enviar]
Name=Enviar para o celular (Ponte)
Icon=document-send
Exec=$BIN enviar %F
EOF
chmod +x "$MENU"

echo "==> Liberando a porta $PORTA no firewall (para o celular conseguir mandar)"
if command -v ufw >/dev/null && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
    sudo ufw allow $PORTA/tcp comment "LocalSend/Ponte" >/dev/null
    sudo ufw allow $PORTA/udp comment "LocalSend/Ponte" >/dev/null
    echo "    ufw: liberada"
elif command -v firewall-cmd >/dev/null && sudo firewall-cmd --state >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=$PORTA/tcp --add-port=$PORTA/udp >/dev/null
    sudo firewall-cmd --reload >/dev/null
    echo "    firewalld: liberada"
else
    echo "    nenhum firewall ativo, nada a fazer"
fi

echo "==> Iniciando"
parar
sleep 0.5
nohup "$BIN" servidor >/dev/null 2>&1 &
sleep 1.5
if pgrep -f "ponte servidor" >/dev/null; then
    echo "    Ponte ligada."
else
    echo "    A Ponte não ficou ligada. Rode '$BIN servidor' para ver o erro."
    echo "    (O LocalSend oficial aberto no PC usa a mesma porta: feche-o.)"
fi

case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) echo; echo "Aviso: ~/.local/bin não está no PATH. Use $BIN ou adicione a pasta ao PATH." ;;
esac

cat <<EOF

Pronto. Próximos passos:
  1. No celular, abra o LocalSend: o PC aparece como "$(sed -n 's/^nome = "\(.*\)"/\1/p' "$HOME/.config/ponte/config.toml" 2>/dev/null || hostname)".
  2. Mande algo do celular e toque em "Sempre deste aparelho" na notificação.
  3. Atalho: Configurações do Sistema → Teclado → Atalhos → Adicionar novo → Aplicativo
     → "Ponte: enviar área de transferência" → defina, por exemplo, Meta+Shift+C.
  4. Configuração (nome, pasta, aparelho padrão): $HOME/.config/ponte/config.toml
EOF
