// Login de ADM
async function login() {
    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("senha").value;

    try {
        const res = await fetch('/logar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await res.json();

        if (res.ok) {
            // Guarda o token no localStorage para usar depois
            localStorage.setItem('token', data.token);
            window.location.href = 'adm.html';
        } else {
            alert(data.erro || "Usuário ou senha incorretos.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar com o servidor.");
    }
}

// Criação de novos cadastros com a API
async function register() {
    const name = document.getElementById("full-name").value.trim();
    const birth = document.getElementById("date-of-birth").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim(); // Pega a senha digitada

    // Verifica se a senha também foi preenchida
    if (!name || !birth || !phone || !email || !password) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    // Agora inclui o password no objeto que vai para a API
    const newRegister = { name, birth, phone, email, password };

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