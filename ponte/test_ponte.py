"""Testes da Ponte: dois aparelhos na mesma máquina conversando pelo protocolo LocalSend.

Rodar: python3 -m unittest -v test_ponte.py   (dentro da pasta ponte/)
"""

import hashlib
import json
import ssl
import tempfile
import threading
import time
import unittest
from pathlib import Path

import ponte


class DesktopFalso(ponte.Desktop):
    def __init__(self, resposta="aceitar"):
        self.resposta = resposta
        self.copiado = None
        self.imagem = None
        self.avisos = []
        self.perguntas = []

    def copiar_texto(self, texto):
        self.copiado = texto

    def copiar_imagem(self, caminho, tipo):
        self.imagem = (caminho, tipo)

    def notificar(self, titulo, corpo="", pasta=None, substituir=None):
        self.avisos.append(titulo)
        return str(len(self.avisos))

    def perguntar(self, titulo, corpo):
        self.perguntas.append(titulo)
        return self.resposta


PORTA = [53500]


def novo_aparelho(nome, tmp, resposta="aceitar", **ajustes):
    PORTA[0] += 1
    base = Path(tmp) / nome
    desk = DesktopFalso(resposta)
    app = ponte.Ponte(base / "config", base / "dados", desk,
                      {"nome": nome, "porta": PORTA[0], "pasta": str(base / "Recebidos"), **ajustes})
    app.iniciar_servidor(multicast=False)
    return app


class TesteProtocolo(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = self._tmp.name
        self.pc = novo_aparelho("PC", self.tmp)
        self.cel = novo_aparelho("Honor", self.tmp)
        # Descoberta pelo /register (o mesmo plano B que a varredura da rede usa).
        self.assertIsNotNone(self.pc.registrar_em("127.0.0.1", self.cel.porta))
        self.assertIsNotNone(self.cel.registrar_em("127.0.0.1", self.pc.porta))

    def tearDown(self):
        self.pc.parar_servidor()
        self.cel.parar_servidor()
        self._tmp.cleanup()

    def test_impressao_digital_e_registro(self):
        der = ssl.PEM_cert_to_DER_cert(self.pc.cert.read_text())
        self.assertEqual(self.pc.fp, hashlib.sha256(der).hexdigest().upper())
        self.assertEqual(len(self.pc.fp), 64)
        conhecido = self.cel.registro.todos()[self.pc.fp]
        self.assertEqual(conhecido["alias"], "PC")
        self.assertEqual(conhecido["porta"], self.pc.porta)
        self.assertEqual(self.pc.registro.todos()[self.cel.fp]["alias"], "Honor")

    def test_comando_adicionar_por_ip(self):
        novo = novo_aparelho("Samsung A54", self.tmp)
        try:
            args = type("A", (), {"ip": f"127.0.0.1:{novo.porta}"})()
            self.assertEqual(ponte.cmd_adicionar(self.pc, args), 0)
            self.assertEqual(self.pc.registro.procurar("samsung")[0][0], novo.fp)
            args.ip = "127.0.0.1:1"
            self.assertEqual(ponte.cmd_adicionar(self.pc, args), 1)
        finally:
            novo.parar_servidor()

    def test_servidor_ligado(self):
        self.assertTrue(ponte.servidor_ligado(self.pc))
        self.pc.parar_servidor()
        self.assertFalse(ponte.servidor_ligado(self.pc))
        self.pc.iniciar_servidor(multicast=False)

    def test_avisos_de_envio_sem_terminal(self):
        """Pelo atalho ou Dolphin (sem terminal): avisa ao começar e ao terminar, no mesmo aviso."""
        self.cel.registro.marcar(self.pc.fp, True)
        args = type("A", (), {"para": "Honor", "pin": None})()
        import sys, io
        antigo = sys.stderr
        sys.stderr = io.StringIO()  # não é terminal
        try:
            self.assertEqual(ponte._resultado_envio(self.pc, args, [ponte.item_texto("oi")]), 0)
            args.para = "ninguem"
            self.pc.descobrir = lambda espera=0: None
            self.assertEqual(ponte._resultado_envio(self.pc, args, [ponte.item_texto("oi")]), 1)
        finally:
            sys.stderr = antigo
        avisos = self.pc.desktop.avisos
        self.assertEqual(avisos[0], "Enviando texto para Honor…")
        self.assertEqual(avisos[1], "Texto enviado para Honor")
        self.assertEqual(avisos[2], "Ponte: não enviado")

    def test_texto_de_confianca_vai_direto_para_area(self):
        self.pc.registro.marcar(self.cel.fp, True)
        alias, n = self.cel.enviar([ponte.item_texto("olá, área de transferência")], para="PC")
        self.assertEqual((alias, n), ("PC", 1))
        self.assertEqual(self.pc.desktop.copiado, "olá, área de transferência")
        self.assertEqual(self.pc.desktop.perguntas, [])

    def test_desconhecido_recusado(self):
        self.pc.desktop.resposta = None
        with self.assertRaisesRegex(ponte.Erro, "recusou"):
            self.cel.enviar([ponte.item_texto("oi")], para="PC")
        self.assertIsNone(self.pc.desktop.copiado)
        self.assertEqual(len(self.pc.desktop.perguntas), 1)

    def test_sempre_deste_aparelho_marca_confianca(self):
        self.pc.desktop.resposta = "sempre"
        self.cel.enviar([ponte.item_texto("primeiro")], para="PC")
        self.assertTrue(self.pc.registro.confiavel(self.cel.fp))
        self.cel.enviar([ponte.item_texto("segundo")], para="PC")
        self.assertEqual(self.pc.desktop.copiado, "segundo")
        self.assertEqual(len(self.pc.desktop.perguntas), 1)

    def test_arquivos_e_pastas(self):
        self.pc.registro.marcar(self.cel.fp, True)
        origem = Path(self.tmp) / "origem"
        (origem / "album" / "sub").mkdir(parents=True)
        (origem / "album" / "a.jpg").write_bytes(b"\xff\xd8" + b"x" * 700_000)
        (origem / "album" / "sub" / "b.txt").write_text("texto do b")
        (origem / "solto.pdf").write_bytes(b"%PDF-1.4 teste")
        itens = ponte.itens_de_caminhos([str(origem / "album"), str(origem / "solto.pdf")])
        alias, n = self.cel.enviar(itens, para="PC")
        self.assertEqual(n, 3)
        rec = self.pc.pasta
        self.assertEqual((rec / "album" / "a.jpg").read_bytes(), (origem / "album" / "a.jpg").read_bytes())
        self.assertEqual((rec / "album" / "sub" / "b.txt").read_text(), "texto do b")
        self.assertEqual((rec / "solto.pdf").read_bytes(), b"%PDF-1.4 teste")
        # Data de modificação preservada
        self.assertAlmostEqual((rec / "solto.pdf").stat().st_mtime, (origem / "solto.pdf").stat().st_mtime, delta=1)
        self.assertIn("3 arquivos recebidos de Honor", self.pc.desktop.avisos)
        self.assertEqual(list(rec.rglob(".ponte-*")), [])  # sem arquivos temporários

        # De novo: não sobrescreve
        self.cel.enviar(ponte.itens_de_caminhos([str(origem / "solto.pdf")]), para="PC")
        self.assertTrue((rec / "solto (1).pdf").exists())

    def test_imagem_unica_vai_para_area(self):
        self.pc.registro.marcar(self.cel.fp, True)
        img = Path(self.tmp) / "print.png"
        img.write_bytes(b"\x89PNG\r\n\x1a\nfalso")
        self.cel.enviar(ponte.itens_de_caminhos([str(img)]), para="PC")
        caminho, tipo = self.pc.desktop.imagem
        self.assertEqual(tipo, "image/png")
        self.assertEqual(caminho.read_bytes(), img.read_bytes())

    def test_texto_grande_vira_arquivo(self):
        self.pc.registro.marcar(self.cel.fp, True)
        grande = "a" * (ponte.MAX_MENSAGEM + 10)
        item = ponte.item_texto(grande)
        self.assertIsNone(item["preview"])
        self.cel.enviar([item], para="PC")
        self.assertIsNone(self.pc.desktop.copiado)
        self.assertEqual(next(self.pc.pasta.glob("*.txt")).read_text(), grande)

    def test_envio_do_pc_para_celular(self):
        self.cel.desktop.resposta = "aceitar"
        alias, _ = self.pc.enviar([ponte.item_texto("do PC")], para="hon")  # parte do nome
        self.assertEqual(alias, "Honor")
        self.assertEqual(self.cel.desktop.copiado, "do PC")

    def test_pin_para_desconhecido(self):
        self.pc.config["pin"] = "4321"
        with self.assertRaisesRegex(ponte.Erro, "PIN"):
            self.cel.enviar([ponte.item_texto("x")], para="PC")
        self.cel.enviar([ponte.item_texto("x")], para="PC", pin="4321")
        self.assertEqual(self.pc.desktop.copiado, "x")

    def test_confianca_falsificada_e_detectada(self):
        """Alguém diz ser o Honor (mesma impressão digital), mas não tem o certificado dele."""
        self.pc.registro.marcar(self.cel.fp, True)
        impostor = novo_aparelho("Impostor", self.tmp)
        try:
            info = {**impostor.info(), "fingerprint": self.cel.fp, "alias": "Honor"}
            corpo = {"info": info, "files": {"1": {"id": "1", "fileName": "a.txt", "size": 1,
                                                   "fileType": "text/plain", "preview": "rm -rf"}}}
            self.pc.desktop.resposta = None
            status, _ = impostor.requisitar("127.0.0.1", self.pc.porta, "https", "POST",
                                            "/prepare-upload", corpo)
            self.assertEqual(status, 403)  # perguntou em vez de aceitar direto, e o usuário recusou
            self.assertEqual(len(self.pc.desktop.perguntas), 1)
            self.assertIsNone(self.pc.desktop.copiado)
        finally:
            impostor.parar_servidor()

    def test_certificado_trocado_no_destino(self):
        dados = self.cel.registro.todos()
        with self.cel.registro.editar() as d:
            d[self.pc.fp]["ip"] = "127.0.0.1"
        fp_falso = "AB" * 32
        with self.cel.registro.editar() as d:
            d[fp_falso] = {**d[self.pc.fp], "alias": "Falso"}
        with self.assertRaisesRegex(ponte.Erro, "certificado"):
            self.cel.conectar("127.0.0.1", self.pc.porta, "https", fp_falso, 3)
        self.assertTrue(dados)

    def _preparar(self, arquivos):
        self.pc.registro.marcar(self.cel.fp, True)
        status, corpo = self.cel.requisitar("127.0.0.1", self.pc.porta, "https", "POST", "/prepare-upload",
                                            {"info": self.cel.info(), "files": arquivos})
        return status, json.loads(corpo) if corpo else None

    def _subir(self, sid, fid, token, dados):
        conn = self.cel.conectar("127.0.0.1", self.pc.porta, "https", None, 5)
        q = f"sessionId={sid}&fileId={fid}&token={token}"
        conn.request("POST", f"{ponte.API}/upload?{q}", body=dados)
        r = conn.getresponse()
        r.read()
        conn.close()
        return r.status

    def test_token_errado_e_caminho_malicioso(self):
        status, resp = self._preparar({"f": {"id": "f", "fileName": "../../../etc/fora.txt",
                                             "size": 3, "fileType": "text/csv"}})
        self.assertEqual(status, 200)
        self.assertEqual(self._subir(resp["sessionId"], "f", "errado", b"abc"), 403)
        self.assertEqual(self._subir(resp["sessionId"], "f", resp["files"]["f"], b"abc"), 200)
        self.assertEqual((self.pc.pasta / "etc" / "fora.txt").read_bytes(), b"abc")
        self.assertFalse((Path(self.tmp) / "etc").exists())
        # Mesmo token não serve duas vezes
        self.assertEqual(self._subir(resp["sessionId"], "f", resp["files"]["f"], b"abc"), 403)

    def test_checksum_errado(self):
        status, resp = self._preparar({"f": {"id": "f", "fileName": "x.bin", "size": 3,
                                             "fileType": "application/octet-stream",
                                             "sha256": hashlib.sha256(b"certo").hexdigest()}})
        self.assertEqual(self._subir(resp["sessionId"], "f", resp["files"]["f"], b"abc"), 422)
        self.assertFalse((self.pc.pasta / "x.bin").exists())

    def test_corpo_invalido(self):
        status, _ = self.cel.requisitar("127.0.0.1", self.pc.porta, "https", "POST", "/prepare-upload",
                                        {"info": self.cel.info(), "files": {}})
        self.assertEqual(status, 400)
        status, corpo = self.cel.requisitar("127.0.0.1", self.pc.porta, "https", "GET", "/info")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(corpo)["fingerprint"], self.pc.fp)

    def test_cancelar(self):
        status, resp = self._preparar({"f": {"id": "f", "fileName": "x.bin", "size": 3,
                                             "fileType": "application/octet-stream"}})
        st, _ = self.cel.requisitar("127.0.0.1", self.pc.porta, "https", "POST",
                                    f"/cancel?sessionId={resp['sessionId']}")
        self.assertEqual(st, 200)
        self.assertEqual(self._subir(resp["sessionId"], "f", resp["files"]["f"], b"abc"), 403)


class TesteUtilidades(unittest.TestCase):
    def test_area_de_transferencia(self):
        class Area(DesktopFalso):
            def __init__(self, conteudo):
                super().__init__()
                self.conteudo = conteudo

            def tipos_copiados(self):
                return list(self.conteudo)

            def ler_copiado(self, tipo):
                return self.conteudo[tipo]

        with tempfile.TemporaryDirectory() as tmp:
            arq = Path(tmp) / "meu arquivo.txt"
            arq.write_text("oi")
            uri = "file://" + str(arq).replace(" ", "%20")
            itens = ponte.itens_da_area(Area({"text/uri-list": uri.encode(), "text/plain": b"x"}))
            self.assertEqual(itens[0]["caminho"], arq)

        itens = ponte.itens_da_area(Area({"image/png": b"png", "image/jpeg": b"jpg"}))
        self.assertEqual((itens[0]["tipo"], itens[0]["dados"]), ("image/png", b"png"))

        itens = ponte.itens_da_area(Area({"text/plain;charset=utf-8": "ação".encode(), "TEXT": b"?"}))
        self.assertEqual(itens[0]["preview"], "ação")

        with self.assertRaises(ponte.Erro):
            ponte.itens_da_area(Area({}))

    def test_nomes(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp)
            self.assertEqual(ponte.caminho_seguro(pasta, "a/../../b.txt"), pasta / "a" / "b.txt")
            self.assertEqual(ponte.caminho_seguro(pasta, "/etc/passwd"), pasta / "etc" / "passwd")
            self.assertEqual(ponte.caminho_seguro(pasta, ".."), pasta / "arquivo")
            (pasta / "f.txt").write_text("")
            self.assertEqual(ponte.nome_livre(pasta / "f.txt"), pasta / "f (1).txt")


if __name__ == "__main__":
    unittest.main()
