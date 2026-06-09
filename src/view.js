// Captura de token
function fetchToken() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert("Você precisa estar logado para acessar esta área.");
        window.location.href = 'login.html';
        return null;
    }
    
    return token;
}

async function carregarPerfil() {
    const token = localStorage.getItem('token') || (typeof fetchToken === 'function' ? await fetchToken() : null);
    
    if (!token) {
        alert("Você precisa estar logado para ver o perfil.");
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch('/perfil', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const perfil = await res.json();
            const divPerfil = document.getElementById('dados-perfil');

            // Prepara a imagem
            let imagemHtml = perfil.fotoUrl 
                ? `<img src="${perfil.fotoUrl}" alt="Sua Foto" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 15px;">` 
                : `<p style="text-align:center; color: #888; font-style: italic;">Sem foto de perfil</p>`;

            // Injeta o HTML na tela
            divPerfil.innerHTML = `
                ${imagemHtml}
                <p><strong>Nome:</strong> ${perfil.name}</p>
                <p><strong>Email:</strong> ${perfil.email}</p>
                <p><strong>Nascimento:</strong> ${perfil.birth}</p>
                <p><strong>Telefone:</strong> ${perfil.phone}</p>
            `;
        } else {
            alert("Sessão expirada ou acesso negado. Faça login novamente.");
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        document.getElementById('dados-perfil').innerHTML = "<p style='color: red;'>Erro ao comunicar com o servidor.</p>";
    }
}

function sair() {
    // Apaga o token do navegador e manda de volta pro login
    localStorage.removeItem('token'); 
    window.location.href = 'login.html';
}

// Busca e exibe os registros da API
async function showRegisters() {
    const listContainer = document.getElementById("registers-list");

    if (!listContainer) return;

    listContainer.innerHTML = "<p>Carregando cadastros do servidor...</p>";

    try {
        const token = await fetchToken();
        const res = await fetch('/itens', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const registers = await res.json();
        listContainer.innerHTML = ""; 

        if (registers.length === 0) {
            listContainer.innerHTML = "<p style='font-style: italic; color: #555;'>Nenhum cadastro encontrado.</p>";
            return;
        }

        registers.forEach((register, index) => {
            const div = document.createElement("div");
            div.classList.add("register");

            let imagemHtml = register.fotoUrl 
                ? `<img src="${register.fotoUrl}" alt="Foto de Perfil" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">` 
                : `<p style="color: #888; font-style: italic;">Sem foto de perfil</p>`;

            div.innerHTML = `
                ${imagemHtml}
                <p><strong>ID:</strong> ${register.id}</p>
                <p><strong>Nome:</strong> ${register.name}</p>
                <p><strong>Nascimento:</strong> ${register.birth}</p>
                <p><strong>Telefone:</strong> ${register.phone}</p>
                <p><strong>Email:</strong> ${register.email}</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="editRegister('${register.id}', '${register.name}', '${register.email}', '${register.phone}', '${register.birth}')" style="background-color: #6a5acd;">Editar</button>
                    <button onclick="deleteRegister('${register.id}')" style="background-color: #cf222e;">Deletar</button>
                </div>
            `;

            listContainer.appendChild(div);

            if (index < registers.length - 1) {
                listContainer.appendChild(document.createElement("hr"));
            }
        });
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = "<p style='color: red;'>Erro ao carrergar dados do MongoDB.</p>";
    }
}

// ==========================================
// RESOLUÇÃO DO REQUISITO C (N1B): Função para editar um registro no banco
// ==========================================

async function editRegister(id, oldName, oldEmail, oldPhone, oldBirth) {
    // Usando prompt para simplificar a entrada de dados na apresentação
    const newName = prompt("Novo nome:", oldName);
    const newEmail = prompt("Novo e-mail:", oldEmail);
    const newPhone = prompt("Novo telefone:", oldPhone);
    const newBirth = prompt("Nova data de nascimento:", oldBirth);

    if (!newName || !newEmail) return; // Cancela se campos básicos estiverem vazios

    const updatedData = {
        name: newName,
        email: newEmail,
        phone: newPhone,
        birth: newBirth
    };

    try {
        const token = await fetchToken();
        const res = await fetch(`/itens/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(updatedData)
        });

        if (res.ok) {
            alert("Cadastro atualizado no MongoDB com sucesso!");
            showRegisters(); // Recarrega a lista atualizada
        } else {
            const err = await res.json();
            alert("Erro ao editar: " + err.erro);
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar com o servidor para editar.");
    }
}

// Deleta um registro
async function deleteRegister(id) {
    if (!confirm("Tem certeza que deseja deletar este cadastro?")) return;

    try {
        const token = await fetchToken();
        const res = await fetch(`/itens/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showRegisters(); 
        } else {
            alert("Erro ao tentar deletar o item.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar com o servidor para deletar.");
    }
}

// Download de PDF
async function downloadPDF() {
    try {
        const token = await fetchToken();
        const res = await fetch('/relatorio/pdf', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error("Falha ao buscar o PDF");
        }

        // Transforma a resposta binária em um arquivo (Blob)
        const blob = await res.blob();
        
        // Cria um link temporário na memória do navegador
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lista_cadastros.pdf'; // O nome do arquivo que vai baixar
        
        // Simula o clique para iniciar o download e depois limpa o link
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error(error);
        alert("Erro ao tentar gerar e baixar o relatório em PDF.");
    }
}

// ==========================================
// RESOLUÇÃO DO REQUISITO A (N2): Exportar CSV
// ==========================================
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

// ==========================================
// RESOLUÇÃO DO REQUISITO C (N2): Relatório de Monitoramento em PDF
// ==========================================
async function baixarMonitoramento() {
    try {
        const token = await fetchToken();
        const res = await fetch('/relatorio/monitoramento', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error("Falha ao buscar o PDF de monitoramento");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'monitoramento_sistema.pdf'; 
        
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error(error);
        alert("Erro ao tentar baixar o relatório de monitoramento.");
    }
}

// Separa a tela de usuário comum e de adm
document.addEventListener("DOMContentLoaded", () => {
    // Se achou a lista de registros, estamos na tela do Admin
    if (document.getElementById("registers-list")) {
        showRegisters();
    }
    
    // Se achou a div de perfil, estamos na tela do Usuário Comum
    if (document.getElementById("dados-perfil")) {
        carregarPerfil();
    }
});

// ==========================================
// REQUISITO E e F - Socket + LED Virtual
// ==========================================

const socket = io();

socket.on('led', (dados) => {

    const led = document.getElementById('led');

    if (!led) return;

    if (dados.status) {
        led.style.backgroundColor = 'green';
        led.innerHTML = 'ONLINE';
    } else {
        led.style.backgroundColor = 'gray';
        led.innerHTML = 'OFFLINE';
    }

});