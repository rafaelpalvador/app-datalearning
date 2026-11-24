#!/usr/bin/env python3
"""Ponte: o lado do PC (Linux) para o LocalSend.

Fala o protocolo LocalSend v2, então aparece na lista do app LocalSend do
celular e recebe e envia arquivos e textos. A diferença para o LocalSend
oficial de desktop é o que acontece quando algo chega:

- texto vindo do celular vai direto para a área de transferência;
- arquivos de aparelhos de confiança vão direto para a pasta escolhida;
- ``ponte clipboard`` envia o que está copiado no PC (texto, imagem ou
  arquivos copiados no gerenciador de arquivos), feito para virar atalho.

Só usa a biblioteca padrão do Python (3.11+) e programas comuns do Linux:
openssl, wl-clipboard ou xclip e notify-send.
"""

from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import html
import http.client
import http.server
import ipaddress
import json
import logging
import logging.handlers
import mimetypes
import os
import secrets
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import tomllib
import urllib.parse
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

VERSAO = "0.2.1"
PROTOCOLO = "2.1"
PORTA_PADRAO = 53317
GRUPO_MULTICAST = "224.0.0.167"
API = "/api/localsend/v2"
# Mesmo limite do LocalSend: textos maiores viram arquivo .txt.
MAX_MENSAGEM = 16 * 1024
MAX_JSON = 8 * 1024 * 1024
PEDACO = 256 * 1024
ESPERA_PERGUNTA = 90  # segundos para responder a notificação
INTERVALO_ANUNCIO = 15  # segundos entre anúncios na rede (um pacote UDP pequeno)

log = logging.getLogger("ponte")


class Erro(Exception):
    """Erro com mensagem para mostrar ao usuário."""


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------


def tamanho_legivel(n: float) -> str:
    for unidade in ("B", "KB", "MB", "GB"):
        if n < 1024 or unidade == "GB":
            return f"{n:.0f} {unidade}" if unidade == "B" else f"{n:.1f} {unidade}"
        n /= 1024
    return f"{n:.1f} TB"


def iso_utc(ts: float) -> str:
    return dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ler_iso(texto) -> float | None:
    if not isinstance(texto, str):
        return None
    try:
        return dt.datetime.fromisoformat(texto.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def impressao_digital(cert_der: bytes) -> str:
    """SHA-256 do certificado (DER) em hexadecimal maiúsculo, como o LocalSend."""
    return hashlib.sha256(cert_der).hexdigest().upper()


def caminho_seguro(pasta: Path, nome: str) -> Path:
    """Monta o destino de um arquivo recebido sem deixar sair da pasta.

    O LocalSend manda pastas como ``album/foto.jpg``; partes vazias, ``.``
    e ``..`` são descartadas.
    """
    partes = [p for p in nome.replace("\\", "/").split("/") if p not in ("", ".", "..")]
    partes = [p.replace("\0", "") for p in partes]
    if not partes:
        partes = ["arquivo"]
    destino = pasta.joinpath(*partes)
    raiz = pasta.resolve()
    if raiz != destino.resolve().parent and raiz not in destino.resolve().parents:
        destino = pasta / partes[-1]
    return destino


def nome_livre(destino: Path) -> Path:
    """``foto.jpg`` → ``foto (1).jpg`` se já existir."""
    if not destino.exists():
        return destino
    base, ext = destino.stem, destino.suffix
    i = 1
    while True:
        candidato = destino.with_name(f"{base} ({i}){ext}")
        if not candidato.exists():
            return candidato
        i += 1


def redes_locais() -> list[ipaddress.IPv4Interface]:
    """Endereços IPv4 das placas de rede (sem loopback e redes virtuais)."""
    ignorar = ("lo", "docker", "br-", "veth", "virbr", "vmnet", "tun", "tailscale", "wg")
    saida: list[ipaddress.IPv4Interface] = []
    if shutil.which("ip"):
        try:
            dados = json.loads(subprocess.run(
                ["ip", "-j", "-4", "addr", "show", "up"],
                capture_output=True, text=True, timeout=5).stdout or "[]")
            for placa in dados:
                if placa.get("ifname", "").startswith(ignorar):
                    continue
                for a in placa.get("addr_info", []):
                    if a.get("family") == "inet":
                        saida.append(ipaddress.IPv4Interface(f"{a['local']}/{a['prefixlen']}"))
        except (OSError, ValueError, subprocess.SubprocessError):
            pass
    if not saida:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("10.255.255.255", 1))  # não envia nada
                saida.append(ipaddress.IPv4Interface(f"{s.getsockname()[0]}/24"))
        except OSError:
            pass
    return [r for r in saida if not r.ip.is_loopback]


# --------------------------------------------------------------------------
# Integração com a área de trabalho (área de transferência e notificações)
# --------------------------------------------------------------------------


class Desktop:
    """Área de transferência e notificações. Os testes trocam por uma versão falsa."""

    @staticmethod
    def _wayland() -> bool:
        return bool(os.environ.get("WAYLAND_DISPLAY")) and shutil.which("wl-copy") is not None

    def copiar_texto(self, texto: str) -> None:
        self._copiar(texto.encode("utf-8"), "text/plain;charset=utf-8")

    def copiar_imagem(self, caminho: Path, tipo: str) -> None:
        self._copiar(caminho.read_bytes(), tipo)

    def _copiar(self, dados: bytes, tipo: str) -> None:
        if self._wayland():
            cmd = ["wl-copy", "--type", tipo]
        elif shutil.which("xclip"):
            cmd = ["xclip", "-selection", "clipboard", "-t", tipo.split(";")[0] if not tipo.startswith("text/") else "UTF8_STRING", "-i"]
        else:
            raise Erro("Instale o wl-clipboard (Wayland) ou o xclip (X11): sudo pacman -S wl-clipboard xclip")
        # wl-copy e xclip ficam em segundo plano servindo o conteúdo: sem DEVNULL o run() trava.
        subprocess.run(cmd, input=dados, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10, check=False)

    def tipos_copiados(self) -> list[str]:
        if self._wayland():
            cmd = ["wl-paste", "--list-types"]
        elif shutil.which("xclip"):
            cmd = ["xclip", "-selection", "clipboard", "-t", "TARGETS", "-o"]
        else:
            raise Erro("Instale o wl-clipboard (Wayland) ou o xclip (X11): sudo pacman -S wl-clipboard xclip")
        r = subprocess.run(cmd, capture_output=True, timeout=10)
        return [t.strip() for t in r.stdout.decode("utf-8", "replace").splitlines() if t.strip()]

    def ler_copiado(self, tipo: str) -> bytes:
        if self._wayland():
            cmd = ["wl-paste", "--no-newline", "--type", tipo]
        else:
            cmd = ["xclip", "-selection", "clipboard", "-t", tipo, "-o"]
        return subprocess.run(cmd, capture_output=True, timeout=10).stdout

    def notificar(self, titulo: str, corpo: str = "", pasta: Path | None = None,
                  substituir: str | None = None) -> str | None:
        """Aviso que não espera resposta. Com ``pasta``, oferece abri-la.

        Devolve o id da notificação; passar esse id em ``substituir`` troca o
        aviso anterior em vez de empilhar outro (ex.: "Enviando…" → "Enviado").
        """
        log.info("%s %s", titulo, corpo.replace("\n", " | "))
        if not shutil.which("notify-send"):
            return None
        cmd = ["notify-send", "--app-name=Ponte", "--icon=document-send", titulo, corpo]
        if pasta is None:
            # Espera o notify-send terminar: quem chama pode sair logo em seguida
            # (atalho de teclado, Dolphin) e o aviso não pode se perder.
            extra = ["--print-id"] + (["--replace-id", substituir] if substituir else [])
            try:
                r = subprocess.run(cmd + extra, capture_output=True, text=True, timeout=5)
                if r.returncode != 0:  # notify-send antigo, sem --print-id
                    r = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                return r.stdout.strip() or None
            except (OSError, subprocess.SubprocessError):
                return None

        def esperar():
            try:
                r = subprocess.run(cmd + ["--action=abrir=Abrir pasta", "--wait"],
                                   capture_output=True, text=True, timeout=600)
                if r.stdout.strip() == "abrir" and shutil.which("xdg-open"):
                    subprocess.Popen(["xdg-open", str(pasta)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except (OSError, subprocess.SubprocessError):
                pass

        threading.Thread(target=esperar, daemon=True).start()
        return None

    def perguntar(self, titulo: str, corpo: str) -> str | None:
        """Pergunta se aceita. Devolve 'aceitar', 'sempre' ou None (recusou/sem resposta).

        Usa uma janela de diálogo (kdialog no KDE, zenity nos outros): ela fica
        na tela até a resposta. Botões em notificação somem para o histórico em
        poucos segundos no KDE, e o celular ficava esperando sem você ver.
        """
        log.info("Pergunta: %s %s", titulo, corpo.replace("\n", " | "))
        texto = f"<b>{html.escape(titulo)}</b><br><br>{html.escape(corpo).replace(chr(10), '<br>')}"
        kde = "KDE" in os.environ.get("XDG_CURRENT_DESKTOP", "").upper()
        tentativas = []
        if shutil.which("kdialog"):
            tentativas.append("kdialog")
        if shutil.which("zenity"):
            tentativas.insert(0 if not kde else len(tentativas), "zenity")
        if shutil.which("notify-send"):
            tentativas.append("notify-send")
        if not tentativas:
            log.warning("Sem kdialog, zenity ou notify-send: recusando %s", titulo)
            return None
        # Um aviso sonoro/visual chama a atenção para a janela.
        if tentativas[0] != "notify-send" and shutil.which("notify-send"):
            with contextlib.suppress(OSError, subprocess.SubprocessError):
                subprocess.run(["notify-send", "--app-name=Ponte", "--icon=document-receive",
                                titulo, "Responda na janela da Ponte."], capture_output=True, timeout=5)
        for programa in tentativas:
            try:
                resposta = self._perguntar_com(programa, titulo, texto, corpo)
            except FileNotFoundError:
                continue
            except subprocess.TimeoutExpired:
                log.info("Sem resposta em %d s: recusado", ESPERA_PERGUNTA)
                return None
            except (OSError, subprocess.SubprocessError) as e:
                log.warning("%s falhou: %s", programa, e)
                continue
            if resposta == "erro":
                continue
            log.info("Resposta: %s", resposta or "recusar")
            return resposta
        return None

    @staticmethod
    def _perguntar_com(programa: str, titulo: str, texto: str, corpo: str) -> str | None:
        if programa == "kdialog":
            r = subprocess.run(["kdialog", "--title", "Ponte", "--icon", "document-receive",
                                "--yes-label", "Aceitar", "--no-label", "Sempre deste aparelho",
                                "--cancel-label", "Recusar", "--yesnocancel", texto],
                               capture_output=True, text=True, timeout=ESPERA_PERGUNTA)
            return {0: "aceitar", 1: "sempre", 2: None}.get(r.returncode, "erro")
        if programa == "zenity":
            extra = "Sempre deste aparelho"
            r = subprocess.run(["zenity", "--question", "--title=Ponte", "--icon=document-receive",
                                f"--text={texto}", "--ok-label=Aceitar", "--cancel-label=Recusar",
                                f"--extra-button={extra}", "--width=420"],
                               capture_output=True, text=True, timeout=ESPERA_PERGUNTA)
            if r.returncode == 0:
                return "aceitar"
            if r.stdout.strip() == extra:
                return "sempre"
            return None if r.returncode == 1 else "erro"
        r = subprocess.run(["notify-send", "--app-name=Ponte", "--icon=document-receive",
                            "--urgency=critical", "--action=aceitar=Aceitar",
                            "--action=sempre=Sempre deste aparelho", "--action=recusar=Recusar",
                            "--wait", titulo, corpo],
                           capture_output=True, text=True, timeout=ESPERA_PERGUNTA)
        resposta = r.stdout.strip()
        return resposta if resposta in ("aceitar", "sempre") else None


# --------------------------------------------------------------------------
# Configuração, identidade e aparelhos conhecidos
# --------------------------------------------------------------------------

CONFIG_MODELO = """\
# Configuração da Ponte. Depois de mudar, reinicie: ponte servidor
# (ou saia e entre de novo na sessão).

# Nome que aparece no LocalSend do celular
nome = "{nome}"

# Onde os arquivos recebidos são salvos
pasta = "~/Recebidos"

# Aparelho usado por "ponte enviar" e "ponte clipboard" quando você não usa -p
# (parte do nome basta, por exemplo "Honor"). Vazio: o único de confiança.
padrao = ""

# Quando o celular manda uma única imagem, também copiar para a área de transferência
copiar_imagens = true

# PIN pedido a aparelhos que NÃO são de confiança (vazio = sem PIN)
pin = ""

# Porta do LocalSend. Só mude se mudar também nos celulares.
porta = 53317
"""


class Registro:
    """Aparelhos vistos na rede, guardados em JSON e protegidos por trava de arquivo."""

    def __init__(self, caminho: Path):
        self.caminho = caminho
        self.trava = caminho.with_suffix(".trava")

    @contextlib.contextmanager
    def _travado(self, exclusivo: bool):
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        with open(self.trava, "a") as t:
            fcntl.flock(t, fcntl.LOCK_EX if exclusivo else fcntl.LOCK_SH)
            yield

    def _ler(self) -> dict:
        try:
            return json.loads(self.caminho.read_text("utf-8"))
        except (OSError, ValueError):
            return {}

    def todos(self) -> dict:
        with self._travado(False):
            return self._ler()

    @contextlib.contextmanager
    def editar(self):
        with self._travado(True):
            dados = self._ler()
            yield dados
            tmp = self.caminho.with_suffix(".tmp")
            tmp.write_text(json.dumps(dados, indent=2, ensure_ascii=False), "utf-8")
            os.replace(tmp, self.caminho)

    def visto(self, fp: str, info: dict, ip: str) -> None:
        if not fp:
            return
        with self.editar() as dados:
            d = dados.setdefault(fp, {"confiavel": False})
            d["alias"] = str(info.get("alias") or d.get("alias") or "?")[:100]
            d["modelo"] = info.get("deviceModel") or d.get("modelo")
            d["tipo"] = info.get("deviceType") or d.get("tipo")
            d["ip"] = ip
            if "port" in info:
                d["porta"] = int(info["port"])
            if "protocol" in info:
                d["protocolo"] = "http" if info["protocol"] == "http" else "https"
            d.setdefault("porta", PORTA_PADRAO)
            d.setdefault("protocolo", "https")
            d["visto"] = time.time()

    def confiavel(self, fp: str | None) -> bool:
        return bool(fp) and bool(self.todos().get(fp, {}).get("confiavel"))

    def marcar(self, fp: str, confiavel: bool) -> None:
        with self.editar() as dados:
            if fp in dados:
                dados[fp]["confiavel"] = confiavel

    def procurar(self, nome: str) -> list[tuple[str, dict]]:
        nome = nome.casefold().strip()
        itens = sorted(self.todos().items(), key=lambda kv: -kv[1].get("visto", 0))
        exatos = [(fp, d) for fp, d in itens if d.get("alias", "").casefold() == nome]
        if exatos:
            return exatos
        return [(fp, d) for fp, d in itens
                if nome in d.get("alias", "").casefold() or nome in (d.get("modelo") or "").casefold()
                or fp.casefold().startswith(nome)]


class Ponte:
    def __init__(self, dir_config: Path, dir_dados: Path, desktop: Desktop | None = None,
                 ajustes: dict | None = None):
        self.dir_config = dir_config
        self.dir_dados = dir_dados
        self.desktop = desktop or Desktop()
        self.config = self._carregar_config(ajustes or {})
        self.porta = int(self.config["porta"])
        self.pasta = Path(os.path.expanduser(self.config["pasta"]))
        self.cert, self.chave, self.fp = self._identidade()
        self.registro = Registro(dir_dados / "dispositivos.json")
        self._trava = threading.Lock()
        self._trava_pergunta = threading.Lock()
        self.sessao: dict | None = None
        self.servidor_http: ServidorHTTPS | None = None

    # --- configuração e certificado ---

    def _carregar_config(self, ajustes: dict) -> dict:
        arquivo = self.dir_config / "config.toml"
        if not arquivo.exists():
            self.dir_config.mkdir(parents=True, exist_ok=True)
            nome = socket.gethostname().split(".")[0] or "Linux"
            arquivo.write_text(CONFIG_MODELO.format(nome=nome.replace('"', "")), "utf-8")
        try:
            config = tomllib.loads(arquivo.read_text("utf-8"))
        except tomllib.TOMLDecodeError as e:
            raise Erro(f"Erro em {arquivo}: {e}") from e
        padrao = {"nome": "Linux", "pasta": "~/Recebidos", "padrao": "", "copiar_imagens": True,
                  "pin": "", "porta": PORTA_PADRAO}
        return {**padrao, **config, **ajustes}

    def _identidade(self) -> tuple[Path, Path, str]:
        cert, chave = self.dir_dados / "certificado.pem", self.dir_dados / "chave.pem"
        if not (cert.exists() and chave.exists()):
            if not shutil.which("openssl"):
                raise Erro("Instale o openssl: sudo pacman -S openssl")
            self.dir_dados.mkdir(parents=True, exist_ok=True)
            # Igual ao LocalSend: RSA-2048, autoassinado, CN=LocalSend User, sem validade prática.
            subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                            "-keyout", str(chave), "-out", str(cert), "-days", "36500",
                            "-subj", "/CN=LocalSend User"],
                           check=True, capture_output=True)
            os.chmod(chave, 0o600)
        der = ssl.PEM_cert_to_DER_cert(cert.read_text())
        return cert, chave, impressao_digital(der)

    def info(self, rede: bool = True) -> dict:
        d = {"alias": self.config["nome"], "version": PROTOCOLO, "deviceModel": "Linux",
             "deviceType": "desktop", "fingerprint": self.fp, "download": False}
        if rede:
            d.update(port=self.porta, protocol="https")
        return d

    # --- conexões de saída ---

    def contexto_cliente(self) -> ssl.SSLContext:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        # Os aparelhos usam certificados autoassinados: a confiança vem da impressão digital.
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        # O LocalSend atual só aceita o "register" de quem apresenta certificado (mTLS).
        ctx.load_cert_chain(self.cert, self.chave)
        return ctx

    def conectar(self, ip: str, porta: int, protocolo: str, fp_esperado: str | None,
                 timeout: float) -> http.client.HTTPConnection:
        if protocolo == "http":
            conn = http.client.HTTPConnection(ip, porta, timeout=timeout)
            conn.connect()
            return conn
        conn = http.client.HTTPSConnection(ip, porta, timeout=timeout, context=self.contexto_cliente())
        conn.connect()
        if fp_esperado:
            real = impressao_digital(conn.sock.getpeercert(binary_form=True))
            if real != fp_esperado.upper():
                conn.close()
                raise Erro(f"O certificado de {ip} não é o do aparelho conhecido (esperado "
                           f"{fp_esperado[:12]}…, recebido {real[:12]}…). Envio cancelado.")
        return conn

    def requisitar(self, ip: str, porta: int, protocolo: str, metodo: str, rota: str,
                   corpo: dict | None = None, fp: str | None = None,
                   timeout: float = 10) -> tuple[int, bytes]:
        conn = self.conectar(ip, porta, protocolo, fp, timeout)
        try:
            dados = json.dumps(corpo).encode() if corpo is not None else None
            cab = {"Content-Type": "application/json"} if dados is not None else {}
            conn.request(metodo, API + rota, body=dados, headers=cab)
            r = conn.getresponse()
            return r.status, r.read()
        finally:
            conn.close()

    # --- descoberta ---

    def anunciar(self, anuncio: bool = True) -> None:
        """Manda o 'oi' por multicast em cada placa de rede."""
        msg = json.dumps({**self.info(), "announce": anuncio, "announcement": anuncio}).encode()
        for rede in redes_locais() or [None]:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP) as s:
                    s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 1)
                    if rede is not None:
                        s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(str(rede.ip)))
                    s.sendto(msg, (GRUPO_MULTICAST, self.porta))
            except OSError as e:
                log.debug("Multicast por %s falhou: %s", rede, e)

    def registrar_em(self, ip: str, porta: int = PORTA_PADRAO, protocolo: str = "https",
                     timeout: float = 3) -> dict | None:
        """POST /register: nos apresentamos e recebemos as informações do outro."""
        try:
            status, dados = self.requisitar(ip, porta, protocolo, "POST", "/register",
                                            self.info(), timeout=timeout)
        except (OSError, ssl.SSLError, http.client.HTTPException, Erro):
            return None
        if status != 200:
            return None
        try:
            info = json.loads(dados)
        except ValueError:
            return None
        fp = info.get("fingerprint")
        if not fp or fp == self.fp:
            return None
        self.registro.visto(fp, {**info, "port": porta, "protocol": protocolo}, ip)
        return info

    def varrer_rede(self) -> int:
        """Plano B quando o multicast não funciona: tenta cada IP da rede local."""
        alvos: set[str] = set()
        meus = set()
        for rede in redes_locais():
            meus.add(str(rede.ip))
            net = rede.network if rede.network.prefixlen >= 24 else ipaddress.IPv4Interface(f"{rede.ip}/24").network
            if net.prefixlen <= 30:
                alvos.update(str(h) for h in net.hosts())
        alvos -= meus
        with ThreadPoolExecutor(max_workers=64) as ex:
            achados = [r for r in ex.map(lambda ip: self.registrar_em(ip, self.porta, timeout=1.5), sorted(alvos)) if r]
        return len(achados)

    def descobrir(self, espera: float = 2.5) -> None:
        antes = {fp: d.get("visto", 0) for fp, d in self.registro.todos().items()}
        self.anunciar()
        fim = time.time() + espera
        while time.time() < fim:
            time.sleep(0.25)
            agora = self.registro.todos()
            if any(d.get("visto", 0) > antes.get(fp, 0) for fp, d in agora.items()):
                time.sleep(0.5)  # dá tempo de outros responderem
                return
        self.varrer_rede()

    # --- envio ---

    def escolher_destino(self, nome: str | None) -> tuple[str, dict]:
        nome = nome or self.config.get("padrao") or ""
        for tentativa in range(2):
            if nome:
                achados = self.registro.procurar(nome)
            else:
                todos = sorted(self.registro.todos().items(), key=lambda kv: -kv[1].get("visto", 0))
                confiaveis = [x for x in todos if x[1].get("confiavel")]
                achados = confiaveis if confiaveis else todos
            if len(achados) == 1 or (nome and achados):
                return achados[0]
            if len(achados) > 1:
                nomes = ", ".join(d.get("alias", "?") for _, d in achados)
                raise Erro(f"Mais de um aparelho possível ({nomes}). Escolha com -p NOME "
                           "ou defina 'padrao' no config.toml.")
            if tentativa == 0:
                self.descobrir()
        alvo = f'"{nome}"' if nome else "nenhum"
        raise Erro(f"Aparelho {alvo} não encontrado. Abra o LocalSend no celular, "
                   "confira se está no mesmo Wi-Fi e rode: ponte procurar")

    def _alcancavel(self, fp: str, d: dict) -> dict | None:
        """Confere se o aparelho responde; se mudou de IP, procura de novo."""
        info = self.registrar_em(d["ip"], d.get("porta", PORTA_PADRAO), d.get("protocolo", "https"))
        if info and info.get("fingerprint") == fp:
            return self.registro.todos().get(fp, d)
        self.descobrir()
        novo = self.registro.todos().get(fp)
        if novo and novo.get("ip") != d.get("ip"):
            info = self.registrar_em(novo["ip"], novo.get("porta", PORTA_PADRAO), novo.get("protocolo", "https"))
            if info:
                return novo
        return None

    def enviar(self, itens: list[dict], para: str | None = None, pin: str | None = None,
               progresso: bool = False, ao_aguardar=None) -> tuple[str, int]:
        """Envia itens ({nome, tamanho, tipo, caminho|dados, preview?}). Devolve (aparelho, enviados)."""
        if not itens:
            raise Erro("Nada para enviar.")
        fp, d = self.escolher_destino(para)
        alias = d.get("alias", "?")
        d = self._alcancavel(fp, d)
        if d is None:
            raise Erro(f"{alias} não respondeu. Abra o LocalSend no celular (ele precisa estar "
                       "aberto ou em segundo plano) e tente de novo.")
        ip, porta, proto = d["ip"], d.get("porta", PORTA_PADRAO), d.get("protocolo", "https")

        arquivos = {}
        por_id = {}
        for item in itens:
            fid = str(uuid.uuid4())
            meta = {"id": fid, "fileName": item["nome"], "size": item["tamanho"],
                    "fileType": item["tipo"], "sha256": None, "preview": item.get("preview")}
            if item.get("modificado"):
                meta["metadata"] = {"modified": iso_utc(item["modificado"]), "accessed": None}
            arquivos[fid] = meta
            por_id[fid] = item

        rota = "/prepare-upload" + (f"?pin={urllib.parse.quote(pin)}" if pin else "")
        log.info("Enviando %d item(ns) para %s (%s)", len(itens), alias, ip)
        if progresso:
            print(f"Aguardando {alias} aceitar…", file=sys.stderr)
        if ao_aguardar:
            ao_aguardar(alias)
        status, corpo = self.requisitar(ip, porta, proto, "POST", rota,
                                        {"info": self.info(), "files": arquivos}, fp=fp, timeout=300)
        if status == 204:
            return alias, len(itens)
        mensagens = {401: f"{alias} pede PIN (use --pin)" if not pin else "PIN errado",
                     403: f"{alias} recusou o envio", 409: f"{alias} está ocupado com outra transferência",
                     429: "Muitas tentativas; espere um pouco"}
        if status != 200:
            raise Erro(mensagens.get(status, f"{alias} respondeu com erro {status}"))
        resposta = json.loads(corpo)
        sessao, tokens = resposta["sessionId"], resposta.get("files") or {}
        enviados = 0
        try:
            for fid, token in tokens.items():
                if fid in por_id:
                    self._subir(ip, porta, proto, fp, sessao, fid, token, por_id[fid], progresso)
                    enviados += 1
        except BaseException:
            with contextlib.suppress(Exception):
                self.requisitar(ip, porta, proto, "POST", f"/cancel?sessionId={urllib.parse.quote(sessao)}", fp=fp)
            raise
        return alias, enviados

    def _subir(self, ip, porta, proto, fp, sessao, fid, token, item, progresso) -> None:
        q = urllib.parse.urlencode({"sessionId": sessao, "fileId": fid, "token": token})
        conn = self.conectar(ip, porta, proto, fp, timeout=60)
        try:
            conn.putrequest("POST", f"{API}/upload?{q}")
            conn.putheader("Content-Type", "application/octet-stream")
            conn.putheader("Content-Length", str(item["tamanho"]))
            conn.endheaders()
            inicio, feito = time.time(), 0
            fonte = open(item["caminho"], "rb") if "caminho" in item else None
            try:
                while True:
                    if fonte:
                        bloco = fonte.read(PEDACO)
                    else:
                        bloco = item["dados"][feito:feito + PEDACO]
                    if not bloco:
                        break
                    conn.send(bloco)
                    feito += len(bloco)
                    if progresso and item["tamanho"]:
                        vel = feito / max(time.time() - inicio, 0.001)
                        pct = feito * 100 // item["tamanho"]
                        print(f"\r  {item['nome'][:40]:40} {pct:3d}%  {tamanho_legivel(vel)}/s",
                              end="", file=sys.stderr)
            finally:
                if fonte:
                    fonte.close()
            if progresso:
                print(file=sys.stderr)
            r = conn.getresponse()
            r.read()
            if r.status != 200:
                raise Erro(f"Falha ao enviar {item['nome']} (erro {r.status})")
        finally:
            conn.close()

    # --- recebimento (chamado pelo servidor HTTP) ---

    def ao_registrar(self, info: dict, ip: str) -> dict:
        fp = info.get("fingerprint")
        if fp and fp != self.fp:
            self.registro.visto(fp, info, ip)
        return self.info(rede=False)

    def _identidade_confere(self, ip: str, info: dict) -> bool:
        """Confere se quem diz ser um aparelho de confiança tem mesmo o certificado dele.

        Não conseguimos validar o certificado de cliente (o Python não aceita
        certificados autoassinados desconhecidos), então ligamos de volta para o
        servidor do aparelho, que usa o mesmo certificado, e comparamos.
        """
        fp = info.get("fingerprint", "")
        if info.get("protocol") == "http":
            return True
        try:
            conn = self.conectar(ip, int(info.get("port", PORTA_PADRAO)), "https", fp, timeout=3)
            conn.close()
            return True
        except (OSError, ssl.SSLError, Erro, ValueError):
            return False

    def ao_preparar(self, corpo: dict, ip: str, pin: str | None) -> tuple[int, dict | None]:
        info, arquivos = corpo.get("info"), corpo.get("files")
        if not isinstance(info, dict) or not isinstance(arquivos, dict) or not arquivos:
            return 400, {"message": "Corpo inválido"}
        for fid, meta in arquivos.items():
            if not isinstance(meta, dict) or not isinstance(meta.get("fileName"), str) \
                    or not isinstance(meta.get("size"), int):
                return 400, {"message": f"Arquivo inválido: {fid}"}
        fp = info.get("fingerprint") or ""
        alias = str(info.get("alias") or ip)[:60]
        if fp == self.fp:
            return 400, {"message": "Falando sozinho"}
        self.registro.visto(fp, info, ip)

        confiavel = self.registro.confiavel(fp) and self._identidade_confere(ip, info)
        if not confiavel and self.config.get("pin") and pin != str(self.config["pin"]):
            return 401, {"message": "PIN necessário"}

        with self._trava:
            s = self.sessao
            if s and s["ip"] != ip and not s["terminada"] and time.time() - s["atividade"] < 120:
                return 409, {"message": "Ocupado com outra transferência"}

        unico = next(iter(arquivos.values()))
        mensagem = (len(arquivos) == 1 and str(unico.get("fileType", "")).startswith("text/")
                    and isinstance(unico.get("preview"), str))

        if not confiavel:
            if not self._trava_pergunta.acquire(blocking=False):
                return 409, {"message": "Já há um pedido esperando resposta"}
            try:
                if mensagem:
                    resposta = self.desktop.perguntar(f"{alias} quer enviar um texto",
                                                      unico["preview"][:300])
                else:
                    total = sum(m["size"] for m in arquivos.values())
                    nomes = "\n".join(m["fileName"] for m in list(arquivos.values())[:5])
                    if len(arquivos) > 5:
                        nomes += f"\n… e mais {len(arquivos) - 5}"
                    resposta = self.desktop.perguntar(
                        f"{alias} quer enviar {len(arquivos)} arquivo(s), {tamanho_legivel(total)}", nomes)
            finally:
                self._trava_pergunta.release()
            if resposta is None:
                return 403, {"message": "Recusado"}
            if resposta == "sempre":
                self.registro.marcar(fp, True)

        if mensagem:
            try:
                self.desktop.copiar_texto(unico["preview"])
                trecho = unico["preview"][:200]
                self.desktop.notificar(f"Texto de {alias} copiado", trecho)
            except Erro as e:
                self.desktop.notificar("Ponte: não deu para copiar", str(e))
                return 500, {"message": str(e)}
            return 204, None

        sessao = {
            "id": secrets.token_urlsafe(16), "ip": ip, "alias": alias,
            "arquivos": {fid: {"meta": m, "token": secrets.token_urlsafe(16), "estado": "pendente",
                               "destino": None} for fid, m in arquivos.items()},
            "atividade": time.time(), "terminada": False,
        }
        with self._trava:
            self.sessao = sessao
        return 200, {"sessionId": sessao["id"],
                     "files": {fid: a["token"] for fid, a in sessao["arquivos"].items()}}

    def validar_envio(self, sid: str, fid: str, token: str, ip: str) -> dict | None:
        with self._trava:
            s = self.sessao
            if not s or s["id"] != sid or s["ip"] != ip or s["terminada"]:
                return None
            a = s["arquivos"].get(fid)
            if not a or not secrets.compare_digest(a["token"], token) or a["estado"] != "pendente":
                return None
            a["estado"] = "recebendo"
            s["atividade"] = time.time()
            return a

    def receber_arquivo(self, sid: str, a: dict, pedacos) -> int:
        """Grava o arquivo. Devolve o código HTTP."""
        meta = a["meta"]
        self.pasta.mkdir(parents=True, exist_ok=True)
        destino = caminho_seguro(self.pasta, meta["fileName"])
        destino.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(prefix=".ponte-", suffix=".parte", dir=destino.parent)
        hasher = hashlib.sha256() if meta.get("sha256") else None
        try:
            with os.fdopen(fd, "wb") as f:
                for bloco in pedacos:
                    f.write(bloco)
                    if hasher:
                        hasher.update(bloco)
                    self.sessao_ativa(sid)
            if hasher and hasher.hexdigest().lower() != str(meta["sha256"]).lower():
                os.unlink(tmp)
                a["estado"] = "erro"
                return 422
            with self._trava:
                final = nome_livre(destino)
                os.replace(tmp, final)
            mod = ler_iso((meta.get("metadata") or {}).get("modified"))
            if mod:
                with contextlib.suppress(OSError):
                    os.utime(final, (time.time(), mod))
        except BaseException:
            with contextlib.suppress(OSError):
                os.unlink(tmp)
            a["estado"] = "erro"
            raise
        a["estado"], a["destino"] = "ok", final
        self._talvez_terminar(sid)
        return 200

    def sessao_ativa(self, sid: str) -> None:
        s = self.sessao
        if s and s["id"] == sid:
            s["atividade"] = time.time()

    def _talvez_terminar(self, sid: str) -> None:
        with self._trava:
            s = self.sessao
            if not s or s["id"] != sid or s["terminada"]:
                return
            if any(a["estado"] in ("pendente", "recebendo") for a in s["arquivos"].values()):
                return
            s["terminada"] = True
        ok = [a for a in s["arquivos"].values() if a["estado"] == "ok"]
        erros = len(s["arquivos"]) - len(ok)
        if not ok:
            self.desktop.notificar(f"Falha ao receber de {s['alias']}", f"{erros} arquivo(s) com erro")
            return
        tipo = ok[0]["meta"].get("fileType", "")
        if len(ok) == 1 and tipo.startswith("image/") and self.config.get("copiar_imagens"):
            with contextlib.suppress(Erro, OSError, subprocess.SubprocessError):
                self.desktop.copiar_imagem(ok[0]["destino"], tipo)
        if len(ok) == 1:
            titulo = f"{ok[0]['destino'].name} recebido de {s['alias']}"
        else:
            titulo = f"{len(ok)} arquivos recebidos de {s['alias']}"
        corpo = f"Salvo em {self.pasta}" + (f"\n{erros} com erro" if erros else "")
        self.desktop.notificar(titulo, corpo, pasta=self.pasta)

    def ao_cancelar(self, sid: str, ip: str) -> int:
        with self._trava:
            s = self.sessao
            if not s or s["id"] != sid or s["ip"] != ip:
                return 403
            s["terminada"] = True
            self.sessao = None
        self.desktop.notificar(f"{s['alias']} cancelou o envio")
        return 200

    # --- servidor ---

    def iniciar_servidor(self, multicast: bool = True) -> None:
        try:
            self.servidor_http = ServidorHTTPS(self)
        except OSError as e:
            raise Erro(f"Não consegui usar a porta {self.porta} ({e.strerror}). O LocalSend "
                       "oficial ou outra Ponte já está aberto neste PC? Feche-o e tente de novo.") from e
        threading.Thread(target=self.servidor_http.serve_forever, daemon=True).start()
        if multicast:
            threading.Thread(target=self._escutar_multicast, daemon=True).start()
            threading.Thread(target=self._anunciar_inicio, daemon=True).start()

    def parar_servidor(self) -> None:
        if self.servidor_http:
            self.servidor_http.shutdown()
            self.servidor_http.server_close()

    def _anunciar_inicio(self) -> None:
        for espera in (0.2, 2, 5):
            time.sleep(espera)
            self.anunciar()
        # Depois, repete de tempos em tempos: o celular que abrir o LocalSend
        # mais tarde vê o PC em segundos, mesmo se o anúncio dele se perder no Wi-Fi.
        while True:
            time.sleep(INTERVALO_ANUNCIO)
            self.anunciar()

    def _escutar_multicast(self) -> None:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        with contextlib.suppress(AttributeError, OSError):
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        try:
            s.bind(("", self.porta))
        except OSError as e:
            log.error("Multicast indisponível (%s): só a varredura da rede vai funcionar", e)
            return
        s.settimeout(30)
        inscritas: set[str] = set()
        ultima = 0.0
        while True:
            if time.time() - ultima > 30:  # Wi-Fi pode reconectar com outro IP
                ultima = time.time()
                for ip in [str(r.ip) for r in redes_locais()] or ["0.0.0.0"]:
                    if ip in inscritas:
                        continue
                    try:
                        mreq = socket.inet_aton(GRUPO_MULTICAST) + socket.inet_aton(ip)
                        s.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
                        inscritas.add(ip)
                        log.debug("Ouvindo multicast em %s", ip)
                    except OSError as e:
                        log.debug("Não entrou no grupo multicast em %s: %s", ip, e)
            try:
                dados, (ip, _) = s.recvfrom(65535)
            except socket.timeout:
                continue
            except OSError:
                time.sleep(1)
                continue
            try:
                msg = json.loads(dados)
            except ValueError:
                continue
            fp = msg.get("fingerprint")
            if not isinstance(msg, dict) or not fp or fp == self.fp:
                continue
            self.registro.visto(fp, msg, ip)
            if msg.get("announce") or msg.get("announcement"):
                log.info("%s (%s) apareceu na rede", msg.get("alias"), ip)
                threading.Thread(target=self._responder_anuncio, args=(ip, msg), daemon=True).start()

    def _responder_anuncio(self, ip: str, msg: dict) -> None:
        proto = "http" if msg.get("protocol") == "http" else "https"
        if self.registrar_em(ip, int(msg.get("port", PORTA_PADRAO)), proto) is None:
            self.anunciar(anuncio=False)


class ServidorHTTPS(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 32

    def __init__(self, app: Ponte):
        self.app = app
        super().__init__(("0.0.0.0", app.porta), Manipulador)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(app.cert, app.chave)
        # O aperto de mão TLS acontece na thread de cada conexão (ver Manipulador.setup).
        self.socket = ctx.wrap_socket(self.socket, server_side=True, do_handshake_on_connect=False)

    def handle_error(self, request, client_address):
        log.debug("Conexão de %s falhou: %s", client_address[0], sys.exc_info()[1])


class Manipulador(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = f"Ponte/{VERSAO}"
    server: ServidorHTTPS

    def setup(self):
        self.request.settimeout(60)
        self.request.do_handshake()
        super().setup()

    def log_message(self, formato, *args):
        log.debug("%s %s", self.client_address[0], formato % args)

    @property
    def app(self) -> Ponte:
        return self.server.app

    def _responder(self, status: int, corpo: dict | None = None, fechar: bool = False) -> None:
        dados = json.dumps(corpo).encode() if corpo is not None else b""
        self.send_response(status)
        if corpo is not None:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        if fechar:
            self.send_header("Connection", "close")
            self.close_connection = True
        self.end_headers()
        if dados:
            self.wfile.write(dados)

    def _pedacos(self):
        """Lê o corpo aos pedaços (Content-Length ou chunked)."""
        if "chunked" in self.headers.get("Transfer-Encoding", "").lower():
            while True:
                linha = self.rfile.readline(1024)
                tamanho = int(linha.split(b";")[0].strip() or b"0", 16)
                if tamanho == 0:
                    while self.rfile.readline(1024) not in (b"\r\n", b"\n", b""):
                        pass
                    return
                restante = tamanho
                while restante:
                    bloco = self.rfile.read(min(PEDACO, restante))
                    if not bloco:
                        raise ConnectionError("conexão caiu")
                    restante -= len(bloco)
                    yield bloco
                self.rfile.readline(1024)
        else:
            restante = int(self.headers.get("Content-Length") or 0)
            while restante:
                bloco = self.rfile.read(min(PEDACO, restante))
                if not bloco:
                    raise ConnectionError("conexão caiu")
                restante -= len(bloco)
                yield bloco

    def _json(self):
        dados = bytearray()
        for bloco in self._pedacos():
            dados += bloco
            if len(dados) > MAX_JSON:
                raise ValueError("corpo grande demais")
        return json.loads(dados or b"{}")

    def _rota(self):
        u = urllib.parse.urlsplit(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        rota = u.path
        for prefixo in (API, "/api/localsend/v1"):
            if rota.startswith(prefixo):
                return rota[len(prefixo):], q
        return None, q

    def do_GET(self):
        rota, _ = self._rota()
        if rota == "/info":
            self._responder(200, self.app.info(rede=False))
        else:
            self._responder(404, {"message": "Não encontrado"})

    def do_POST(self):
        rota, q = self._rota()
        ip = self.client_address[0]
        try:
            if rota == "/register":
                self._responder(200, self.app.ao_registrar(self._json(), ip))
            elif rota == "/prepare-upload":
                status, corpo = self.app.ao_preparar(self._json(), ip, q.get("pin"))
                self._responder(status, corpo)
            elif rota == "/upload":
                self._upload(q, ip)
            elif rota == "/cancel":
                for _ in self._pedacos():
                    pass
                self._responder(self.app.ao_cancelar(q.get("sessionId", ""), ip))
            else:
                self._responder(404, {"message": "Não encontrado"}, fechar=True)
        except (ValueError, KeyError, TypeError) as e:
            self._responder(400, {"message": f"Pedido inválido: {e}"}, fechar=True)

    def _upload(self, q: dict, ip: str) -> None:
        sid, fid, token = q.get("sessionId"), q.get("fileId"), q.get("token")
        if not (sid and fid and token):
            self._responder(400, {"message": "Faltam parâmetros"}, fechar=True)
            return
        a = self.app.validar_envio(sid, fid, token, ip)
        if a is None:
            self._responder(403, {"message": "Token ou IP inválido"}, fechar=True)
            return
        try:
            status = self.app.receber_arquivo(sid, a, self._pedacos())
        except (OSError, ConnectionError, ValueError) as e:
            log.warning("Falha ao receber %s: %s", a["meta"].get("fileName"), e)
            self.app._talvez_terminar(sid)
            with contextlib.suppress(OSError):
                self._responder(500, {"message": str(e)}, fechar=True)
            return
        if status != 200:
            self.app._talvez_terminar(sid)
        self._responder(status, None if status == 200 else {"message": "Checksum não confere"})


# --------------------------------------------------------------------------
# Itens para enviar
# --------------------------------------------------------------------------


def item_texto(texto: str) -> dict:
    dados = texto.encode("utf-8")
    fid = uuid.uuid4()
    return {"nome": f"{fid}.txt", "tamanho": len(dados), "tipo": "text/plain", "dados": dados,
            "preview": texto if len(dados) <= MAX_MENSAGEM else None}


def itens_de_caminhos(caminhos: list[str]) -> list[dict]:
    itens = []
    for c in caminhos:
        p = Path(c).expanduser()
        if p.is_dir():
            for raiz, _, nomes in os.walk(p):
                for n in sorted(nomes):
                    arq = Path(raiz) / n
                    rel = arq.relative_to(p.parent).as_posix()
                    itens.append(_item_arquivo(arq, rel))
        elif p.is_file():
            itens.append(_item_arquivo(p, p.name))
        else:
            raise Erro(f"Arquivo não encontrado: {c}")
    return itens


def _item_arquivo(p: Path, nome: str) -> dict:
    st = p.stat()
    tipo = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    return {"nome": nome, "tamanho": st.st_size, "tipo": tipo, "caminho": p, "modificado": st.st_mtime}


def itens_da_area(desktop: Desktop) -> list[dict]:
    """O que está copiado no PC: arquivos (do Dolphin etc.), imagem ou texto."""
    tipos = desktop.tipos_copiados()
    if not tipos:
        raise Erro("A área de transferência está vazia.")
    for tipo_lista in ("text/uri-list", "x-special/gnome-copied-files"):
        if tipo_lista in tipos:
            texto = desktop.ler_copiado(tipo_lista).decode("utf-8", "replace")
            caminhos = [urllib.parse.unquote(urllib.parse.urlsplit(l.strip()).path)
                        for l in texto.splitlines() if l.strip().startswith("file://")]
            if caminhos:
                return itens_de_caminhos(caminhos)
    imagens = [t for t in tipos if t.startswith("image/")]
    textos = [t for t in tipos if t.startswith("text/plain") or t in ("UTF8_STRING", "STRING", "TEXT")]
    if imagens and not textos:
        tipo = "image/png" if "image/png" in imagens else imagens[0]
        dados = desktop.ler_copiado(tipo)
        ext = mimetypes.guess_extension(tipo) or ".png"
        nome = time.strftime("imagem-%Y%m%d-%H%M%S") + ext
        return [{"nome": nome, "tamanho": len(dados), "tipo": tipo, "dados": dados}]
    if textos:
        preferido = next((t for t in ("text/plain;charset=utf-8", "UTF8_STRING", "text/plain") if t in tipos), textos[0])
        texto = desktop.ler_copiado(preferido).decode("utf-8", "replace")
        if texto:
            return [item_texto(texto)]
    raise Erro("Não sei enviar o que está copiado (tipos: " + ", ".join(tipos[:5]) + ").")


# --------------------------------------------------------------------------
# Linha de comando
# --------------------------------------------------------------------------


def diretorios() -> tuple[Path, Path]:
    base = os.environ.get("PONTE_HOME")
    if base:
        return Path(base) / "config", Path(base) / "dados"
    conf = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config") / "ponte"
    dados = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local/share") / "ponte"
    return conf, dados


def configurar_log(dir_dados: Path, detalhado: bool, arquivo: bool) -> None:
    log.setLevel(logging.DEBUG if detalhado else logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S")
    tela = logging.StreamHandler(sys.stderr)
    tela.setFormatter(fmt)
    log.addHandler(tela)
    if arquivo:
        dir_dados.mkdir(parents=True, exist_ok=True)
        h = logging.handlers.RotatingFileHandler(dir_dados / "ponte.log", maxBytes=1_000_000, backupCount=1)
        h.setFormatter(fmt)
        log.addHandler(h)


def cmd_servidor(app: Ponte, args) -> int:
    app.iniciar_servidor()
    print(f"Ponte {VERSAO} ligada como \"{app.config['nome']}\" na porta {app.porta}.", file=sys.stderr)
    print(f"Arquivos vão para {app.pasta}. Ctrl+C para sair.", file=sys.stderr)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        app.parar_servidor()
    return 0


def _resultado_envio(app: Ponte, args, itens: list[dict]) -> int:
    """Envia e avisa: no terminal por texto; pelo atalho ou Dolphin, por notificação."""
    interativo = sys.stderr.isatty()
    eh_texto = len(itens) == 1 and itens[0].get("preview") is not None
    aviso: list[str | None] = [None]

    def ao_aguardar(alias):
        if interativo:
            return
        o_que = "texto" if eh_texto else f"{len(itens)} arquivo(s)"
        aviso[0] = app.desktop.notificar(f"Enviando {o_que} para {alias}…",
                                         "Se o celular pedir, toque em Aceitar no LocalSend.")

    def avisar(titulo, corpo=""):
        if interativo:
            print(f"{titulo}{': ' + corpo if corpo else ''}", file=sys.stderr)
        else:
            app.desktop.notificar(titulo, corpo, substituir=aviso[0])

    try:
        alias, n = app.enviar(itens, args.para, args.pin, progresso=interativo, ao_aguardar=ao_aguardar)
    except Erro as e:
        log.warning("Não enviado: %s", e)
        avisar("Ponte: não enviado", str(e))
        return 1
    except (OSError, ssl.SSLError, http.client.HTTPException) as e:
        log.warning("Não enviado (conexão): %s", e)
        avisar("Ponte: não enviado", f"Falha de conexão: {e}")
        return 1
    if eh_texto:
        avisar(f"Texto enviado para {alias}", "No celular, toque em Copiar na janela do LocalSend.")
    else:
        avisar(f"{n} arquivo(s) enviado(s) para {alias}")
    log.info("Envio para %s concluído", alias)
    return 0


def servidor_ligado(app: Ponte) -> bool:
    try:
        status, corpo = app.requisitar("127.0.0.1", app.porta, "https", "GET", "/info", timeout=2)
        return status == 200 and json.loads(corpo).get("fingerprint") == app.fp
    except (OSError, ssl.SSLError, http.client.HTTPException, ValueError, Erro):
        return False


def cmd_abrir(app: Ponte, args) -> int:
    """O que roda ao clicar em "Ponte" no menu: liga se preciso e mostra como está."""
    ligado = servidor_ligado(app)
    if not ligado:
        subprocess.Popen([sys.executable, os.path.abspath(sys.argv[0]), "servidor"],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
        for _ in range(20):
            time.sleep(0.25)
            if servidor_ligado(app):
                ligado = True
                break
    todos = app.registro.todos().values()
    confiaveis = [d.get("alias", "?") for d in todos if d.get("confiavel")]
    linhas = [f"Aparece no celular como \"{app.config['nome']}\".",
              "De confiança: " + (", ".join(confiaveis) if confiaveis else "nenhum ainda"),
              f"Arquivos recebidos vão para {app.pasta}"]
    if ligado:
        app.desktop.notificar("Ponte ligada", "\n".join(linhas))
    else:
        app.desktop.notificar("A Ponte não conseguiu ligar",
                              f"Veja o motivo em {app.dir_dados / 'ponte.log'}. O LocalSend oficial "
                              "aberto no PC usa a mesma porta.")
    if sys.stderr.isatty():
        print(("Ponte ligada.\n" if ligado else "A Ponte não ligou.\n") + "\n".join(linhas), file=sys.stderr)
    return 0 if ligado else 1


def cmd_enviar(app, args):
    return _resultado_envio(app, args, itens_de_caminhos(args.arquivos))


def cmd_texto(app, args):
    texto = " ".join(args.texto) if args.texto else sys.stdin.read()
    return _resultado_envio(app, args, [item_texto(texto)])


def cmd_clipboard(app, args):
    try:
        itens = itens_da_area(app.desktop)
    except Erro as e:
        print(f"Erro: {e}", file=sys.stderr) if sys.stderr.isatty() else app.desktop.notificar("Ponte", str(e))
        return 1
    return _resultado_envio(app, args, itens)


def _listar(app: Ponte) -> None:
    todos = sorted(app.registro.todos().items(), key=lambda kv: -kv[1].get("visto", 0))
    if not todos:
        print("Nenhum aparelho conhecido ainda. Abra o LocalSend no celular e rode: ponte procurar")
        return
    for fp, d in todos:
        minutos = int((time.time() - d.get("visto", 0)) / 60)
        quando = "agora" if minutos < 2 else f"há {minutos} min" if minutos < 120 else f"há {minutos // 60} h"
        marca = "★ confiança" if d.get("confiavel") else "  —"
        print(f"{marca:12} {d.get('alias', '?'):24} {d.get('modelo') or '':12} {d.get('ip', ''):15} "
              f"visto {quando}  [{fp[:8]}]")


def cmd_dispositivos(app, args):
    _listar(app)
    return 0


def cmd_adicionar(app, args):
    """Adiciona um aparelho pelo IP (ex.: IP do Tailscale, quando não há rede local em comum)."""
    ip, _, porta = args.ip.partition(":")
    info = app.registrar_em(ip, int(porta or app.porta), timeout=8)
    if not info:
        print(f"Erro: ninguém respondeu em {args.ip}. O LocalSend está aberto no aparelho "
              "e, se for pelo Tailscale, o Tailscale está ligado nos dois?", file=sys.stderr)
        return 1
    print(f"{info.get('alias')} adicionado ({ip}).")
    return 0


def cmd_procurar(app, args):
    print("Procurando aparelhos com o LocalSend aberto…", file=sys.stderr)
    app.anunciar()
    time.sleep(2)
    n = app.varrer_rede()
    print(f"Varredura da rede: {n} encontrado(s).\n", file=sys.stderr)
    _listar(app)
    return 0


def _um(app: Ponte, nome: str) -> tuple[str, dict]:
    achados = app.registro.procurar(nome)
    if not achados:
        raise Erro(f'Nenhum aparelho com "{nome}". Veja: ponte dispositivos')
    if len(achados) > 1 and achados[0][1].get("alias", "").casefold() != nome.casefold():
        raise Erro("Mais de um aparelho: " + ", ".join(d["alias"] for _, d in achados))
    return achados[0]


def cmd_confiar(app, args):
    fp, d = _um(app, args.nome)
    app.registro.marcar(fp, True)
    print(f"{d['alias']} agora é de confiança: arquivos e textos dele entram sem perguntar.")
    return 0


def cmd_desconfiar(app, args):
    fp, d = _um(app, args.nome)
    app.registro.marcar(fp, False)
    print(f"{d['alias']} volta a precisar de confirmação.")
    return 0


def cmd_config(app, args):
    print(app.dir_config / "config.toml")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="ponte", description="Lado do PC para o LocalSend: "
                                "textos direto na área de transferência e arquivos sem perguntar.")
    p.add_argument("--versao", action="version", version=f"Ponte {VERSAO}")
    p.add_argument("-v", "--detalhado", action="store_true", help="mostra mensagens de depuração")
    sub = p.add_subparsers(dest="comando", required=True, metavar="COMANDO")

    def com_destino(sp):
        sp.add_argument("-p", "--para", help="nome do aparelho (parte do nome basta)")
        sp.add_argument("--pin", help="PIN, se o celular pedir")
        return sp

    sub.add_parser("servidor", help="fica ligado recebendo (o instalador inicia sozinho)").set_defaults(f=cmd_servidor)
    sub.add_parser("abrir", help="liga a Ponte se estiver desligada e mostra o estado").set_defaults(f=cmd_abrir)
    sp = com_destino(sub.add_parser("enviar", help="envia arquivos ou pastas"))
    sp.add_argument("arquivos", nargs="+")
    sp.set_defaults(f=cmd_enviar)
    sp = com_destino(sub.add_parser("texto", help="envia um texto (ou o que vier da entrada padrão)"))
    sp.add_argument("texto", nargs="*")
    sp.set_defaults(f=cmd_texto)
    com_destino(sub.add_parser("clipboard", help="envia o que está copiado (bom para atalho de teclado)")
                ).set_defaults(f=cmd_clipboard)
    sub.add_parser("dispositivos", help="lista os aparelhos conhecidos").set_defaults(f=cmd_dispositivos)
    sub.add_parser("procurar", help="procura aparelhos na rede").set_defaults(f=cmd_procurar)
    sp = sub.add_parser("adicionar", help="adiciona um aparelho pelo IP (ex.: IP do Tailscale)")
    sp.add_argument("ip", help="IP do aparelho, opcionalmente com :porta")
    sp.set_defaults(f=cmd_adicionar)
    sp = sub.add_parser("confiar", help="aceita sempre um aparelho")
    sp.add_argument("nome")
    sp.set_defaults(f=cmd_confiar)
    sp = sub.add_parser("desconfiar", help="volta a perguntar para um aparelho")
    sp.add_argument("nome")
    sp.set_defaults(f=cmd_desconfiar)
    sub.add_parser("config", help="mostra onde fica o arquivo de configuração").set_defaults(f=cmd_config)

    args = p.parse_args(argv)
    dir_config, dir_dados = diretorios()
    configurar_log(dir_dados, args.detalhado, arquivo=True)
    try:
        app = Ponte(dir_config, dir_dados)
        return args.f(app, args)
    except Erro as e:
        print(f"Erro: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
