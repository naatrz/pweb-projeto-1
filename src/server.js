// Import das variáveis de ambiente do .env
require('dotenv').config(); 

const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const app = express();

app.use(express.json());
app.use(cors());

// Permite que o servidor do Vercel mostre os arquivos html, css e js
app.use(express.static(__dirname)); 

const SECRET_KEY = process.env.SECRET_KEY || "exemplo_de_key";

// ==========================================
//  RESOLUÇÃO DO REQUISITO A (N2B): Conexão com MongoDB em nuvem
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Conectado ao MongoDB com sucesso!"))
    .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Criando o Schema (Molde) para a coleção de Usuários no Banco
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    birth: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String } // Já preparado para o Requisito F (Criptografia)
});

const User = mongoose.model('User', UserSchema);

let registrosAcesso = [];

// ==========================================
// MIDDLEWARES DE CONTROLE
// ==========================================
const verificaDiaSemana = (req, res, next) => {
    // Comentado para você conseguir testar hoje no final de semana!
    // const dataAtual = new Date();
    // const diaDaSemana = dataAtual.getDay(); 
    // if (diaDaSemana === 0 || diaDaSemana === 6) {
    //     return res.status(403).json({ erro: "Acesso negado. A API só funciona de segunda a sexta-feira." });
    // }
    next();
};

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

// ==========================================
// ROTAS PÚBLICAS (Sem Token)
// ==========================================
app.get('/', (req, res) => res.sendFile(__dirname + '/main-page.html'));
app.get('/login.html', (req, res) => res.sendFile(__dirname + '/login.html'));
app.get('/main-page.html', (req, res) => res.sendFile(__dirname + '/main-page.html'));
app.get('/sign-up.html', (req, res) => res.sendFile(__dirname + '/sign-up.html'));
app.get('/adm.html', (req, res) => res.sendFile(__dirname + '/adm.html'));
app.get('/styles.css', (req, res) => res.sendFile(__dirname + '/styles.css'));
app.get('/script.js', (req, res) => res.sendFile(__dirname + '/script.js'));
app.get('/view.js', (req, res) => res.sendFile(__dirname + '/view.js'));

// Login (Mantido fixo por enquanto até fazermos a criptografia do Requisito F)
app.post('/logar', (req, res) => {
    const { email, senha } = req.body;
    if (email === "admin@email.com" && senha === "123456") {
        const token = jwt.sign({ usuarioId: 1, email: email }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ mensagem: "Login realizado com sucesso", token: token });
    }
    res.status(401).json({ erro: "Email ou senha inválidos" });
});

// Cadastro (Agora salva no MongoDB)
app.post('/itens', async (req, res) => {
    try {
        const novoUser = new User(req.body);
        await novoUser.save();
        res.status(201).json({ mensagem: "Item cadastrado com sucesso no banco!", item: novoUser });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao cadastrar. Verifique os dados ou se o email já existe.", detalhes: error.message });
    }
});

// ==========================================
// MIDDLEWARE DE PROTEÇÃO (Token)
// ==========================================
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

// ==========================================
// ROTAS PROTEGIDAS (Agora buscam do MongoDB)
// ==========================================

// Listar itens
app.get('/itens', async (req, res) => {
    try {
        const users = await User.find();
        // Mapeia o _id do MongoDB para id para não quebrar o frontend
        const formatados = users.map(u => ({ id: u._id, name: u.name, birth: u.birth, phone: u.phone, email: u.email }));
        res.json(formatados);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar dados no banco." });
    }
});

// Pesquisar item por ID
app.get('/itens/:id', async (req, res) => {
    try {
        const item = await User.findById(req.params.id);
        if (item) res.json({ id: item._id, name: item.name, birth: item.birth, phone: item.phone, email: item.email });
        else res.status(404).json({ erro: "Item não encontrado" });
    } catch (error) {
        res.status(400).json({ erro: "ID inválido." });
    }
});

// Deletar item
app.delete('/itens/:id', async (req, res) => {
    try {
        const itemDeletado = await User.findByIdAndDelete(req.params.id);
        if (itemDeletado) res.json({ mensagem: "Item deletado com sucesso", item: itemDeletado });
        else res.status(404).json({ erro: "Item não encontrado" });
    } catch (error) {
        res.status(400).json({ erro: "ID inválido." });
    }
});

// Logs (Mantido em memória conforme PDF)
app.get('/logs/:data', (req, res) => {
    const dataBuscada = req.params.data; 
    res.json(registrosAcesso.filter(log => log.data === dataBuscada));
});

// Gerar PDF (Agora busca os dados do MongoDB)
app.get('/relatorio/pdf', async (req, res) => {
    try {
        const users = await User.find();
        const doc = new PDFDocument();
        
        res.setHeader('Content-disposition', 'attachment; filename=lista_cadastros.pdf');
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);
        doc.fontSize(20).text('Relatório de Cadastros (MongoDB)', { align: 'center' });
        doc.moveDown();
        
        if (users.length === 0) {
            doc.fontSize(12).text('Nenhum cadastro encontrado no sistema.');
        } else {
            users.forEach(item => {
                doc.fontSize(12).text(`ID: ${item._id}`);
                doc.text(`Nome: ${item.name}`);
                doc.text(`Nascimento: ${item.birth}`);
                doc.text(`Telefone: ${item.phone}`);
                doc.text(`Email: ${item.email}`);
                doc.moveDown();
            });
        }
        doc.end();
    } catch (error) {
        res.status(500).json({ erro: "Erro ao gerar PDF do banco de dados." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

module.exports = app;