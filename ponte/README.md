# Ponte

O lado do PC (CachyOS / Linux) para o **LocalSend**. Nos celulares você usa o LocalSend oficial; no PC, a Ponte. Ela fala a mesma língua do LocalSend, então aparece na lista do celular como se fosse ele, mas age sozinha:

| Situação | LocalSend oficial no PC | Ponte |
|---|---|---|
| Celular manda um texto | Abre uma janela, você clica em "Copiar" | Já vai para a área de transferência: é só dar Ctrl+V |
| Celular manda uma foto | Pergunta "Aceitar?" | Salva na pasta e também copia a imagem, pronta para colar |
| Celular de confiança manda arquivos | Pergunta "Aceitar?" | Vão direto para `~/Recebidos`, com um aviso discreto |
| Mandar o que você copiou no PC | Abrir o app, escolher Texto, colar, escolher o celular | Um atalho de teclado |
| Mandar um arquivo do Dolphin | Abrir o app e escolher o arquivo | Botão direito → "Enviar para o celular" |

## Instalar

No CachyOS, dentro desta pasta:

```bash
./instalar.sh
```

O script:
1. instala o que faltar (`python`, `openssl`, `libnotify`, `wl-clipboard`, `xclip`);
2. copia o programa para `~/.local/bin/ponte`;
3. faz a Ponte ligar sozinha quando você entra na sessão;
4. cria a opção "Enviar para o celular (Ponte)" no botão direito do Dolphin;
5. libera a porta 53317 no firewall (ufw ou firewalld), senão o celular não consegue mandar nada;
6. liga a Ponte.

Para desinstalar: `./instalar.sh --remover`.

> Não deixe o LocalSend oficial aberto no PC: os dois usam a mesma porta.

## Configurar os celulares (Honor e Samsung)

1. Instale o **LocalSend** pela Play Store.
2. Deixe o celular no **mesmo Wi-Fi** do PC. Wi-Fi de visitante costuma isolar os aparelhos, e aí não funciona.
3. Abra o LocalSend. O PC aparece na aba **Enviar** com o nome do computador.
4. Mande qualquer coisa para o PC. No PC aparece uma notificação: toque em **Sempre deste aparelho**. Daí em diante esse celular não precisa mais de confirmação.
5. **Só no Honor (MagicOS):** em Configurações → Bateria → Inicialização de apps, coloque o LocalSend em **gerenciar manualmente** e ative as três opções. Sem isso a MagicOS fecha o LocalSend e o PC não consegue mandar nada para o celular.
6. **Para o PC mandar arquivos sem o celular perguntar:** no LocalSend do celular, marque o PC como favorito e, em Configurações, ative o **salvamento rápido de favoritos**.

## Usar

### Do celular para o PC
- **Texto:** selecione o texto, toque em **Compartilhar → LocalSend →** o PC. Ou abra o LocalSend, toque em **Texto**, cole e escolha o PC. No PC, aperte Ctrl+V.
- **Arquivos e fotos:** Compartilhar → LocalSend → o PC. Eles vão para `~/Recebidos`, e a notificação tem o botão **Abrir pasta**.

O Android não deixa nenhum app ler o que você copiou sem você pedir, por isso do celular para o PC sempre passa pelo Compartilhar.

### Do PC para o celular
- **Atalho de teclado** (configure uma vez): Configurações do Sistema → Teclado → Atalhos → **Adicionar novo → Aplicativo** → "Ponte: enviar área de transferência" → escolha, por exemplo, **Meta+Shift+C**. Depois é só copiar qualquer coisa e apertar o atalho. Funciona com texto, imagem (um print, por exemplo) e arquivos copiados no Dolphin.
- **Dolphin:** botão direito num arquivo ou pasta → **Enviar para o celular (Ponte)**.
- **Terminal:**
  ```bash
  ponte enviar foto.jpg documentos/       # arquivos e pastas
  ponte texto "um recado"                 # texto
  ponte clipboard                         # o que está copiado
  ponte enviar video.mp4 -p samsung       # escolhe o aparelho (parte do nome basta)
  ```

O LocalSend precisa estar aberto ou em segundo plano no celular para receber.

### Com dois celulares
Se os dois forem de confiança, diga qual é o padrão em `~/.config/ponte/config.toml`:

```toml
padrao = "Honor"
```

O atalho e o Dolphin passam a mandar para o Honor. Para o Samsung, use `-p samsung` no terminal.

## Comandos

| Comando | O que faz |
|---|---|
| `ponte servidor` | Fica ligado recebendo (o instalador já liga sozinho) |
| `ponte enviar ARQUIVOS...` | Envia arquivos e pastas |
| `ponte texto TEXTO` | Envia um texto |
| `ponte clipboard` | Envia o que está copiado |
| `ponte dispositivos` | Lista os aparelhos conhecidos (★ = de confiança) |
| `ponte procurar` | Procura aparelhos na rede |
| `ponte adicionar IP` | Adiciona um aparelho pelo IP (por exemplo, pelo Tailscale) |
| `ponte confiar NOME` / `ponte desconfiar NOME` | Muda a confiança de um aparelho |
| `ponte config` | Mostra onde fica o arquivo de configuração |

Opções de envio: `-p NOME` escolhe o aparelho e `--pin 1234` informa o PIN, se o celular pedir.

## Configuração

Fica em `~/.config/ponte/config.toml`. Depois de mudar, saia e entre de novo na sessão ou rode `./instalar.sh` outra vez.

| Opção | Padrão | O que faz |
|---|---|---|
| `nome` | nome do computador | Como o PC aparece no celular |
| `pasta` | `~/Recebidos` | Onde salvar o que chega |
| `padrao` | vazio | Aparelho para o atalho e o Dolphin |
| `copiar_imagens` | `true` | Uma foto recebida sozinha também vai para a área de transferência |
| `pin` | vazio | PIN pedido a aparelhos que não são de confiança |
| `porta` | `53317` | Porta do LocalSend |

O registro do que acontece fica em `~/.local/share/ponte/ponte.log`.

## Fora de casa (faculdade, dados móveis)

A Ponte e o LocalSend só enxergam aparelhos na mesma rede. Fora de casa há dois caminhos.

### Notebook junto com você: roteador do celular
Ligue o **roteador Wi-Fi (hotspot)** do Honor e conecte o notebook nele. Pronto: os dois estão na mesma rede e tudo funciona como em casa.
- A transferência entre o celular e o notebook **não gasta dados móveis**: ela fica dentro do Wi-Fi do celular. Os dados só são usados se o notebook acessar a internet.
- Não use o Wi-Fi da faculdade para isso. Redes de faculdade costumam isolar os aparelhos uns dos outros.

### PC ficou em casa: Tailscale
O [Tailscale](https://tailscale.com) cria uma rede particular entre os seus aparelhos pela internet. É grátis para uso pessoal.
1. **PC:** `sudo pacman -S tailscale`, depois `sudo systemctl enable --now tailscaled` e `sudo tailscale up`. Entre com a sua conta.
2. **Celular:** instale o Tailscale pela Play Store e entre com a **mesma conta**. No Honor, libere a bateria dele como fez com o LocalSend.
3. Veja os IPs (começam com `100.`) no app do Tailscale ou com `tailscale ip -4` no PC.
4. **Celular → PC:** no LocalSend, use a opção de enviar por endereço IP e digite o IP do PC no Tailscale.
5. **PC → celular:** com o LocalSend aberto no celular, rode uma vez `ponte adicionar 100.x.y.z` (o IP do celular no Tailscale). Depois disso, o atalho e o Dolphin funcionam normalmente.

O que muda em relação a casa:
- O PC precisa estar **ligado** e com a sessão aberta.
- Aqui a transferência **gasta dados móveis**. Textos e fotos não pesam; vídeos grandes, sim.
- Pode ficar mais lento: depende da sua internet de casa e do sinal do celular.

## Se não funcionar

| Problema | O que fazer |
|---|---|
| O PC não aparece no celular | Confira o mesmo Wi-Fi e a porta 53317 liberada no firewall (`sudo ufw status`). No celular, toque no botão de atualizar da aba Enviar. |
| O celular não aparece no PC | Abra o LocalSend no celular e rode `ponte procurar`. |
| "não respondeu" ao enviar do PC | O LocalSend do celular foi fechado. Abra-o e veja a configuração de bateria do Honor (passo 5). |
| "Não consegui usar a porta 53317" | O LocalSend oficial está aberto no PC. Feche-o. |
| O texto não vai para a área de transferência | Instale o `wl-clipboard` (Wayland) ou o `xclip` (X11). |
| Nada pergunta nem avisa | Instale o `libnotify`. Sem ele, aparelhos desconhecidos são recusados por segurança. |

## Como funciona e segurança

A Ponte implementa o [protocolo LocalSend v2](https://github.com/localsend/protocol):

- **Descoberta:** anúncio por UDP multicast em `224.0.0.167:53317`. Se o roteador bloquear multicast, há uma varredura da rede local como plano B.
- **Transferência:** HTTPS na porta 53317, com certificado próprio. Ele é gerado na primeira vez em `~/.local/share/ponte/` e identifica o PC pela impressão digital (SHA-256), como no LocalSend. O PC também se identifica com esse certificado quando manda algo, como o LocalSend atual exige.
- **Confiança:** quando um aparelho de confiança manda algo, a Ponte liga de volta para ele e confere se o certificado é mesmo o dele. Um impostor que copie o nome ou a impressão digital cai na pergunta normal.
- **Envio:** antes de mandar qualquer coisa, a Ponte confere o certificado do celular. Se mudou, ela cancela.
- **Arquivos recebidos:** nunca saem da pasta escolhida (nomes com `..` são limpos) e nunca sobrescrevem outros (viram `foto (1).jpg`).
- **Tudo fica na sua rede:** não há servidor na internet, conta nem nuvem.

Só usa a biblioteca padrão do Python 3.11+ e programas comuns do Linux.

## Testes

```bash
python3 -m unittest -v test_ponte.py
```

Os testes ligam dois aparelhos Ponte na mesma máquina e trocam textos, arquivos e pastas pelo protocolo. Também cobrem as recusas, o PIN, um impostor, um certificado trocado, token errado, checksum errado e nomes maliciosos.
