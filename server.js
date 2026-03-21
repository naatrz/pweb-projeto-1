const express = require('express');
const app = express();

app.use(express.json());

// dados
let registers = [];

// LOGIN
app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (email === "admin@email.com" && senha === "admin123") {
    return res.json({ token: "Security-token" });
  }

  res.status(401).json({ erro: "Login inválido" });
});

// MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (token === "Security-token") {
    next();
  } else {
    res.status(403).json({ erro: "Acesso negado" });
  }
}

// registros (protegido)
app.get('/registers', auth, (req, res) => {
  res.json(registers);
});

// cadastro
app.post('/registers', (req, res) => {
  const novo = req.body;
  registers.push(novo);
  res.json(novo);
});


app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});