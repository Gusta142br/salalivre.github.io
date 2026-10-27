# Sala Livre

Sala de compartilhamento de tela, áudio e câmera, sem cadastro dos participantes. HTML, CSS e JavaScript estáticos, com PeerJS 1.5.5 (MIT) incluído. Até 6 pessoas por sala.

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub.
2. Envie **o conteúdo da pasta dist** para a raiz do repositório: index.html, style.css, app.js e peerjs.min.js.
3. Abra Settings → Pages → Build and deployment → Deploy from a branch.
4. Selecione a branch main e a pasta / (root), depois Save.
5. Aguarde a publicação. Abra a URL HTTPS informada pelo GitHub.
6. Digite seu nome, crie uma sala, clique em Copiar convite e envie o convite completo, incluindo #sala=… . Quem entrar não precisa de conta no GitHub nem no site.

A pessoa que criou deve manter a página aberta. Recarregar ou fechar termina a sala. Não há gravação, cadastro, banco de dados ou histórico implementados. Quem tem o convite pode entrar; não há senha, moderação nem autenticação da identidade pelo nome. Use convites somente com pessoas de confiança.

## Conexões e limitações

O GitHub hospeda somente a página. A sinalização usa PeerServer Cloud público (serviço externo); o áudio e vídeo usam WebRTC entre os participantes. A disponibilidade depende do serviço e das redes. Esta versão usa a configuração STUN/TURN pública padrão da biblioteca PeerJS 1.5.5, sem garantia de disponibilidade. Redes corporativas, CGNAT ou firewalls podem impedir conexões. Para confiabilidade maior, configure um serviço TURN próprio ou gerenciado, preferencialmente com credenciais temporárias fornecidas por um backend. Não coloque segredos permanentes no JavaScript público.

O app aceita uma configuração RTC opcional em window.SALA_RTC_CONFIG antes de carregar app.js. A chave iceServers segue o formato RTCConfiguration. O servidor de sinalização também pode ser substituído na criação do Peer em app.js.

Não há temporizador de duração no app. Isso não constitui garantia de disponibilidade do serviço público. Cada transmissão é enviada separadamente aos outros participantes: upload e uso de CPU crescem com a sala. Comece com poucas pessoas e qualidade moderada.

Compartilhamento exige HTTPS (ou localhost para desenvolvimento) e suporte a getDisplayMedia. Recomenda-se testar no Chrome ou Edge de computador. Celulares podem assistir, conforme suporte do navegador, mas compartilhar a tela não está disponível em todos. Áudio de aba/sistema depende de navegador, sistema e opção escolhida no seletor. Use fones para evitar eco.

Câmera e microfone ficam desligados inicialmente. Permissões só são solicitadas ao selecionar os dispositivos e entrar, ou ao ativá-los dentro da sala. A tela sempre depende de seleção explícita no navegador. O compartilhamento é encerrado ao sair.

## Verificação

JavaScript validado com node --check. Criação de sala verificada no navegador; a conexão entre participantes e transmissão de mídia ainda precisa de validação em redes reais. Transmissão de mídia entre redes distintas requer validação em computadores reais.

## Dependência

PeerJS 1.5.5: https://github.com/peers/peerjs — licença MIT, preservada no arquivo distribuído.

## Áudio da transmissão

O áudio capturado da tela/aba é enviado junto ao vídeo, separado do microfone. Desligar o microfone no site não interrompe o áudio da transmissão. Ao compartilhar, marque Compartilhar áudio no seletor do navegador. O site solicita audio:true e systemAudio:include, mas o navegador pode retornar vídeo sem áudio conforme a fonte, sistema e suporte. Um aviso aparece quando isso acontece.

Clique com o botão direito em qualquer ponto de uma transmissão para abrir o controle próximo ao clique. Cada espectador ajusta apenas o próprio volume daquela transmissão: controle de 0 a 100%, passos de 10%, silenciar e reativar. Os ajustes se mantêm ao focar e voltar à grade. Não alteram microfones nem o áudio ouvido pelas outras pessoas. O botão Som no canto da transmissão abre o mesmo painel por clique ou toque; com teclado, selecione a transmissão e pressione Shift+F10. Escape ou clique fora fecha o painel.

A própria prévia não reproduz áudio para evitar eco, mas continua enviando o áudio capturado. Não há amplificação acima de 100%.

Verificado no navegador com três streams sintéticos locais: abertura por botão direito, volume independente, silêncio/reativação, volume zero, limite de 100%, manutenção após foco/grade e áudio da tela ainda vivo após desligar o microfone. Esses testes verificam os controles e a separação das mídias; não validam uma chamada real pela internet. A conexão entre participantes continua pendente de validação.
