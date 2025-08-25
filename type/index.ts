export type CursoDisciplinaTurma = {
  curso_id: number;
  disciplina_id: number;
  designacao: string;
  turma_id: number;
  descricao: string;
  id_curso_disciplina: number;
};

export type HistoricoAlunoDTO = {
  id: number;
  id_curso: number;
  id_disciplina: number;
  id_turma: number;
  nome_aluno: string;
  numero_aluno: number;
  situacao: string;
  id_curso_disciplina: number;

  mac1: number;
  npp1: number;
  npt1: number;
  mt1: number;

  mac2: number;
  npp2: number;
  npt2: number;
  mt2: number;

  mac3: number;
  npp3: number;
  npt3: number;
  mt3: number;

  mfa: number;
  mfd: number;
  mf: number;
  ano_curricular: number;
};

export type BuscarTurmasResponse = {
  turmas: CursoDisciplinaTurma[];
  matriculas: HistoricoAlunoDTO[];
};
