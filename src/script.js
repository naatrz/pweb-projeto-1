function createRegister(name, birth, phone, email) {
    return {
        name: name,
        birth: birth,
        phone: phone,
        email: email
    };
}

function register() {
    const name = document.getElementById("full-name").value.trim();
    const birth = document.getElementById("date-of-birth").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!name || !birth || !phone || !email) {
        alert("Por favor, preencha todos os campos corretamente.")
        return;
    }

    const newRegister = createRegister(name, birth, phone, email);

    let list = JSON.parse(localStorage.getItem("registers")) || [];

    list.push(newRegister);

    localStorage.setItem("registers", JSON.stringify(list));

    document.getElementById("full-name").value = "";
    document.getElementById("date-of-birth").value = "";
    document.getElementById("phone-number").value = "";
    document.getElementById("email").value = "";

    alert("Cadastro concluído")
}

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

    if (value.length > 11) {
        value = value.slice(0, 11);
    }

    if (value.length > 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        value = `(${value}`;
    }

    e.target.value = value;
});