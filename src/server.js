// Import das variáveis de ambiente do .env
require('dotenv').config(); 

const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

app.use(express.json());

// RESOLUÇÃO DO REQUISITO G (N2B): Configurar o CORS
const dominiosPermitidos = [
    'https://pweb-projeto-1.vercel.app', 
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem origin (como as feitas pelo próprio servidor) ou as que estão na lista permitida
        if (!origin || dominiosPermitidos.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Acesso negado pela política de CORS do servidor.'));
        }
    }
}));

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
    password: { type: String },
    fotoUrl: { type: String }
});

const User = mongoose.model('User', UserSchema);

let registrosAcesso = [];

// Configuração da Nuvem de Imagens
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pweb_usuarios', // Nome da pasta que será criada na nuvem
        allowed_formats: ['jpg', 'png', 'jpeg']
    }
});

const upload = multer({ storage: storage });

// ==========================================
// MIDDLEWARES DE CONTROLE
// ==========================================
const verificaDiaSemana = (req, res, next) => {
    const dataAtual = new Date();
    const diaDaSemana = dataAtual.getDay(); 
    if (diaDaSemana === 0 || diaDaSemana === 6) {
        return res.status(403).json({ erro: "Acesso negado. A API só funciona de segunda a sexta-feira." });
    }
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

// Login Criptografado (Requisito A da N1 e Requisito F da N2)
app.post('/logar', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        // 1. Procura o usuário no banco pelo email
        const usuario = await User.findOne({ email });
        
        // 2. Se não achar ou se a senha não bater (usando o bcrypt para comparar)
        if (!usuario || !(await bcrypt.compare(senha, usuario.password))) {
            return res.status(401).json({ erro: "Email ou senha inválidos." });
        }
        
        // 3. Se tudo deu certo, gera o token (agora com o ID real do banco)
        const token = jwt.sign({ usuarioId: usuario._id, email: usuario.email }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ mensagem: "Login realizado com sucesso", token: token });
        
    } catch (error) {
        res.status(500).json({ erro: "Erro ao tentar realizar o login." });
    }
});

// Cadastro (Requisito C da N1 e Requisito F da N2)
app.post('/itens', async (req, res) => {
    try {
        // Verifica se veio senha, senão define uma padrão só por segurança
        const senhaOriginal = req.body.password || "123456"; 
        
        // Criptografa a senha antes de salvar (Custo 10 é o padrão seguro)
        const senhaCriptografada = await bcrypt.hash(senhaOriginal, 10);
        
        const novoUser = new User({
            name: req.body.name,
            birth: req.body.birth,
            phone: req.body.phone,
            email: req.body.email,
            password: senhaCriptografada // Salva o hash no lugar da senha limpa
        });
        
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
// ROTAS PROTEGIDAS (MongoDB)
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

// REQUISITO C (N2B): Rota PUT para atualizar um cadastro e seus dados no BD
app.put('/itens/:id', async (req, res) => {
    try {
        // O { new: true } serve para o Mongoose devolver o registro JÁ com os dados novos
        const itemAtualizado = await User.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (itemAtualizado) {
            res.json({ mensagem: "Cadastro atualizado com sucesso!", item: itemAtualizado });
        } else {
            res.status(404).json({ erro: "Item não encontrado para atualização" });
        }
    } catch (error) {
        res.status(400).json({ erro: "Erro ao atualizar. Verifique se o ID ou os dados estão corretos.", detalhes: error.message });
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

// Gerar PDF
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

// RESOLUÇÃO DO REQUISITO B (N2B): Salvar imagem em nuvem auxiliar
app.post('/upload', upload.single('imagem'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ erro: "Nenhuma imagem foi enviada." });
    }
    
    // O Multer e o Cloudinary processam o arquivo e injetam o link público em req.file.path
    res.json({ 
        mensagem: "Imagem salva na nuvem com sucesso!", 
        url: req.file.path 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

module.exports = app;