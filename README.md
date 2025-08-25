# 📚 Lança Nota – Sistema de Lançamento de Notas

Um sistema web fullstack para **lançamento, consulta e gerenciamento de notas de alunos**, desenvolvido com **Go (Gin + GORM)** no backend e **Next.js (React + TypeScript)** no frontend.  

---

## 🚀 Tecnologias Utilizadas

### Backend
- [Go](https://go.dev/)  
- [Gin](https://gin-gonic.com/) – Web Framework  
- [GORM](https://gorm.io/) – ORM para banco de dados  
- REST API para comunicação com o frontend  

### Frontend
- [Next.js](https://nextjs.org/)  
- [React](https://react.dev/)  
- [TypeScript](https://www.typescriptlang.org/)  
- [Axios](https://axios-http.com/) para requisições HTTP  
- TailwindCSS para estilização  

---

## ✨ Funcionalidades

- 🔍 Buscar cursos e disciplinas disponíveis  
- 📝 Lançamento de notas por aluno e por trimestre  
- 📊 Cálculo automático das médias (trimestral, final e de frequência)  
- 💾 Salvamento individual ou em lote  
- ⚡ Cache local (localStorage) para evitar perda de dados  
- 🔔 Sistema de notificações (sucesso, erro e avisos)  
- ✅ Validações de notas (limite de 0 a 10/20 conforme curso)  
- 🟢 Status visual de cada aluno (aprovado, recuperação, reprovado)  

---

## 🏗️ Estrutura do Projeto


lanca-nota/
│── config/ # Configurações do backend
│── controllers/ # Controllers da API em Go
│── data/ # Estruturas auxiliares
│── database/ # Configuração do banco de dados
│── models/ # Modelos GORM
│── routes/ # Rotas da API Gin
│── services/ # Lógica de negócio
│── lancar-nota-front_end-nextjs/ # Aplicação Next.js
│── main.go # Entry point do backend
│── go.mod / go.sum # Dependências Go



## ⚙️ Como Rodar o Projeto

### Backend (Go)
```bash
# entre na pasta raiz
cd lanca-nota

# instalar dependências
go mod tidy

# rodar servidor backend
go run main.go


Servidor sobe em: **[http://localhost:8080](http://localhost:8080)**


### Frontend (Next.js)

**bash**
# entrar na pasta do frontend
cd lancar-nota-front_end-nextjs

# instalar dependências
npm install

# rodar servidor frontend
npm run dev


Servidor sobe em: **[http://localhost:3000](http://localhost:3000)**

---

## 📷 Preview do Sistema

* Tela principal: seleção de curso e disciplina
* Tabela de alunos com campos editáveis para notas
* Notificações de sucesso/erro ao salvar
* Indicação visual de aprovação, recuperação ou reprovação


## 📌 Próximos Passos

* [ ] Autenticação de professores/administradores
* [ ] Relatórios em PDF/Excel
* [ ] Controle de permissões por disciplina
* [ ] Deploy em ambiente cloud (Heroku, Railway ou Vercel)


## 👨‍💻 Autor

Projeto desenvolvido no curso de Go + Next.js para gestão acadêmica.



