const { categories } = require('./oz-checklist');

const categoryTitleById = new Map(categories.map((category) => [category.id, category.title]));

const categoryBadges = [
  ['ingressos-e-acesso', 'Mestre do Bilhete', 'Ingressos e acesso completos.'],
  ['kit-do-espetaculo', 'Guardiã do Kit', 'Todos os itens do kit preparados.'],
  ['beleza-e-caracterizacao', 'Artista da Transformação', 'Beleza e caracterização completas.'],
  ['acessorios-cenicos', 'Arquiteta da Cena', 'Acessórios cênicos prontos para o palco.'],
  ['painel-de-led', 'Feiticeira do LED', 'Conteúdo do painel de LED finalizado.'],
  ['coreografias-e-cenas', 'Rainha do Palco', 'Coreografias e cenas organizadas.'],
  ['grand-finale', 'Estrela do Grand Finale', 'O grande final está pronto.'],
  ['equipe-de-apoio', 'Coração da Equipe', 'A equipe de apoio está alinhada.'],
  ['acolhimento-e-experiencia', 'Encanto do Público', 'A experiência do público foi preparada.'],
  ['estrutura-do-local', 'Base de Oz', 'A estrutura do local está resolvida.'],
  ['seguranca', 'Escudo de Oz', 'A segurança do espetáculo está pronta.'],
  ['limpeza', 'Brilho Impecável', 'A limpeza está organizada.'],
  ['lanche-da-equipe', 'Mesa Encantada', 'O lanche da equipe está completo.'],
  ['divulgacao-e-material-impresso', 'Voz de Oz', 'A divulgação está pronta para ganhar a cidade.'],
  ['patrocinio', 'Diamante Esmeralda', 'O patrocínio está completo.'],
  ['tv-conteudo', 'Tela Mágica', 'O conteúdo de TV está preparado.'],
  ['atividades-para-menores', 'Guardiã dos Pequenos', 'As atividades para menores estão prontas.'],
  ['checklist-final-7-dias', 'Contagem Final', 'A revisão dos sete dias está concluída.']
];

const missionMilestones = [
  [1, 'Primeiro Passo'], [3, 'Estrada Amarela'], [5, 'Companheira de Jornada'],
  [10, 'Rumo à Cidade'], [12, 'Chave de Oz'], [15, 'Laço de Esmeralda'],
  [20, 'Guardiã da Missão'], [30, 'Força do Tornado'], [40, 'Ritmo de Oz'],
  [50, 'Magia em Movimento'], [100, 'Centelha da Lenda'], [200, 'Bicentenária de Oz']
];

const delegationMilestones = [
  [1, 'Primeiro Convite'], [3, 'Coordenação em Cena'], [5, 'Rede de Apoio'],
  [10, 'Maestrina das Tarefas'], [20, 'Mapa de Responsáveis'], [30, 'Liderança Esmeralda'],
  [40, 'Diretora de Oz'], [50, 'Mestre da Produção']
];

const OZ_BADGES = [
  ...categoryBadges.map(([categoryId, title, description]) => ({
    id: `category:${categoryId}`,
    title,
    description,
    group: 'categoria',
    categoryId,
    unlockText: `Conclua todas as tarefas de ${categoryTitleById.get(categoryId)}.`
  })),
  ...missionMilestones.map(([threshold, title]) => ({
    id: `missions:${threshold}`,
    title,
    description: `${threshold} ${threshold === 1 ? 'tarefa concluída' : 'tarefas concluídas'}.`,
    group: 'missao',
    threshold,
    unlockText: `Conclua ${threshold} ${threshold === 1 ? 'tarefa' : 'tarefas'} no checklist.`
  })),
  ...delegationMilestones.map(([threshold, title]) => ({
    id: `delegations:${threshold}`,
    title,
    description: `${threshold} ${threshold === 1 ? 'tarefa delegada' : 'tarefas delegadas'}.`,
    group: 'delegacao',
    threshold,
    unlockText: `Delegue ${threshold} ${threshold === 1 ? 'tarefa' : 'tarefas'} para a equipe.`
  })),
  {
    id: 'finale:show-completo',
    title: 'Show Completo',
    description: 'Todas as tarefas do espetáculo foram concluídas.',
    group: 'finale',
    unlockText: 'Conclua todas as tarefas atuais do checklist.'
  },
  {
    id: 'finale:lenda-de-oz',
    title: 'Lenda de Oz',
    description: 'Todos os outros selos foram conquistados.',
    group: 'finale',
    unlockText: 'Conclua todas as tarefas atuais e delegue 50 tarefas para a equipe.'
  }
];

if (OZ_BADGES.length !== 40 || new Set(OZ_BADGES.map((badge) => badge.id)).size !== 40) {
  throw new Error('Os selos de Oz precisam conter exatamente 40 identificadores únicos.');
}

function badgeIsUnlocked(badge, stats) {
  if (badge.group === 'categoria') {
    const category = stats.categories.get(badge.categoryId);
    return Boolean(category && category.total > 0 && category.completed >= category.total);
  }
  if (badge.group === 'missao') return stats.completed >= badge.threshold;
  if (badge.group === 'delegacao') return stats.delegated >= badge.threshold;
  if (badge.id === 'finale:show-completo') return stats.total > 0 && stats.completed >= stats.total;
  if (badge.id === 'finale:lenda-de-oz') return stats.total > 0 && stats.completed >= stats.total && stats.delegated >= 50;
  return false;
}

module.exports = { OZ_BADGES, badgeIsUnlocked };
