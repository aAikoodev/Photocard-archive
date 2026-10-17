
/* ========================================
   PHOTOCARD ARCHIVE
   Funcionalidades principais
======================================== */

/* CONFIGURAÇÕES E DADOS */

const rarities = ["Comum", "Incomum", "Rara", "Épica", "Lendária"];

const rarityWeights = {
    "Comum": 50,
    "Incomum": 25,
    "Rara": 15,
    "Épica": 8,
    "Lendária": 2
};

const rarityColors = {
    "Comum": "comum",
    "Incomum": "incomum",
    "Rara": "rara",
    "Épica": "epica",
    "Lendária": "lendaria"
};

const packPrices = {
    1: 100,
    2: 180,
    5: 400
};

const defaultState = {
    seriesName: "Blue Eye Samurai",
    coins: 500,
    points: 0,
    duplicatePoints: 10,
    nextId: 1,
    cards: [],
    inventory: {},
    activity: [],
    completedMissions: [],
    tradeHistory: [],
    totalCoinsEarned: 0
};

let state = loadState();

/* ACESSO AOS ELEMENTOS */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

/* SALVAMENTO */

function loadState() {
    try {
        const saved = localStorage.getItem("photocardArchive");

        if (!saved) {
            return structuredClone(defaultState);
        }

        const parsed = JSON.parse(saved);

        return {
            ...structuredClone(defaultState),
            ...parsed,
            cards: Array.isArray(parsed.cards) ? parsed.cards : [],
            inventory: parsed.inventory || {},
            activity: Array.isArray(parsed.activity) ? parsed.activity : [],
            completedMissions: Array.isArray(parsed.completedMissions)
                ? parsed.completedMissions
                : [],
            tradeHistory: Array.isArray(parsed.tradeHistory)
                ? parsed.tradeHistory
                : []
        };
    } catch (error) {
        console.error("Não foi possível carregar os dados:", error);
        return structuredClone(defaultState);
    }
}

function saveState() {
    try {
        localStorage.setItem("photocardArchive", JSON.stringify(state));
    } catch (error) {
        console.error("Não foi possível salvar os dados:", error);
        showToast("Não foi possível salvar. Verifique o armazenamento do navegador.", "error");
    }
}

/* UTILITÁRIOS */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function normalizeRarity(rarity) {
    return rarityColors[rarity] || "comum";
}

function getInventoryCount(cardId) {
    return Math.max(0, Number(state.inventory[cardId]) || 0);
}

function getOwnedUniqueCount() {
    return state.cards.filter(card => getInventoryCount(card.id) > 0).length;
}

function getTotalCopies() {
    return Object.values(state.inventory).reduce(
        (total, amount) => total + Math.max(0, Number(amount) || 0),
        0
    );
}

function getDuplicateCount() {
    return state.cards.reduce((total, card) => {
        return total + Math.max(0, getInventoryCount(card.id) - 1);
    }, 0);
}

function getPercentage() {
    if (state.cards.length === 0) return 0;

    return Math.round((getOwnedUniqueCount() / state.cards.length) * 100);
}

function addActivity(message) {
    state.activity.unshift({
        message,
        date: new Date().toLocaleString("pt-BR")
    });

    state.activity = state.activity.slice(0, 12);
}

function showToast(message, type = "") {
    const container = $("#toast-container");

    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

/* NAVEGAÇÃO */

function showPage(pageId) {
    $$(".page").forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    $$(".nav-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

$$("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});

/* CATÁLOGO: CADASTRAR E EDITAR */

function openCardModal(card = null) {
    $("#card-modal").hidden = false;
    $("#card-form").reset();

    $("#card-edit-id").value = card ? card.id : "";
    $("#card-form-title").textContent = card
        ? "Editar photocard"
        : "Adicionar photocard";

    if (card) {
        $("#card-name").value = card.name;
        $("#card-episode").value = card.episode || "";
        $("#card-character").value = card.character || "";
        $("#card-rarity").value = card.rarity;
        $("#card-image").value = card.image || "";
        $("#card-description").value = card.description || "";
    } else {
        $("#card-rarity").value = "Comum";
    }
}

function closeCardModal() {
    $("#card-modal").hidden = true;
}

$("#add-card-button").addEventListener("click", () => {
    openCardModal();
});

$("#close-card-modal").addEventListener("click", closeCardModal);
$("#cancel-card").addEventListener("click", closeCardModal);

$("#card-modal").addEventListener("click", event => {
    if (event.target.id === "card-modal") {
        closeCardModal();
    }
});

$("#card-form").addEventListener("submit", event => {
    event.preventDefault();

    const editId = $("#card-edit-id").value;

    const name = $("#card-name").value.trim();
    const episode = $("#card-episode").value.trim();
    const character = $("#card-character").value.trim();
    const rarity = $("#card-rarity").value;
    const image = $("#card-image").value.trim();
    const description = $("#card-description").value.trim();

    if (!name) {
        showToast("Digite o nome do photocard.", "error");
        return;
    }

    if (image && !/^(https?:\/\/|\.{0,2}\/)/i.test(image)) {
        showToast("Use um endereço de imagem válido ou um caminho relativo.", "error");
        return;
    }

    if (editId) {
        const card = state.cards.find(item => item.id === editId);

        if (!card) {
            showToast("Esse card não foi encontrado.", "error");
            return;
        }

        Object.assign(card, {
            name,
            episode,
            character,
            rarity,
            image,
            description
        });

        addActivity(`Card editado: ${name}`);
        showToast("Photocard atualizado!", "success");
    } else {
        const card = {
            id: `PC-${String(state.nextId).padStart(4, "0")}`,
            name,
            episode,
            character,
            rarity,
            image,
            description
        };

        state.nextId += 1;
        state.cards.push(card);
        state.inventory[card.id] = 0;

        addActivity(`Card cadastrado: ${name}`);
        showToast("Photocard cadastrado!", "success");
    }

    saveState();
    closeCardModal();
    renderAll();
});

/* EXCLUIR CARDS */

function deleteCard(cardId) {
    const card = state.cards.find(item => item.id === cardId);

    if (!card) return;

    const copies = getInventoryCount(cardId);

    if (copies > 0) {
        showToast("Não é possível excluir um card que está na sua coleção.", "error");
        return;
    }

    if (!confirm(`Excluir "${card.name}" do catálogo?`)) return;

    state.cards = state.cards.filter(item => item.id !== cardId);
    delete state.inventory[cardId];

    addActivity(`Card excluído: ${card.name}`);
    saveState();
    renderAll();
    showToast("Card excluído do catálogo.", "success");
}

/* FILTROS */

function renderFilters() {
    const episodeSelects = [
        $("#episode-filter")
    ];

    const raritySelects = [
        $("#rarity-filter"),
        $("#collection-rarity-filter")
    ];

    const episodes = [...new Set(
        state.cards
            .map(card => card.episode)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

    episodeSelects.forEach(select => {
        const oldValue = select.value;

        select.innerHTML = '<option value="all">Todos os episódios</option>';

        episodes.forEach(episode => {
            const option = document.createElement("option");
            option.value = episode;
            option.textContent = episode;
            select.appendChild(option);
        });

        if (episodes.includes(oldValue)) select.value = oldValue;
    });

    raritySelects.forEach(select => {
        const oldValue = select.value;

        select.innerHTML = '<option value="all">Todas as raridades</option>';

        rarities.forEach(rarity => {
            const option = document.createElement("option");
            option.value = rarity;
            option.textContent = rarity;
            select.appendChild(option);
        });

        if (rarities.includes(oldValue)) select.value = oldValue;
    });
}

/* EXIBIÇÃO DOS PHOTOCARDS */

function createPhotocardHTML(card, options = {}) {
    const copies = getInventoryCount(card.id);
    const rarityClass = normalizeRarity(card.rarity);

    const imageHTML = card.image
        ? `<img src="${escapeHTML(card.image)}" alt="${escapeHTML(card.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
           <span class="photocard-placeholder" style="display:none">✦</span>`
        : '<span class="photocard-placeholder">✦</span>';

    let actions = "";

    if (options.catalog) {
        actions = `
            <div class="photocard-actions">
                <button data-action="edit" data-id="${escapeHTML(card.id)}">Editar</button>
                <button data-action="delete" data-id="${escapeHTML(card.id)}">Excluir</button>
            </div>
        `;
    }

    if (options.collection) {
        actions = `
            <div class="photocard-actions">
                <button data-action="details" data-id="${escapeHTML(card.id)}">Detalhes</button>
            </div>
        `;
    }

    return `
        <article class="photocard">
            <div class="photocard-image">
                ${imageHTML}
            </div>

            <h3>${escapeHTML(card.name)}</h3>

            <p>${escapeHTML(card.character || "Personagem não informado")}</p>
            <p>${escapeHTML(card.episode || "Episódio não informado")}</p>

            <span class="rarity-badge ${rarityClass}">
                ${escapeHTML(card.rarity)}
            </span>

            ${options.collection ? `<p style="margin-top:8px">Quantidade: ${copies}</p>` : ""}
            ${actions}
        </article>
    `;
}

function renderCatalog() {
    const grid = $("#catalog-grid");
    const search = $("#catalog-search").value.trim().toLowerCase();
    const rarity = $("#rarity-filter").value;
    const episode = $("#episode-filter").value;

    const filtered = state.cards.filter(card => {
        const matchesSearch = [
            card.id,
            card.name,
            card.character,
            card.episode
        ].some(value => String(value || "").toLowerCase().includes(search));

        const matchesRarity = rarity === "all" || card.rarity === rarity;
        const matchesEpisode = episode === "all" || card.episode === episode;

        return matchesSearch && matchesRarity && matchesEpisode;
    });

    $("#catalog-count").textContent =
        `${filtered.length} de ${state.cards.length} cards cadastrados`;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span>▤</span>
                <h3>Nenhum card encontrado</h3>
                <p>Adicione um card ou altere os filtros.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered
        .map(card => createPhotocardHTML(card, { catalog: true }))
        .join("");
}

function renderCollection() {
    const grid = $("#collection-grid");
    const search = $("#collection-search").value.trim().toLowerCase();
    const rarity = $("#collection-rarity-filter").value;
    const status = $("#collection-status-filter").value;

    const filtered = state.cards.filter(card => {
        const copies = getInventoryCount(card.id);

        if (copies < 1) return false;

        const matchesSearch = [
            card.id,
            card.name,
            card.character,
            card.episode
        ].some(value => String(value || "").toLowerCase().includes(search));

        const matchesRarity = rarity === "all" || card.rarity === rarity;

        const matchesStatus =
            status === "all" ||
            (status === "owned" && copies === 1) ||
            (status === "duplicates" && copies > 1);

        return matchesSearch && matchesRarity && matchesStatus;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span>▦</span>
                <h3>Nenhum card encontrado</h3>
                <p>Abra pacotes ou altere os filtros.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered
        .map(card => createPhotocardHTML(card, { collection: true }))
        .join("");
}

$("#catalog-search").addEventListener("input", renderCatalog);
$("#rarity-filter").addEventListener("change", renderCatalog);
$("#episode-filter").addEventListener("change", renderCatalog);

$("#collection-search").addEventListener("input", renderCollection);
$("#collection-rarity-filter").addEventListener("change", renderCollection);
$("#collection-status-filter").addEventListener("change", renderCollection);

/* AÇÕES NOS CARDS */

document.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const cardId = button.dataset.id;
    const action = button.dataset.action;
    const card = state.cards.find(item => item.id === cardId);

    if (action === "edit" && card) {
        openCardModal(card);
    }

    if (action === "delete") {
        deleteCard(cardId);
    }

    if (action === "details" && card) {
        const copies = getInventoryCount(cardId);

        alert(
            `Nome: ${card.name}\n` +
            `ID: ${card.id}\n` +
            `Personagem: ${card.character || "Não informado"}\n` +
            `Episódio: ${card.episode || "Não informado"}\n` +
            `Raridade: ${card.rarity}\n` +
            `Quantidade: ${copies}\n` +
            `Descrição: ${card.description || "Sem descrição"}`
        );
    }

    if (action === "convert") {
        convertDuplicate(cardId);
    }
});

/* SORTEIO DE RARIDADE */

function drawRarity() {
    const totalWeight = Object.values(rarityWeights)
        .reduce((total, weight) => total + weight, 0);

    let random = Math.random() * totalWeight;

    for (const rarity of rarities) {
        random -= rarityWeights[rarity];

        if (random < 0) return rarity;
    }

    return "Comum";
}

/* ESCOLHA DE CARD PARA PACOTE */

function drawCard() {
    if (state.cards.length === 0) {
        return null;
    }

    const rarity = drawRarity();
    const cardsOfRarity = state.cards.filter(card => card.rarity === rarity);

    if (cardsOfRarity.length > 0) {
        return cardsOfRarity[
            Math.floor(Math.random() * cardsOfRarity.length)
        ];
    }

    // Se não houver cards da raridade sorteada,
    // o programa escolhe um dos cards cadastrados.
    return state.cards[
        Math.floor(Math.random() * state.cards.length)
    ];
}

/* ABRIR PACOTES */

$$(".pack-button").forEach(button => {
    button.addEventListener("click", () => {
        openPack(Number(button.dataset.pack));
    });
});

function openPack(amount) {
    const price = packPrices[amount];

    if (!price) return;

    if (state.cards.length === 0) {
        showToast("Cadastre cards no catálogo antes de abrir pacotes.", "error");
        showPage("catalog");
        return;
    }

    if (state.coins < price) {
        showToast("Você não tem moedas suficientes.", "error");
        return;
    }

    state.coins -= price;

    const results = [];

    for (let i = 0; i < amount; i++) {
        const card = drawCard();

        if (!card) continue;

        state.inventory[card.id] = getInventoryCount(card.id) + 1;
        results.push(card);
    }

    if (results.length === 0) {
        state.coins += price;
        showToast("Não foi possível abrir o pacote.", "error");
        return;
    }

    addActivity(`Pacote aberto: ${results.length} card(s) descoberto(s)`);

    saveState();
    renderAll();

    $("#pack-results").innerHTML = results
        .map(card => createPhotocardHTML(card, { collection: true }))
        .join("");

    showToast(`Você descobriu ${results.length} card(s)!`, "success");

    showPage("packs");
}

/* RESUMO DE RARIDADES */

function renderRaritySummary() {
    const container = $("#rarity-summary");

    container.innerHTML = rarities.map(rarity => {
        const count = state.cards.filter(card => {
            return card.rarity === rarity && getInventoryCount(card.id) > 0;
        }).length;

        return `
            <div class="rarity-row">
                <span class="rarity-label">
                    <span class="rarity-dot ${normalizeRarity(rarity)}"></span>
                    ${rarity}
                </span>
                <strong>${count}</strong>
            </div>
        `;
    }).join("");
}

/* ATIVIDADE RECENTE */

function renderActivity() {
    const container = $("#recent-activity");

    if (state.activity.length === 0) {
        container.innerHTML = `
            <p class="empty-message">Sua atividade aparecerá aqui.</p>
        `;
        return;
    }

    container.innerHTML = state.activity.map(item => `
        <div class="duplicate-row">
            <div>
                <h3>${escapeHTML(item.message)}</h3>
                <p>${escapeHTML(item.date)}</p>
            </div>
            <span>✦</span>
        </div>
    `).join("");
}

/* MISSÕES */

const missions = [
    {
        id: "first_card",
        title: "Primeira descoberta",
        description: "Consiga seu primeiro photocard.",
        reward: 50,
        condition: () => getOwnedUniqueCount() >= 1
    },
    {
        id: "five_cards",
        title: "Colecionador iniciante",
        description: "Consiga 5 cards diferentes.",
        reward: 100,
        condition: () => getOwnedUniqueCount() >= 5
    },
    {
        id: "ten_cards",
        title: "Arquivo em expansão",
        description: "Consiga 10 cards diferentes.",
        reward: 200,
        condition: () => getOwnedUniqueCount() >= 10
    },
    {
        id: "first_duplicate",
        title: "Uma cópia extra",
        description: "Consiga uma duplicata.",
        reward: 50,
        condition: () => getDuplicateCount() >= 1
    },
    {
        id: "five_rare",
        title: "Caçador de raridades",
        description: "Consiga 5 cards raros, épicos ou lendários diferentes.",
        reward: 150,
        condition: () => state.cards.filter(card =>
            ["Rara", "Épica", "Lendária"].includes(card.rarity) &&
            getInventoryCount(card.id) > 0
        ).length >= 5
    }
];

function checkMissions() {
    let changed = false;

    missions.forEach(mission => {
        const completed = state.completedMissions.includes(mission.id);

        if (!completed && mission.condition()) {
            state.completedMissions.push(mission.id);
            state.coins += mission.reward;
            state.totalCoinsEarned += mission.reward;

            addActivity(`Missão concluída: ${mission.title}`);
            showToast(`Missão concluída! +${mission.reward} moedas`, "success");

            changed = true;
        }
    });

    if (changed) saveState();
}

function renderMissions() {
    const container = $("#missions-list");

    container.innerHTML = missions.map(mission => {
        const completed = state.completedMissions.includes(mission.id);

        return `
            <article class="mission-card ${completed ? "completed" : ""}">
                <div>
                    <h3>${escapeHTML(mission.title)}</h3>
                    <p>${escapeHTML(mission.description)}</p>
                    <p>${completed ? "Missão concluída!" : "Continue colecionando para completar."}</p>
                </div>

                <div class="mission-reward">
                    ${completed ? "✓ Concluída" : `+${mission.reward} moedas`}
                </div>
            </article>
        `;
    }).join("");

    $("#missions-completed").textContent = state.completedMissions.length;
    $("#mission-coins-earned").textContent = state.totalCoinsEarned;
}

/* DUPLICATAS */

function convertDuplicate(cardId) {
    const card = state.cards.find(item => item.id === cardId);

    if (!card) return;

    const copies = getInventoryCount(cardId);

    if (copies <= 1) {
        showToast("Você precisa ter pelo menos uma cópia extra.", "error");
        return;
    }

    const points = Math.max(1, Number(state.duplicatePoints) || 10);

    if (!confirm(
        `Converter uma cópia extra de "${card.name}" em ${points} pontos?`
    )) {
        return;
    }

    state.inventory[cardId] = copies - 1;
    state.points += points;

    state.tradeHistory.unshift({
        cardName: card.name,
        cardId: card.id,
        points,
        date: new Date().toLocaleString("pt-BR")
    });

    addActivity(`Duplicata convertida: ${card.name} (+${points} pontos)`);

    saveState();
    renderAll();

    showToast(`Duplicata convertida! +${points} pontos`, "success");
}

function renderDuplicates() {
    const container = $("#duplicates-list");

    const duplicatedCards = state.cards.filter(card => {
        return getInventoryCount(card.id) > 1;
    });

    $("#duplicate-count").textContent = getDuplicateCount();
    $("#trade-points").textContent = state.points;

    if (duplicatedCards.length === 0) {
        container.innerHTML = `
            <p class="empty-message">Você ainda não possui duplicatas.</p>
        `;
    } else {
        container.innerHTML = duplicatedCards.map(card => {
            const copies = getInventoryCount(card.id);
            const extraCopies = copies - 1;

            return `
                <div class="duplicate-row">
                    <div>
                        <h3>${escapeHTML(card.name)}</h3>
                        <p>${extraCopies} cópia(s) extra(s) · ${copies} no total</p>
                    </div>

                    <button
                        class="primary-button"
                        data-action="convert"
                        data-id="${escapeHTML(card.id)}"
                    >
                        Converter 1
                    </button>
                </div>
            `;
        }).join("");
    }

    const history = $("#trade-history");

    if (state.tradeHistory.length === 0) {
        history.innerHTML = `
            <p class="empty-message">Nenhuma conversão realizada.</p>
        `;
    } else {
        history.innerHTML = state.tradeHistory.map(item => `
            <div class="duplicate-row">
                <div>
                    <h3>${escapeHTML(item.cardName)}</h3>
                    <p>${escapeHTML(item.date)}</p>
                </div>
                <strong class="mission-reward">+${item.points} pontos</strong>
            </div>
        `).join("");
    }
}

/* PAINEL PRINCIPAL */

function renderDashboard() {
    const discovered = state.cards.length;
    const owned = getOwnedUniqueCount();
    const percentage = getPercentage();

    $("#stat-discovered").textContent = discovered;
    $("#stat-owned").textContent = owned;
    $("#stat-coins").textContent = state.coins;
    $("#stat-duplicates").textContent = getDuplicateCount();

    $("#collection-percentage").textContent = `${percentage}%`;
    $("#collection-progress").style.width = `${percentage}%`;

    $("#collection-progress-text").textContent = discovered === 0
        ? "Cadastre cards para iniciar sua coleção."
        : `${owned} de ${discovered} cards diferentes coletados.`;

    $("#pack-coins").textContent = state.coins;

    renderRaritySummary();
    renderActivity();
}

/* CONFIGURAÇÕES */

function renderSettings() {
    $("#series-name").value = state.seriesName;
    $("#initial-coins").value = state.initialCoins ?? 500;
    $("#duplicate-points").value = state.duplicatePoints;
}

$("#settings-form").addEventListener("submit", event => {
    event.preventDefault();

    const seriesName = $("#series-name").value.trim();
    const initialCoins = Number($("#initial-coins").value);
    const duplicatePoints = Number($("#duplicate-points").value);

    if (!seriesName) {
        showToast("Digite o nome da coleção.", "error");
        return;
    }

    if (!Number.isFinite(initialCoins) || initialCoins < 0) {
        showToast("Informe uma quantidade válida de moedas iniciais.", "error");
        return;
    }

    if (!Number.isFinite(duplicatePoints) || duplicatePoints < 1) {
        showToast("Os pontos por duplicata precisam ser pelo menos 1.", "error");
        return;
    }

    state.seriesName = seriesName;
    state.initialCoins = initialCoins;
    state.duplicatePoints = duplicatePoints;

    saveState();
    renderAll();

    showToast("Configurações salvas!", "success");
});

/* REINICIAR PROGRESSO */

$("#reset-progress").addEventListener("click", () => {
    const confirmed = confirm(
        "Tem certeza? Isso apagará cards cadastrados, coleção, moedas, missões e histórico salvos neste navegador."
    );

    if (!confirmed) return;

    const initialCoins = Number(state.initialCoins ?? 500);
    const seriesName = state.seriesName;
    const duplicatePoints = state.duplicatePoints;

    state = {
        ...structuredClone(defaultState),
        coins: initialCoins,
        seriesName,
        duplicatePoints,
        initialCoins
    };

    saveState();
    renderAll();
    showPage("dashboard");

    showToast("Seu progresso foi reiniciado.", "success");
});

/* ATUALIZAÇÃO GERAL */

function renderAll() {
    renderFilters();
    renderCatalog();
    renderCollection();
    renderDashboard();
    renderMissions();
    renderDuplicates();
    renderSettings();

    $$(".pack-button").forEach(button => {
        const amount = Number(button.dataset.pack);
        button.disabled = state.coins < packPrices[amount];

        button.title = button.disabled
            ? "Moedas insuficientes"
            : "Abrir pacote";
    });
}

/* INICIALIZAÇÃO */

function initializeApp() {
    renderAll();

    // Verifica missões que já possam estar completas.
    checkMissions();

    renderAll();

    console.log("Photocard Archive iniciado!");
}

initializeApp();
// Ativa o suporte offline do aplicativo
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("Suporte offline ativado.");
            })
            .catch(error => {
                console.error(
                    "Não foi possível ativar o modo offline:",
                    error
                );
            });
    });
}