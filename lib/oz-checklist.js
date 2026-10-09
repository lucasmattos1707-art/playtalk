const categories = [
  { id: 'ingressos-e-acesso', title: 'INGRESSOS E ACESSO', icon: '🎟️', groups: [], items: ['Definir valor do ingresso', 'Ingresso inteiro', 'Meia-entrada', 'Quantidade de ingressos', 'Ingresso — gráfica', 'Conferência dos ingressos impressos', 'Controle de venda', 'Pulseiras das mães/responsáveis', 'Definir acesso às duas sessões', 'Controle de entrada'] },
  { id: 'kit-do-espetaculo', title: 'KIT DO ESPETÁCULO', icon: '🎁', groups: [], items: ['Definir itens do kit', 'Figurino', 'Acessórios', 'Sapatilha', 'Outros itens', 'Valor do kit', 'Forma de pagamento', 'Controle dos pagamentos', 'Entrega dos kits', 'Conferência individual das bailarinas'] },
  { id: 'beleza-e-caracterizacao', title: 'BELEZA E CARACTERIZAÇÃO', icon: '💄', groups: [], items: ['Maquiagem', 'Modelo de coque', 'Tutorial/modelo de cabelo', 'Acessórios de cabelo', 'Maquiagem por personagem', 'Materiais de maquiagem', 'Responsável pela maquiagem', 'Responsáveis pelo cabelo', 'Teste de maquiagem', 'Teste de coque'] },
  { id: 'acessorios-cenicos', title: 'ACESSÓRIOS CÊNICOS', icon: '🎭', groups: ['Por turma', 'Por personagem'], items: [
    ['Por turma', 'Listar acessórios de cada turma'], ['Por turma', 'Definir quantidade'], ['Por turma', 'Produção'], ['Por turma', 'Compra'], ['Por turma', 'Identificação'], ['Por turma', 'Armazenamento'],
    ...['Dorothy', 'Glinda', 'Elphaba', 'Homem de Lata', 'Espantalho', 'Leão', 'Mágico', 'Munchkins', 'Outros'].map((name) => ['Por personagem', name]),
    ...['Acessórios coreográficos', 'Objetos de cena', 'Conferência antes do espetáculo', 'Responsável pelos acessórios'].map((name) => ['', name])
  ] },
  { id: 'painel-de-led', title: 'PAINEL DE LED', icon: '🌈', groups: ['Cenas para LED'], items: ['Definir cenas para o painel', 'Lista de vídeos/imagens', 'Criar artes', 'Criar animações', 'Definir duração de cada conteúdo', 'Nomear arquivos por cena', 'Testar arquivos', 'Teste no painel', 'Backup'] },
  { id: 'coreografias-e-cenas', title: 'COREOGRAFIAS E CENAS', icon: '💃', groups: [], items: ['Coreografia', 'Música', 'Formação', 'Acessórios', 'Figurino', 'Entrada', 'Saída', 'Posicionamento no palco', 'Ordem das cenas', 'Transições', 'Tempo de troca', 'Organização nos bastidores'] },
  { id: 'grand-finale', title: 'GRAND FINALE', icon: '✨', groups: ['Grand Finale geral', 'Grand Finale — Oz'], items: [
    ...['Música', 'Formação', 'Todas as turmas', 'Entrada das turmas', 'Posicionamento', 'Finalização', 'Pose final', 'Iluminação', 'LED'].map((name) => ['Grand Finale geral', name]),
    ...['Definir personagens', 'Música', 'Formação', 'Entrada', 'Posicionamento', 'Figurinos', 'Acessórios', 'Iluminação', 'LED', 'Pose final'].map((name) => ['Grand Finale — Oz', name])
  ] },
  { id: 'equipe-de-apoio', title: 'EQUIPE DE APOIO', icon: '🤝', groups: ['Brinde/convite da equipe de apoio'], items: [
    ...['Equipe definida', 'Função de cada pessoa', 'Escala', 'Horários', 'Responsável por cada turma', 'Responsável pelos camarins', 'Responsável pelas crianças', 'Responsável pelos acessórios', 'Responsável pelas entradas e saídas', 'Crachás da equipe', 'Identificação visual da equipe'].map((name) => ['', name]),
    ...['Definir brinde', 'Definir quantidade', 'Criar convite/cartão', 'Produzir', 'Entregar'].map((name) => ['Brinde/convite da equipe de apoio', name])
  ] },
  { id: 'acolhimento-e-experiencia', title: 'ACOLHIMENTO E EXPERIÊNCIA DO PÚBLICO', icon: '💛', groups: ['Para crianças menores'], items: [
    ...['Lanche', 'Pipoca', 'Água/bebidas', 'Definir quantidade', 'Responsável pela distribuição', 'Organização do espaço'].map((name) => ['', name]),
    ...['Desenhos para pintar', 'Atividades para menores', 'Materiais para colorir', 'Mesinha/espaço infantil', 'TV', 'Conteúdo para TV', 'Responsável pelo espaço infantil'].map((name) => ['Para crianças menores', name])
  ] },
  { id: 'estrutura-do-local', title: 'ESTRUTURA DO LOCAL', icon: '🏛️', groups: [], items: ['Decoração', 'Palco', 'Camarins', 'Espaço para crianças', 'Recepção', 'Bilheteria/controle', 'Som', 'Iluminação', 'LED', 'TV', 'Banheiros', 'Sinalização'] },
  { id: 'seguranca', title: 'SEGURANÇA', icon: '🛡️', groups: [], items: ['Equipe de segurança', 'Quantidade necessária', 'Entrada do público', 'Saídas de emergência', 'Controle de acesso', 'Área dos camarins', 'Área das crianças', 'Circulação nos bastidores', 'Responsável pela segurança'] },
  { id: 'limpeza', title: 'LIMPEZA', icon: '🧹', groups: [], items: ['Equipe de limpeza', 'Antes do evento', 'Durante o evento', 'Intervalo entre sessões', 'Após o evento', 'Camarins', 'Banheiros', 'Área do público', 'Palco', 'Área de alimentação', 'Materiais de limpeza'] },
  { id: 'lanche-da-equipe', title: 'LANCHE DA EQUIPE', icon: '🍎', groups: [], items: ['Definir cardápio', 'Quantidade', 'Água', 'Café', 'Lanche', 'Horário', 'Local', 'Responsável', 'Embalagens/copos/guardanapos'] },
  { id: 'divulgacao-e-material-impresso', title: 'DIVULGAÇÃO E MATERIAL IMPRESSO', icon: '📣', groups: [], items: ['Identidade visual', 'Folder da apresentação', 'Arte do folder', 'Informações do espetáculo', 'Programa/ordem das apresentações', 'Patrocínios', 'Logos dos patrocinadores', 'Divulgação dos patrocinadores', 'Materiais para redes sociais', 'Cartazes', 'Stories', 'Reels'] },
  { id: 'patrocinio', title: 'PATROCÍNIO', icon: '💎', groups: [], items: ['Criar proposta comercial', 'Definir cotas', 'Lista de possíveis patrocinadores', 'Fazer contatos', 'Registrar respostas', 'Fechar patrocinadores', 'Receber logos', 'Inserir logos nos materiais', 'Inserir patrocinadores no folder', 'Divulgação dos patrocinadores', 'Agradecimento pós-evento'] },
  { id: 'tv-conteudo', title: 'TV / CONTEÚDO', icon: '📺', groups: [], items: ['Definir finalidade da TV', 'Criar conteúdo', 'Vídeos', 'Fotos', 'Informações do espetáculo', 'Patrocinadores', 'Avisos', 'Testar TV', 'Testar áudio, se houver', 'Definir responsável'] },
  { id: 'atividades-para-menores', title: 'ATIVIDADES PARA MENORES', icon: '🧸', groups: [], items: ['Desenhos para pintar', 'Lápis de cor', 'Giz de cera', 'Atividades impressas', 'Mesa', 'Cadeiras', 'TV', 'Vídeos infantis', 'Espaço delimitado', 'Responsável pelo espaço'] },
  { id: 'checklist-final-7-dias', title: 'CHECKLIST FINAL — 7 DIAS ANTES', icon: '⏳', groups: [], items: ['Ingressos', 'Pulseiras', 'Kits', 'Figurinos', 'Sapatilhas', 'Acessórios', 'Maquiagem', 'Coques', 'Cenografia', 'LED', 'Músicas', 'Grand Finale', 'Equipe', 'Crachás', 'Segurança', 'Limpeza', 'Lanche', 'Pipoca', 'Decoração', 'Folder', 'Patrocínios', 'Atividades infantis', 'TV', 'Ensaio geral'] }
];

module.exports = { categories };
