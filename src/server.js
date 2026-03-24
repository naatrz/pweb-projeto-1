const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const app = express();

app.use(express.json());
app.use(cors());

// Permite que o servidor do Vercel mostre os arquivos html, css e js
app.use(express.static(__dirname)); 

const SECRET_KEY = "exemplo_de_key";

// RESOLUÇÃO DO REQUISITO H: Dados mockados no código 
let cadastros = [
    { id: 1, name: 'Fulano da Silva', birth: '15/05/1998', phone: '(88) 99999-9999', email: 'fulano@email.com' },
    { id: 2, name: 'Ciclana Souza', birth: '22/10/2001', phone: '(88) 98888-8888', email: 'ciclana@email.com' }
];

let registrosAcesso = [];

// RESOLUÇÃO DO REQUISITO D: Middleware que permite acesso apenas de seg a sex 
const verificaDiaSemana = (req, res, next) => {
    const dataAtual = new Date();
    const diaDaSemana = dataAtual.getDay(); 
    if (diaDaSemana === 0 || diaDaSemana === 6) {
        return res.status(403).json({ erro: "Acesso negado. A API só funciona de segunda a sexta-feira." });
    }
    next();
};

// RESOLUÇÃO DO REQUISITO E: Middleware que registra o horário e a rota da requisição 
const registraLog = (req, res, next) => {
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    const horarioFormatado = dataAtual.toTimeString().split(' ')[0];
    const novoRegistro = { data: dataFormatada, horario: horarioFormatado, metodo: req.method, rota: req.originalUrl };
    registrosAcesso.push(novoRegistro);
    console.log(`[LOG] ${novoRegistro.data} ${novoRegistro.horario} - ${novoRegistro.metodo} ${novoRegistro.rota}`);
    next();
};

app.use(verificaDiaSemana);
app.use(registraLog);


// ROTAS PÚBLICAS

// RESOLUÇÃO DO REQUISITO A: Rota POST '/logar' que devolve um token válido 
app.post('/logar', (req, res) => {
    const { email, senha } = req.body;
    if (email === "admin@email.com" && senha === "123456") {
        const token = jwt.sign({ usuarioId: 1, email: email }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ mensagem: "Login realizado com sucesso", token: token });
    }
    res.status(401).json({ erro: "Email ou senha inválidos" });
});

// RESOLUÇÃO DO REQUISITO C: Rota POST para inserir um novo item 
app.post('/itens', (req, res) => {
    const novoItem = req.body;
    novoItem.id = cadastros.length ? cadastros[cadastros.length - 1].id + 1 : 1;
    cadastros.push(novoItem);
    res.status(201).json({ mensagem: "Item cadastrado com sucesso!", item: novoItem });
});


// MIDDLEWARE DE PROTEÇÃO (token do Requisito A)
const verificaToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ erro: "Token não fornecido. Faça login para acessar." });
    }
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ erro: "Token inválido ou expirado." });
        req.usuarioLogado = decoded;
        next();
    });
};

app.use(verificaToken);


// ROTAS PROTEGIDAS (que xigem o token)

// RESOLUÇÃO DO REQUISITO B: Rota GET para obter uma lista de itens 
app.get('/itens', (req, res) => res.json(cadastros));

// RESOLUÇÃO DO REQUISITO F: Rota GET para pesquisar um item pelo código 
app.get('/itens/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = cadastros.find(c => c.id === id);
    if (item) res.json(item);
    else res.status(404).json({ erro: "Item não encontrado" });
});

// RESOLUÇÃO DO REQUISITO D: Rota DELETE para excluir um item 
app.delete('/itens/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = cadastros.findIndex(c => c.id === id);
    if (index !== -1) {
        const itemDeletado = cadastros.splice(index, 1);
        res.json({ mensagem: "Item deletado com sucesso", item: itemDeletado });
    } else res.status(404).json({ erro: "Item não encontrado" });
});

// RESOLUÇÃO DO REQUISITO F (Logs): Rota GET que retorna os registros de uma data 
app.get('/logs/:data', (req, res) => {
    const dataBuscada = req.params.data; 
    res.json(registrosAcesso.filter(log => log.data === dataBuscada));
});

// RESOLUÇÃO DO REQUISITO G: Rota GET que gera um arquivo PDF para download com a lista 
app.get('/relatorio/pdf', (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-disposition', 'attachment; filename=lista_cadastros.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);
    doc.fontSize(20).text('Relatório de Cadastros - Sprint 1', { align: 'center' });
    doc.moveDown();
    if (cadastros.length === 0) doc.fontSize(12).text('Nenhum cadastro encontrado no sistema.');
    else {
        cadastros.forEach(item => {
            doc.fontSize(12).text(`ID: ${item.id}`);
            doc.text(`Nome: ${item.name}`);
            doc.text(`Nascimento: ${item.birth}`);
            doc.text(`Telefone: ${item.phone}`);
            doc.text(`Email: ${item.email}`);
            doc.moveDown();
        });
    }
    doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

module.exports = app;