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
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Configuração do disparador de e-mails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(express.json());

// ==========================================
// RESOLUÇÃO DO REQUISITO G (N1B) - Política de CORS:
// ==========================================

const dominiosPermitidos = [
    'https://pweb-projeto-1.vercel.app', 
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Libera se não tiver origin (ferramentas locais), se estiver na lista exata, 
        // OU se for qualquer link gerado pela Vercel (Preview URLs)
        if (!origin || dominiosPermitidos.includes(origin) || origin.endsWith('.vercel.app')) {
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
//  RESOLUÇÃO DO REQUISITO A (N1B) - Conexão com MongoDB em nuvem:
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
    fotoUrl: { type: String },
    role: { type: String, default: 'user' },
    twoFactorCode: { type: String },
    twoFactorExpires: { type: Date }
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
        allowedFormats: ['jpg', 'png', 'jpeg']
    }
});

const upload = multer({ storage: storage });

// ==========================================
// MIDDLEWARES DE CONTROLE
// ==========================================
const verificaDiaSemana = (req, res, next) => {
    const dataAtual = new Date();
    const diaDaSemana = dataAtual.getDay(); 
    if (diaDaSemana === 5 || diaDaSemana === 6) {   // voltar depois para 0 e 6
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
app.get('/user-profile.html', (req, res) => res.sendFile(__dirname + '/user-profile.html'));
app.get('/styles.css', (req, res) => res.sendFile(__dirname + '/styles.css'));
app.get('/script.js', (req, res) => res.sendFile(__dirname + '/script.js'));
app.get('/view.js', (req, res) => res.sendFile(__dirname + '/view.js'));

// ==========================================
// REQUISITO F (N1B) - Criptografia de senhas:
// ==========================================

// ETAPA 1 do Login: Verifica a senha e dispara o e-mail
app.post('/logar', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const usuario = await User.findOne({ email });
        
        if (!usuario || !(await bcrypt.compare(senha, usuario.password))) {
            return res.status(401).json({ erro: "Email ou senha inválidos." });
        }
        
        // Gera um código de 6 dígitos aleatório
        const codigo2FA = Math.floor(100000 + Math.random() * 900000).toString(); 
        
        // Salva no banco com validade de 10 minutos
        usuario.twoFactorCode = codigo2FA;
        usuario.twoFactorExpires = Date.now() + 10 * 60 * 1000; 
        await usuario.save();

        // Envia o e-mail
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: usuario.email,
            subject: 'Seu Código de Segurança - API',
            text: `Seu código de verificação é: ${codigo2FA}\nEle expira em 10 minutos.`
        };
        await transporter.sendMail(mailOptions);
        
        return res.json({ mensagem: "Código enviado para o e-mail.", require2FA: true, email: usuario.email });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao processar o login." });
    }
});

// ETAPA 2 do Login (Requisito H N1B): Verifica o código e entrega o Token
app.post('/verificar-2fa', async (req, res) => {
    const { email, codigo } = req.body;
    try {
        const usuario = await User.findOne({ email });

        // Se não achar o usuário, o código estiver errado, ou o tempo tiver expirado
        if (!usuario || usuario.twoFactorCode !== codigo || usuario.twoFactorExpires < Date.now()) {
            return res.status(401).json({ erro: "Código inválido ou expirado." });
        }

        // Se o código estiver certo, limpa ele do banco por segurança
        usuario.twoFactorCode = undefined;
        usuario.twoFactorExpires = undefined;
        await usuario.save();

        // Libera o Token e redireciona o usuário
        const token = jwt.sign({ usuarioId: usuario._id, email: usuario.email, role: usuario.role }, SECRET_KEY, { expiresIn: '1h' });
        
        return res.json({ mensagem: "Login confirmado com sucesso", token: token, role: usuario.role });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao verificar o código." });
    }
});

// Cadastro (Requisito C da N1A e Requisito F da N1B)
app.post('/itens', async (req, res) => {
    try {
        // Verifica se veio senha, senão define uma padrão por segurança
        const senhaOriginal = req.body.password || "123456"; 
        
        // Criptografa a senha antes de salvar com custo 10
        const senhaCriptografada = await bcrypt.hash(senhaOriginal, 10);
        
        const novoUser = new User({
            name: req.body.name,
            birth: req.body.birth,
            phone: req.body.phone,
            email: req.body.email,
            password: senhaCriptografada,
            fotoUrl: req.body.fotoUrl
        });
        
        await novoUser.save();
        res.status(201).json({ mensagem: "Item cadastrado com sucesso no banco!", item: novoUser });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao cadastrar. Verifique os dados ou se o email já existe.", detalhes: error.message });
    }
});

// ==========================================
// RESOLUÇÃO DO REQUISITO B (N1B): Salvar imagem em nuvem auxiliar
// ==========================================

app.post('/upload', (req, res) => {
    // Colocamos o upload dentro de uma função para capturar qualquer erro
    upload.single('imagem')(req, res, function (err) {
        if (err) {
            console.error("🚨 Detalhe do Erro no Upload:", err);
            return res.status(500).json({ erro: "Falha na nuvem", detalhes: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ erro: "Nenhuma imagem foi enviada pelo formulário." });
        }
        
        res.json({ 
            mensagem: "Imagem salva na nuvem com sucesso!", 
            url: req.file.path 
        });
    });
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

// Rota EXCLUSIVA DO ADMIN: Listar todos os usuários
app.get('/itens', async (req, res) => {
    // Trava de segurança: Se não for admin, bloqueia!
    if (req.usuarioLogado.role !== 'admin') {
        return res.status(403).json({ erro: "Acesso negado. Área restrita para administradores." });
    }

    try {
        const users = await User.find();
        const formatados = users.map(u => ({ id: u._id, name: u.name, birth: u.birth, phone: u.phone, email: u.email, fotoUrl: u.fotoUrl }));
        res.json(formatados);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar dados." });
    }
});

// Rota DO USUÁRIO: Ver o próprio perfil
app.get('/perfil', async (req, res) => {
    try {
        // Usa o ID que está dentro do token para buscar só aquele usuário
        const item = await User.findById(req.usuarioLogado.usuarioId);
        if (item) {
            res.json({ id: item._id, name: item.name, birth: item.birth, phone: item.phone, email: item.email, fotoUrl: item.fotoUrl });
        } else {
            res.status(404).json({ erro: "Perfil não encontrado" });
        }
    } catch (error) {
        res.status(500).json({ erro: "Erro ao carregar perfil." });
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

// ==========================================
// REQUISITO C (N1B): Edição de Registros
// ==========================================

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

// ==========================================
// RESOLUÇÃO DO REQUISITO A (N2): Exportar CSV
// ==========================================
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

// ==========================================
// RESOLUÇÃO DO REQUISITO B (N2): Backup Automático às 17h
// ==========================================

// 1. Garante que a pasta "backups" exista
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// 2. Agenda a tarefa
// Sintxe do cron (da esquerda para direita): minuto, hora, dia, mês, dia da semana de 0 a 7 (onde 0 e 7 são domingo)
// OBS: o significado da configuração de horário é: ('0 17 * * *'  minuto 0, hora 17, todos os dias)
// Para rodar a cada minuto, é só deixar um * em tudo
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
        console.log(`✅ Backup salvo com sucesso em: ${filePath}`);
        
    } catch (error) {
        console.error("Erro ao realizar o backup automático:", error);
    }
});

// ==========================================
// RESOLUÇÃO DO REQUISITO C (N2): Relatório de Monitoramento em PDF
// ==========================================
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

//ALTERAÇÃO PARA ADICIONAR O REQUISITO DE SOCKET (N2 REQUISITO E)
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log('Cliente conectado ao socket');

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// INDICAÇÃO DE STATUS DO LED ONLINE/OFFLINE (REQUISITO E N2)
let usuariosOnline = 0;

io.on('connection', (socket) => {

    usuariosOnline++;

    console.log(`Cliente conectado. Online: ${usuariosOnline}`);

    io.emit('led', {
        status: usuariosOnline > 0
    });

    socket.on('disconnect', () => {

        usuariosOnline--;

        console.log(`Cliente desconectado. Online: ${usuariosOnline}`);

        io.emit('led', {
            status: usuariosOnline > 0
        });

    });

});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () =>
    console.log(`Servidor rodando na porta ${PORT}`)
);

module.exports = app;