// ==========================================
// REQUISITO H (N1B) - Autenticação de Dois Fatores (2FA):
// ==========================================

// Função para o login
let emailTentandoLogar = ""; // Guarda o e-mail temporariamente para o passo da autenticação

// Envia senha e pede o código da 2FA
async function iniciarLogin() {
    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("senha").value;

    try {
        const res = await fetch('/logar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await res.json();
        
        if (res.ok && data.require2FA) {
            emailTentandoLogar = email; // Guarda o e-mail
            // Esconde a div de senha e mostra a div de código
            document.getElementById("step-1").style.display = "none";
            document.getElementById("step-2").style.display = "block";
            alert("Senha correta! Verifique seu e-mail.");
        } else {
            alert(data.erro || "Erro ao tentar realizar o login.");
        }
    } catch (error) {
        alert("Erro ao conectar com o servidor.");
    }
}

// Envia o código e pega o Token real
async function confirmarLogin() {
    const codigo = document.getElementById("codigo-2fa").value;

    try {
        const res = await fetch('/verificar-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailTentandoLogar, codigo: codigo })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert("Login realizado com sucesso!");
            localStorage.setItem("token", data.token);

            // Redirecionamento baseado no tipo de usuário
            if (data.role === 'admin') {
                window.location.href = 'adm.html';
            } else {
                window.location.href = 'user-profile.html';
            }
        } else {
            alert(data.erro || "Código incorreto ou expirado.");
        }
    } catch (error) {
        alert("Erro ao verificar o código de segurança.");
    }
}

// ==========================================
// REQUISITO A e B (N1B) - Banco de Dados em Nuvem:
// ==========================================

// Criação de novos cadastros com a API
async function register() {
    const name = document.getElementById("full-name").value.trim();      //
    const birth = document.getElementById("date-of-birth").value.trim(); //
    const phone = document.getElementById("phone-number").value.trim();  // Armazena os dados de todos os campos
    const email = document.getElementById("email").value.trim();         //
    const password = document.getElementById("password").value.trim();   //

    // Verifica se os campos foram preenchidos
    if (!name || !birth || !phone || !email || !password) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    let fotoUrl = ""; // A foto fica vazia, pois não é obrigatória
    const fotoInput = document.getElementById("foto").files[0];

    // Se o usuário escolheu uma foto, envia para o Cloudinary primeiro
    if (fotoInput) {
        const formData = new FormData();
        formData.append("imagem", fotoInput);

        try {
            const resFoto = await fetch('/upload', {
                method: 'POST',
                body: formData // Não é necessário Content-Type ou Token
            });
            const dataFoto = await resFoto.json();
            if (resFoto.ok) fotoUrl = dataFoto.url; // Pega a URL pública gerada pelo Cloudinary
        } catch (error) {
            alert("Erro ao enviar a imagem.");
            return;
        }
    }

    // Inclui o que será enviado para a API
    const newRegister = { name, birth, phone, email, password, fotoUrl };

    try {
        const res = await fetch('/itens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRegister)
        });

        if (res.ok) {
            alert("Cadastro concluído com sucesso!");
            
            // Limpa todos os campos, incluindo a senha
            document.getElementById("full-name").value = "";
            document.getElementById("date-of-birth").value = "";
            document.getElementById("phone-number").value = "";
            document.getElementById("email").value = "";
            document.getElementById("password").value = "";
            
            // Redireciona para o login após o sucesso
            window.location.href = 'login.html';
        } else {
            const data = await res.json();
            alert("Erro ao realizar o cadastro: " + (data.erro || "Verifique os dados."));
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro ao conectar com o servidor da API.");
    }
}

// Formatação dos campos
const nameInput = document.getElementById("full-name");
nameInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\d/g, "");
});

const birthInput = document.getElementById("date-of-birth");
birthInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2 && value.length <= 4) {
        value = value.slice(0, 2) + "/" + value.slice(2);
    } else if (value.length > 4) {
        value = value.slice(0, 2) + "/" + value.slice(2, 4) + "/" + value.slice(4, 8);
    }
    e.target.value = value;
});

const phoneInput = document.getElementById("phone-number");
phoneInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        value = `(${value}`;
    }
    e.target.value = value;
});