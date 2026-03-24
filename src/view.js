// Função auxiliar para pegar o token escondido nos bastidores
async function fetchToken() {
    const loginRes = await fetch('/logar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "admin@email.com", senha: "123456" })
    });
    const data = await loginRes.json();
    return data.token;
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
        listContainer.innerHTML = ""; // Limpa a mensagem

        if (registers.length === 0) {
            const msg = document.createElement("p");
            msg.textContent = "Nenhum cadastro encontrado na API.";
            msg.style.fontStyle = "italic";
            msg.style.color = "#555";
            listContainer.appendChild(msg);
            return;
        }

        registers.forEach((register, index) => {
            const div = document.createElement("div");
            div.classList.add("register");

            div.innerHTML = `
                <p><strong>ID:</strong> ${register.id}</p>
                <p><strong>Nome:</strong> ${register.name}</p>
                <p><strong>Nascimento:</strong> ${register.birth}</p>
                <p><strong>Telefone:</strong> ${register.phone}</p>
                <p><strong>Email:</strong> ${register.email}</p>
                <button onclick="deleteRegister(${register.id})">Deletar</button>
            `;

            listContainer.appendChild(div);

            if (index < registers.length - 1) {
                const hr = document.createElement("hr");
                listContainer.appendChild(hr);
            }
        });
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = "<p style='color: red;'>Erro ao carregar dados do servidor. Verifique se a API está rodando.</p>";
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

window.onload = showRegisters;