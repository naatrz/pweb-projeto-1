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

// Busca e exibe os registros da API
async function showRegisters() {
    const listContainer = document.getElementById("registers-list");
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

            // Adicionado o botão "Editar" ao lado do "Deletar"
            div.innerHTML = `
                <p><strong>ID:</strong> ${register.id}</p>
                <p><strong>Nome:</strong> ${register.name}</p>
                <p><strong>Nascimento:</strong> ${register.birth}</p>
                <p><strong>Telefone:</strong> ${register.phone}</p>
                <p><strong>Email:</strong> ${register.email}</p>
                <div style="display: flex; gap: 10px;">
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

// RESOLUÇÃO DO REQUISITO C (N2B): Função para editar um registro no banco
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

window.onload = showRegisters;