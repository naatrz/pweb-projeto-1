<div align="center"><a name="readme-top"></a>
  
  # Programação Web 2 </br>
  <h3> Projeto N1B - Cadastro de usuários </h3>

</div>

</br>

<details>
  <summary>
    <kbd>
      Sumário
    </kbd>
  </summary>

  #### Sumário
  - [🔍 Overview](#-overview)
  - [🚀 Funcionalidades e Requisitos Atendidos](#-funcionalidades-e-requisitos-atendidos)
  - [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
  - [ℹ️ Setup e Instalação](#-setup-e-instalação)
  - [🎤 Roteiro para Apresentação (Guia)](#-roteiro-para-apresentação-guia)</details>


## 🔍 Overview

Este projeto é uma API RESTful completa desenvolvida em Node.js com banco de dados em nuvem, focada em segurança, autenticação e controle de acesso. O sistema conta com separação de perfis (Administrador e Usuário Comum), upload de arquivos e autenticação em duas etapas (2FA).

## 🚀 Funcionalidades e Requisitos Atendidos

*   **[Requisito A] Banco de Dados em Nuvem:** Dados estruturados e armazenados no MongoDB Atlas.

*   **[Requisito B] Upload de Imagens:** Fotos de perfil são enviadas para a nuvem através da integração com o Cloudinary e o link público é salvo no banco de dados, o que permite a exibição na interface do site.

*   **[Requisito C] Edição de Registros:** Rota `PUT /itens/:id` implementada para atualização de dados dos usuários diretamente no banco.

*   **[Requisito F] Criptografia de Senhas:** Nenhuma senha é salva em texto limpo. Utilizamos a biblioteca `bcrypt` para gerar hashes seguros e irreversíveis no momento do cadastro.

*   **[Requisito G] Política de CORS:** API blindada com configuração de CORS permitindo requisições apenas do domínio da Vercel e do localhost, garantindo que servidores de terceiros não acessem o banco de dados.

*   **[Requisito H] Autenticação de Dois Fatores (2FA):** Sistema de segurança no login com envio de código de 6 dígitos via e-mail (usando `nodemailer`), validado no backend antes da emissão do token JWT.

*   **[Extra] Controle de Acesso (RBAC):** Sistema de rotas protegidas que diferencia `admin` (visualiza todos os usuários e gera relatórios em PDF) de `user` (visualiza apenas o próprio perfil).

## 🛠️ Tecnologias Utilizadas

*   **Backend:** Node.js, Express
*   **Banco de Dados:** MongoDB e Mongoose
*   **Segurança:** JWT (JSON Web Tokens), Bcrypt, CORS
*   **Serviços em Nuvem:** Cloudinary (Imagens), Nodemailer (E-mail transacional)
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API)

## ℹ️ Setup e Instalação

Para rodar este projeto localmente na sua máquina:

1. Clone o repositório.
2. Instale as dependências executando o comando no terminal:
   ```bash
      npm install

## 🙋🏻‍♀️ Desenvolvedoras
- [Ana Beatriz Viana dos Santos](https://github.com/naatrz) </br>
- [Ana Quezia Silva Soares](https://github.com/AnaQuezia06)

<div align="right">
  <a href="#readme-top" style="text-decoration: none;">
    <kbd>VOLTAR AO TOPO</kbd>
  </a>
</div>