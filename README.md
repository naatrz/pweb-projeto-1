<div align="center"><a name="readme-top"></a>
  
  # Programação Web 2 </br>
  <h3> Projeto N2 - Cadastro de usuários </h3>

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

Este projeto é uma API RESTful completa desenvolvida em Node.js com banco de dados em nuvem, focada em segurança, autenticação e controle de acesso. O sistema conta com separação de perfis (Administrador e Usuário Comum), upload de arquivos, autenticação em duas etapas (2FA), monitoramento de rede em tempo real via WebSockets e relatórios dinâmicos.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js, Express
* **Banco de Dados:** MongoDB e Mongoose
* **Segurança:** JWT (JSON Web Tokens), Bcrypt, CORS
* **Serviços em Nuvem:** Cloudinary (Imagens), Nodemailer (E-mail transacional)
* **Relatórios e Dados:** PDFKit, exportação para CSV
* **Tarefas Automatizadas:** Node-Cron (Tarefas agendadas)
* **Tempo Real:** Socket.io
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API)

## 🚀 Funcionalidades e Requisitos Atendidos

* **[Requisito A] Exportar Dados (CSV):** A rota responsável pela exportação dos registros no formato CSV foi a `/relatorio/csv`. O backend faz uma busca no banco do MongoDB (`User.find()`), pega os dados dos usuários e formata tudo em uma string separada por vírgulas. O cabeçalho da resposta (`res.header`) foi configurado para `text/csv`. Isso força o navegador a entender que é um arquivo e fazer o download instantâneo.

    **Rota `/relatorio/csv` no `server.js`:**
    ```javascript
    app.get('/relatorio/csv', async (req, res) => {
        try {
            const users = await User.find();

            // 1. Gera o cabeçalho do arquivo CSV
            let csv = 'ID,Nome,Nascimento,Telefone,Email,Cargo\n';

            // 2. Preenche com os dados dos usuários
            users.forEach(u => {
                // As aspas duplas protegem os dados caso alguém coloque uma vírgula no nome
                csv += `"${u._id}","${u.name}","${u.birth}","${u.phone}","${u.email}","${u.role}"\n`;
            });

            // 3. Avisa ao navegador o arquivo é para download
            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.header('Content-Disposition', 'attachment; filename=usuarios.csv');
            res.send(csv);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao gerar arquivo CSV." });
        }
    });
    ```

    **Rota `/relatorio/csv` sendo chamada no `view.js`:**
    ```javascript
    async function exportarCSV() {
        try {
            const token = await fetchToken();
            const res = await fetch('/relatorio/csv', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error("Falha ao buscar o CSV");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'usuarios.csv'; 
            
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error(error);
            alert("Erro ao tentar gerar e baixar o relatório em CSV.");
        }
    }
    ```

* **[Requisito B] Backup Automático:** Para o backup automático, nós utilizamos a biblioteca `node-cron`. Ela funciona como um 'despertador' interno do Node.js. Nós programamos uma rotina que, no horário agendado, repete a lógica do Requisito A, mas em vez de enviar para o navegador, ela usa o módulo nativo `fs` (File System) para criar e salvar um arquivo físico `.csv` direto no HD do servidor, dentro da pasta backups.

    **`cron.schedule` no `server.js`:**
    ```javascript
    cron.schedule('40 20 * * *', async () => {
        console.log("Iniciando backup diário automático (20:40)...");
        
        try {
            const users = await User.find();
            
            // Mesma lógica do CSV
            let csv = 'ID,Nome,Nascimento,Telefone,Email,Cargo\n';
            users.forEach(u => {
                csv += `"${u._id}","${u.name}","${u.birth}","${u.phone}","${u.email}","${u.role}"\n`;
            });

            // Cria um nome de arquivo com a data do dia
            const dataAtual = new Date().toISOString().split('T')[0];
            const fileName = `backup_usuarios_${dataAtual}.csv`;
            const filePath = path.join(backupDir, fileName);

            // Salva o arquivo na pasta do servidor
            fs.writeFileSync(filePath, csv);
            console.log(`Backup salvo com sucesso em: ${filePath}`);
            
        } catch (error) {
            console.error("Erro ao realizar o backup automático:", error);
        }
    });
    ```

* **[Requisito C] Monitoramento do Sistema (PDF):** O middleware de logs foi reaproveitado para que cada vez que uma rota é acessada, ele salva a data, hora e o caminho acessado na memória. Para esse relatório, a rota `/relatorio/monitoramento` varre esse array, filtra apenas os acessos do mês atual, conta as repetições para encontrar o horário de pico e usa a biblioteca PDFKit para desenhar e entregar esse PDF dinâmico apenas para quem tem o cargo de administrador.
    
    **Rota `/relatorio/monitoramento` no `server.js`:**
    ```javascript
    app.get('/relatorio/monitoramento', async (req, res) => {
        // Trava de segurança: apenas um adm pode gerar esse relatório
        if (req.usuarioLogado.role !== 'admin') {
            return res.status(403).json({ erro: "Acesso negado." });
        }

        try {
            const doc = new PDFDocument();
            res.setHeader('Content-disposition', 'attachment; filename=monitoramento.pdf');
            res.setHeader('Content-type', 'application/pdf');
            doc.pipe(res);

            // 1. Pega o mês atual no formato "YYYY-MM"
            const dataAtual = new Date();
            const mesAtual = dataAtual.toISOString().slice(0, 7); 

            // 2. Filtra apenas os logs do mês atual
            const logsDoMes = registrosAcesso.filter(log => log.data.startsWith(mesAtual));

            // 3. Conta acessos por rota e por horário
            const contagemRotas = {};
            const contagemHoras = {};

            logsDoMes.forEach(log => {
                // Conta as rotas
                contagemRotas[log.rota] = (contagemRotas[log.rota] || 0) + 1;
                
                // Pega apenas a hora e conta
                const hora = log.horario.split(':')[0]; 
                contagemHoras[hora] = (contagemHoras[hora] || 0) + 1;
            });

            // 4. Calcula o horário de pico
            let horaPico = "N/A";
            let maxAcessos = 0;
            for (const [hora, acessos] of Object.entries(contagemHoras)) {
                if (acessos > maxAcessos) {
                    maxAcessos = acessos;
                    horaPico = `${hora}:00 - ${hora}:59`;
                }
            }

            // 5. Desenha as informações no PDF
            doc.fontSize(20).text(`Relatório de Monitoramento - ${mesAtual}`, { align: 'center' });
            doc.moveDown();

            doc.fontSize(14).text(`Horário de Pico de Uso: ${horaPico} (${maxAcessos} acessos)`);
            doc.moveDown();

            doc.fontSize(14).text('Acessos por Rota:');
            doc.fontSize(12);
            
            if (Object.keys(contagemRotas).length === 0) {
                doc.text('Nenhum acesso registrado neste mês ainda.');
            } else {
                for (const [rota, qtd] of Object.entries(contagemRotas)) {
                    doc.text(`- Rota ${rota}: ${qtd} vez(es)`);
                }
            }

            doc.end();
        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: "Erro ao gerar PDF de monitoramento." });
        }
    });
    ```

* **[Requisito D] Stream de Vídeo:** Para o stream de vídeo, adicionamos o widget global na parte inferior da página. O vídeo não é carregado de uma vez só. O HTML pede o vídeo usando a rota `/stream`. No Node.js, nós lemos os cabeçalhos da requisição (`req.headers.range`) para saber qual 'pedaço' do vídeo o navegador quer. Usamos o `fs.createReadStream` para enviar o arquivo em pequenos blocos (chunks) com o status HTTP 206 (Conteúdo Parcial), sendo essa a mesma lógica que a Netflix e YouTube usam.

* **[Requisitos E e F] Sockets + Sensor Virtual:** O socket e o sensor estão incluidos na mesma funcionalidade. Usamos o `socket.io` para criar uma via de mão dupla em tempo real. O nosso 'Sensor Virtual' mede o tráfego da rede, controlando a variável `usuariosOnline` sempre que alguém conecta ou desconecta. Se houver tráfego (usuários > 0), o servidor emite um evento de pulso ('led', status: true) que acende a luz verde no frontend de todo mundo simultaneamente. Se zerar, ou o servidor cair, o sensor detecta e a luz fica cinza na hora.

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