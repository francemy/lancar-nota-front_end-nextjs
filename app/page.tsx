"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { BuscarTurmasResponse, CursoDisciplinaTurma, HistoricoAlunoDTO } from "@/type";

type InfInitResponse = {
  "turmas": CursoDisciplinaTurma[],
  "cursos": { id: number, nome: string }[],
}

type NotificationProps = {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">×</button>
      </div>
    </div>
  );
};

const PautaPage: React.FC = () => {
  // Estados principais
  const [disciplinas, setDisciplinas] = useState<number>(0);
  const [disciplinasList, setDisciplinasList] = useState<CursoDisciplinaTurma[]>([]);
  const [dados, setDados] = useState<BuscarTurmasResponse | null>(null);
  const [cursosDisponiveis, setCursosDisponiveis] = useState<{ id: number, nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [curso_id, setCursoId] = useState<number>(0);

  // Estados para melhorias
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Função para mostrar notificações
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await axios.get<InfInitResponse>("http://localhost:8080/buscar-dados");
        setDisciplinasList(response.data.turmas);
        setCursosDisponiveis(response.data.cursos);
      } catch (error) {
        console.error("Erro ao buscar disciplinas:", error);
        showNotification("Erro ao carregar dados iniciais", "error");
      }
    };

    loadInitialData();
  }, [showNotification]);

  // Carregar dados do cache quando disciplina/curso mudar
  useEffect(() => {
    if (disciplinas !== 0 && curso_id !== 0) {
      const cacheKey = `${disciplinas}.${curso_id}`;
      const dadosCache = localStorage.getItem(cacheKey);
      if (dadosCache) {
        try {
          const dadosParsed = JSON.parse(dadosCache);
          setDados(dadosParsed);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error("Erro ao carregar cache:", error);
          localStorage.removeItem(cacheKey);
        }
      }
    }
  }, [disciplinas, curso_id]);

  // Função para calcular médias com validação
  const calcularMedia = useCallback((valores: (number | null | undefined)[]): number => {
    const valoresValidos = valores.filter(
      v => v !== null && v !== undefined && !isNaN(v)
    ) as number[];

    if (valoresValidos.length === 0) return 0;

    const soma = valoresValidos.reduce((acc, val) => acc + val, 0);
    // return soma / valoresValidos.length; // mantém número quebrado
    return parseFloat((soma / valoresValidos.length).toFixed(2));
  }, []);

  // Função para calcular média final
  const calcularMediaFinal = useCallback((mt1: number, mt2: number, mt3: number, mfa?: number): number => {
    const medias = [mt1, mt2, mt3].filter(m => m > 0);
    if (medias.length === 0) return 0;

    let mediaFinal = medias.reduce((acc, m) => acc + m, 0) / medias.length;

    // Se tem média de frequência e está abaixo de 10, aplicar na média final
    if (mfa !== undefined && mfa > 0 && mfa < 10) {
      mediaFinal = mediaFinal * 0.7; // Penalidade por baixa frequência
    }

    return Math.round(mediaFinal);
  }, []);

  // Função melhorada para editar notas
  const handleEdit = useCallback((
    id: number,
    campo: keyof HistoricoAlunoDTO,
    valor: string
  ) => {
    const valorNumerico = valor === '' ? 0 : Math.max(0, Math.min(curso_id < 7 ? 10 : 20, Number(valor)));

    setDados((prev) => {
      if (!prev) return prev;

      const matriculasAtualizadas = prev.matriculas.map((m) => {
        if (m.id !== id) return m;

        const atualizado = { ...m, [campo]: valorNumerico };

        // Recalcular médias trimestrais
        if (["mac1", "npp1", "npt1"].includes(campo)) {
          atualizado.mt1 = calcularMedia([atualizado.mac1, atualizado.npp1, atualizado.npt1]);
        }

        if (["mac2", "npp2", "npt2"].includes(campo)) {
          atualizado.mt2 = calcularMedia([atualizado.mac2, atualizado.npp2, atualizado.npt2]);
        }

        if (["mac3", "npp3", "npt3"].includes(campo)) {
          atualizado.mt3 = calcularMedia([atualizado.mac3, atualizado.npp3, atualizado.npt3]);
        }

        // Recalcular média final
        atualizado.mf = calcularMediaFinal(atualizado.mt1, atualizado.mt2, atualizado.mt3, atualizado.mfa);

        return atualizado;
      });

      // Salvar no cache
      const cacheKey = `${disciplinas}.${curso_id}`;
      const dadosParaCache = { ...prev, matriculas: matriculasAtualizadas };
      localStorage.setItem(cacheKey, JSON.stringify(dadosParaCache));

      setHasUnsavedChanges(true);
      return dadosParaCache;
    });
  }, [disciplinas, curso_id, calcularMedia, calcularMediaFinal]);

  // Função melhorada para salvar individual
  const salvarIndividual = useCallback(async (aluno: HistoricoAlunoDTO) => {
    setSaving(prev => new Set(prev).add(aluno.id));

    try {
      // Validar dados antes de enviar
      if (!aluno.id_curso_disciplina) {
        throw new Error("ID do curso/disciplina não encontrado");
      }

      const res = await axios.put(`http://localhost:8080/lancar`, [aluno]);
      showNotification(`Notas de ${aluno.nome_aluno} salvas com sucesso!`, "success");

      // Atualizar flag de mudanças não salvas para este aluno específico
      // (implementação mais sofisticada seria necessária para rastrear por aluno)

    } catch (error) {
      console.error("Erro ao salvar:", error);
      showNotification(`Erro ao salvar notas de ${aluno.nome_aluno}`, "error");
    } finally {
      setSaving(prev => {
        const newSet = new Set(prev);
        newSet.delete(aluno.id);
        return newSet;
      });
    }
  }, [showNotification]);

  // Função melhorada para salvar todos
  const salvarTodos = useCallback(async () => {
    if (!dados || dados.matriculas.length === 0) {
      showNotification("Nenhum dado para salvar", "warning");
      return;
    }

    setSavingAll(true);

    try {
      // Validar todos os dados
      const dadosValidos = dados.matriculas.filter(aluno => aluno.id_curso_disciplina);

      if (dadosValidos.length === 0) {
        throw new Error("Nenhum dado válido para salvar");
      }

      if (dadosValidos.length !== dados.matriculas.length) {
        showNotification("Alguns alunos foram ignorados por dados inválidos", "warning");
      }

      const res = await axios.put(`http://localhost:8080/lancar`, dadosValidos);
      showNotification(`${dadosValidos.length} alunos salvos com sucesso!`, "success");
      setHasUnsavedChanges(false);
      localStorage.removeItem(`${disciplinas}.${curso_id}`); // Limpar cache após salvar

    } catch (error) {
      console.error("Erro ao salvar todos:", error);
      showNotification("Erro ao salvar todos os alunos", "error");
    } finally {
      setSavingAll(false);
    }
  }, [dados, showNotification]);

  // Função melhorada para buscar matrículas
  const fetchMatriculas = useCallback(async () => {
    if (!curso_id || !disciplinas) {
      showNotification("Selecione o curso e a disciplina", "warning");
      return;
    }

    if (hasUnsavedChanges) {
      const confirmar = window.confirm("Existem alterações não salvas. Deseja continuar?");
      if (!confirmar) return;
    }

    setLoading(true);
    const disciplinaSelecionada = disciplinasList.find(d => d.disciplina_id === disciplinas);

    try {
      const res = await axios.get<BuscarTurmasResponse>(
        `http://localhost:8080/turmas?curso_id=${curso_id}&disciplinas=${disciplinas}&id_curso_disciplina=${disciplinaSelecionada?.id_curso_disciplina}`
      );


      if (!disciplinaSelecionada) {
        throw new Error("Disciplina não encontrada");
      }

      // Processar dados e calcular médias
      const matriculasProcessadas = res.data.matriculas.map((aluno) => {
        const alunoProcessado = {
          ...aluno,
          mt1: calcularMedia([aluno.mac1, aluno.npp1, aluno.npt1]),
          mt2: calcularMedia([aluno.mac2, aluno.npp2, aluno.npt2]),
          mt3: calcularMedia([aluno.mac3, aluno.npp3, aluno.npt3]),
        };

        alunoProcessado.mf = calcularMediaFinal(
          alunoProcessado.mt1,
          alunoProcessado.mt2,
          alunoProcessado.mt3,
          alunoProcessado.mfa
        );
        alunoProcessado.mfd = calcularMediaFinal(
          alunoProcessado.mt1,
          alunoProcessado.mt2,
          alunoProcessado.mt3,
          alunoProcessado.mfa
        );

        return alunoProcessado;
      });

      const dadosProcessados = { ...res.data, matriculas: matriculasProcessadas };
      setDados(dadosProcessados);
      setHasUnsavedChanges(false);

      // Salvar no cache
      const cacheKey = `${disciplinas}.${curso_id}`;
      localStorage.setItem(cacheKey, JSON.stringify(dadosProcessados));

      showNotification(`${matriculasProcessadas.length} alunos carregados`, "success");

    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      showNotification("Erro ao buscar dados da turma", "error");
    } finally {
      setLoading(false);
    }
  }, [curso_id, disciplinas, hasUnsavedChanges, disciplinasList, calcularMedia, calcularMediaFinal, showNotification]);

  // Disciplinas filtradas por curso
  const disciplinasFiltradas = useMemo(() =>
    disciplinasList.filter(disc => disc.curso_id === curso_id),
    [disciplinasList, curso_id]
  );

  // Função para obter cor da situação do aluno
  const getStatusColor = useCallback((aluno: HistoricoAlunoDTO, isNota: boolean = false) => {

    if (isNota) {
      if (aluno.id_curso < 7) {
        if (aluno.mf >= 5) return "text-green-600 font-semibold"; // Aprovado
        else if (aluno.mf > 4) return "text-yellow-600 font-semibold"; // Recuperação
      } else {
        if (aluno.mf >= 10) return "text-green-600 font-semibold"; // Aprovado
        else if (aluno.mf > 9) return "text-yellow-600 font-semibold"; // Recuperação
      }
    } else {
      if (aluno.situacao === "Aprovado") return "text-green-600 font-semibold"; // Aprovado
      if (aluno.situacao === "Recuperação") return "text-yellow-600 font-semibold"; // Recuperação}
    }
    return "text-red-600 font-semibold"; // Reprovado
  }, []);



  return (
    <div className="p-6 max-w-full overflow-x-auto">
      {/* Notificações */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Cabeçalho melhorado */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <h1 className="text-2xl font-bold mb-4">Sistema de Lançamento de Notas</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Curso</label>
            <select
              value={curso_id}
              onChange={(e) => setCursoId(Number(e.target.value))}
              className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0}>Selecione o curso</option>
              {cursosDisponiveis.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Disciplina</label>
            <select
              value={disciplinas}
              onChange={(e) => setDisciplinas(Number(e.target.value))}
              className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!curso_id}
            >
              <option value={0}>Selecione a disciplina</option>
              {disciplinasFiltradas.map((disc, index) => (
                <option key={`${disc.disciplina_id}-${index}`} value={disc.disciplina_id}>
                  {disc.designacao} - Turma {disc.turma_id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchMatriculas}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !curso_id || !disciplinas}
            >
              {loading ? "Buscando..." : "Buscar Matrículas"}
            </button>

            {hasUnsavedChanges && (
              <span className="text-orange-600 text-sm flex items-center">
                ⚠️ Alterações não salvas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-blue-600">Carregando dados...</div>
        </div>
      )}

      {!loading && !dados && (
        <div className="text-center py-8 text-gray-500">
          Selecione um curso e disciplina para carregar os dados
        </div>
      )}

      {!loading && dados && (
        <>
          {/* Informações da turma */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h2 className="text-lg font-semibold">
              Turma: {disciplinasFiltradas.find(d => d.disciplina_id === disciplinas)?.designacao}
            </h2>
            <p className="text-sm text-gray-600">
              Total de alunos: {dados.matriculas.length}
            </p>
          </div>

          {/* Tabela melhorada */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3 text-left sticky left-0 bg-gray-100 z-10">Nº</th>
                    <th className="border p-3 text-left sticky left-8 bg-gray-100 z-10 min-w-[200px]">Aluno</th>
                    <th className="border p-3 text-center">Situação</th>

                    {/* 1º Trimestre */}
                    <th className="border p-2 text-center bg-blue-50" colSpan={4}>1º Trimestre</th>

                    {/* 2º Trimestre */}
                    <th className="border p-2 text-center bg-green-50" colSpan={4}>2º Trimestre</th>

                    {/* 3º Trimestre */}
                    <th className="border p-2 text-center bg-yellow-50" colSpan={4}>3º Trimestre</th>

                    {/* Final */}
                    <th className="border p-2 text-center bg-red-50" colSpan={3}>Avaliação Final</th>

                    <th className="border p-3 text-center">Ações</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border p-2"></th>
                    <th className="border p-2"></th>
                    <th className="border p-2"></th>

                    {/* Labels 1º Trimestre */}
                    <th className="border p-2 text-xs">MAC1</th>
                    <th className="border p-2 text-xs">NPP1</th>
                    <th className="border p-2 text-xs">NPT1</th>
                    <th className="border p-2 text-xs">MT1</th>

                    {/* Labels 2º Trimestre */}
                    <th className="border p-2 text-xs">MAC2</th>
                    <th className="border p-2 text-xs">NPP2</th>
                    <th className="border p-2 text-xs">NPT2</th>
                    <th className="border p-2 text-xs">MT2</th>

                    {/* Labels 3º Trimestre */}
                    <th className="border p-2 text-xs">MAC3</th>
                    <th className="border p-2 text-xs">NPP3</th>
                    <th className="border p-2 text-xs">NPT3</th>
                    <th className="border p-2 text-xs">MT3</th>

                    {/* Labels Finais */}
                    <th className="border p-2 text-xs">MFA</th>
                    <th className="border p-2 text-xs">MFD</th>
                    <th className="border p-2 text-xs">MF</th>

                    <th className="border p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {dados.matriculas.map((aluno, index) => (
                    <tr key={`${aluno.id}-${index}`} className="hover:bg-gray-50">
                      <td className="border p-3 sticky left-0 bg-white z-10 font-medium">{index + 1}</td>
                      <td className="border p-3 sticky left-8 bg-white z-10 font-medium min-w-[200px]">
                        {aluno.nome_aluno}
                      </td>
                      <td className={`border p-3 text-center ${getStatusColor(aluno)}`}>
                        {aluno.situacao}
                      </td>

                      {/* 1º Trimestre */}
                      {(['mac1', 'npp1', 'npt1'] as const).map((campo) => (
                        <td key={campo} className="border p-2">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={aluno[campo] || ''}
                            onChange={(e) => handleEdit(aluno.id, campo, e.target.value)}
                            className="border rounded p-1 w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      ))}
                      <td className="border p-2 text-center font-semibold bg-blue-50">{aluno.mt1}</td>

                      {/* 2º Trimestre */}
                      {(['mac2', 'npp2', 'npt2'] as const).map((campo) => (
                        <td key={campo} className="border p-2">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={aluno[campo] || ''}
                            onChange={(e) => handleEdit(aluno.id, campo, e.target.value)}
                            className="border rounded p-1 w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      ))}
                      <td className="border p-2 text-center font-semibold bg-green-50">{aluno.mt2}</td>

                      {/* 3º Trimestre */}
                      {(['mac3', 'npp3', 'npt3'] as const).map((campo) => (
                        <td key={campo} className="border p-2">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={aluno[campo] || ''}
                            onChange={(e) => handleEdit(aluno.id, campo, e.target.value)}
                            className="border rounded p-1 w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      ))}
                      <td className="border p-2 text-center font-semibold bg-yellow-50">{aluno.mt3}</td>

                      {/* Finais */}
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={aluno.mfa || ''}
                          onChange={(e) => handleEdit(aluno.id, "mfa", e.target.value)}
                          className="border rounded p-1 w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={aluno.mfd || ''}
                          onChange={(e) => handleEdit(aluno.id, "mfd", e.target.value)}
                          className="border rounded p-1 w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className={`border p-2 text-center font-bold ${getStatusColor(aluno,true)} bg-red-50`}>
                        {aluno.mf}
                      </td>

                      <td className="border p-2">
                        <button
                          onClick={() => salvarIndividual(aluno)}
                          disabled={saving.has(aluno.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                        >
                          {saving.has(aluno.id) ? "..." : "Salvar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botões de ação */}
            <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {dados.matriculas.length} alunos carregados
                {hasUnsavedChanges && " • Existem alterações não salvas"}
              </div>

              <button
                onClick={salvarTodos}
                disabled={savingAll || !dados.matriculas.length}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingAll ? "Salvando todos..." : "Salvar Todos"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PautaPage;