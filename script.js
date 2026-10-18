/* ========================================
   PHOTOCARD ARCHIVE
   Funcionalidades principais
\======================================== */

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
        const quantity = Number(button.dataset.quantity) || 1;
        convertDuplicate(cardId, quantity);
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

/* ========================================
   ABRIR PACOTES COM SONS E ANIMAÇÕES
\======================================== */

let isOpeningPack = false;


/* SONS — CARREGAMENTO E REPRODUÇÃO */

const soundFiles = {
    "sound-open-pack": [
        "./sounds/open-pack.mp3",
        "./open-pack.mp3"
    ],
    "sound-common": [
        "./sounds/common.mp3",
        "./sounds/sound-common.mp3"
    ],
    "sound-uncommon": [
        "./sounds/uncommon.mp3",
        "./sounds/sound-uncommon.mp3"
    ],
    "sound-rare": [
        "./sounds/rare.mp3",
        "./sounds/sound-rare.mp3"
    ],
    "sound-epic": [
        "./sounds/epic.mp3",
        "./sounds/sound-epic.mp3"
    ],
    "sound-legendary": [
        "./sounds/legendary.mp3",
        "./sounds/sound-legendary.mp3"
    ]
};

const audioElements = new Map();
let currentSoundId = null;

function findAudioElement(soundId) {
    if (audioElements.has(soundId)) {
        return audioElements.get(soundId);
    }

    const existing = document.getElementById(soundId);

    if (existing instanceof HTMLAudioElement) {
        existing.preload = "auto";
        audioElements.set(soundId, existing);
        return existing;
    }

    if (!soundFiles[soundId]) {
        console.error("ID de som não configurado:", soundId);
        return null;
    }

    const audio = new Audio();
    audio.preload = "auto";
    audioElements.set(soundId, audio);

    return audio;
}

async function playSound(soundId, options = {}) {
    const audio = findAudioElement(soundId);
    const paths = soundFiles[soundId] || [];

    if (!audio || paths.length === 0) {
        console.error("Não há arquivo configurado para:", soundId);
        return false;
    }

    // Interrompe o som anterior para evitar sobreposição.
    if (currentSoundId && currentSoundId !== soundId) {
        const previousAudio = audioElements.get(currentSoundId);

        if (previousAudio) {
            previousAudio.pause();

            try {
                previousAudio.currentTime = 0;
            } catch (_) {
                // O áudio pode ainda não ter sido carregado.
            }
        }
    }

    currentSoundId = soundId;

    for (const path of paths) {
        try {
            // Converte o caminho em URL absoluta para GitHub Pages.
            const source = new URL(path, document.baseURI).href;

            audio.pause();

            try {
                audio.currentTime = 0;
            } catch (_) {
                // Continua mesmo se ainda não houver posição de reprodução.
            }

            if (audio.src !== source) {
                audio.src = source;
                audio.load();
            }

            // A reprodução é iniciada imediatamente ao chamar a função.
            await audio.play();

            return true;
        } catch (error) {
            console.error(
                `Falha ao reproduzir "${soundId}" em "${path}":`,
                error
            );
        }
    }

    if (currentSoundId === soundId) {
        currentSoundId = null;
    }

    if (options.showError) {
        showToast(
            `Falha ao tocar ${soundId}. Consulte o Console (F12).`,
            "error"
        );
    }

    return false;
}

function wait(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

const raritySoundIds = {
    "Comum": "sound-common",
    "Incomum": "sound-uncommon",
    "Rara": "sound-rare",
    "Épica": "sound-epic",
    "Lendária": "sound-legendary"
};

function playRaritySound(card) {
    const soundId = raritySoundIds[card.rarity] || "sound-common";
    return playSound(soundId);
}



/* ANIMAÇÃO DE REVELAÇÃO */

function createRevealHTML(card) {
    const rarityClass = normalizeRarity(card.rarity);

    const imageHTML = card.image
        ? `<img
                src="${escapeHTML(card.image)}"
                alt="${escapeHTML(card.name)}"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
           >
           <span class="photocard-placeholder" style="display:none">✦</span>`
        : `<span class="photocard-placeholder">✦</span>`;

    return `
        <div class="reveal-scene ${rarityClass}">
            <div class="reveal-sparkles" aria-hidden="true">
                <span>✦</span>
                <span>✧</span>
                <span>✦</span>
                <span>✧</span>
                <span>✦</span>
                <span>✧</span>
            </div>
            <div class="reveal-card">
                <div class="reveal-card-back">
                    <span>✦</span>
                    <p>PHOTOCARD ARCHIVE</p>
                </div>
                <div class="reveal-card-front">
                    <div class="photocard-image">
                        ${imageHTML}
                    </div>
                    <h3>${escapeHTML(card.name)}</h3>
                    <p>${escapeHTML(card.character || "Personagem não informado")}</p>
                    <p>${escapeHTML(card.episode || "Episódio não informado")}</p>
                    <span class="rarity-badge ${rarityClass}">
                        ${escapeHTML(card.rarity)}
                    </span>
                </div>
            </div>
            <p class="reveal-caption">
                ${escapeHTML(card.rarity)}
            </p>
        </div>
    `;
}

/* BOTÕES DOS PACOTES */

$$(".pack-button").forEach(button => {
    button.addEventListener("click", async () => {
        if (isOpeningPack) return;
        await openPack(Number(button.dataset.pack));
    });
});



/* ========================================
   ANIMAÇÃO 3D DO PACOTE E REVELAÇÃO
======================================== */

let skipCardAnimations = false;
let summaryScreenOpen = false;

function installPackAnimationStyles() {
    if (document.getElementById("pack-animation-styles")) return;

    const style = document.createElement("style");
    style.id = "pack-animation-styles";

    style.textContent = `
        #pack-results .pack-opening-stage {
            position: fixed;
            inset: 0;
            z-index: 99999;
            box-sizing: border-box;
            width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 22px;
            text-align: center;
            background: rgba(0, 0, 0, 0.92);
            perspective: 1000px;
        }

        .pack-opening-stage * {
            box-sizing: border-box;
        }

        .pack-3d {
            position: relative;
            width: 150px;
            height: 205px;
            flex-shrink: 0;
            transform-style: preserve-3d;
            animation: packFloat 1.5s ease-in-out infinite;
        }

        .pack-3d-body {
            position: absolute;
            inset: 0;
            overflow: hidden;
            border: 2px solid #c8b1ff;
            border-radius: 18px;
            background: linear-gradient(
                135deg, #483071, #1b152d 68%, #7452b5
            );
            box-shadow: 0 18px 45px #0008, inset 0 0 24px #c6a4ff33;
        }

        .pack-3d-emblem {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            color: #f3eaff;
            font-size: 58px;
            text-shadow: 0 0 22px #c6a4ff;
        }

        .pack-3d-ribbon {
            position: absolute;
            top: 0;
            left: calc(50% - 9px);
            width: 18px;
            height: 100%;
            background: linear-gradient(90deg, #a78bfa, #f0e7ff, #8b6bd6);
            opacity: 0.85;
        }

        .pack-3d-top {
            position: absolute;
            z-index: 2;
            top: -14px;
            left: -5px;
            right: -5px;
            height: 35px;
            border: 2px solid #d8c7ff;
            border-radius: 10px;
            background: linear-gradient(135deg, #9270d5, #382452);
            transform-origin: bottom center;
            transition: transform 0.65s ease;
        }

        .pack-opening-stage.is-opening .pack-3d {
            animation: packShake 0.55s ease-in-out 2;
        }

        .pack-opening-stage.is-opening .pack-3d-top {
            transform: translateY(-28px) rotateX(115deg);
        }

        .pack-opening-stage.is-opening .pack-3d-body {
            animation: packGlow 0.8s ease-in-out 2 alternate;
        }

        .pack-opening-stage.is-open .pack-3d {
            animation: packBurst 0.65s ease-out forwards;
        }

        .pack-opening-stage.is-open .pack-3d-top {
            transform: translateY(-48px) rotateX(145deg);
        }

        .pack-opening-text {
            margin: 0;
            color: #f4efff;
            font-size: 1.3rem;
        }

        .pack-opening-subtext {
            margin: 0;
            color: #d0c6e5;
        }

        
.pack-skip-button {
    position: fixed;
    top: max(16px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
    z-index: 100010;

    padding: 12px 18px;
    border: 1px solid #c8b1ff;
    border-radius: 999px;

    background: #382452;
    color: white;
    font-size: 0.95rem;
    font-weight: 600;

    cursor: pointer;
    box-shadow: 0 4px 16px #0006;
    transition: background 0.2s ease, transform 0.2s ease;
}

.pack-skip-button:hover {
    background: #563b7b;
    transform: scale(1.04);
}

@media (max-width: 480px) {
    .pack-skip-button {
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        padding: 10px 14px;
        font-size: 0.85rem;
    }
}


        /* Tela de revelação individual */

        .card-reveal-overlay {
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            box-sizing: border-box;
            padding: 20px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.94);
            cursor: pointer;
            text-align: center;
            opacity: 0;
            transition: opacity 0.35s ease;
        }

        .card-reveal-overlay.reveal-visible {
            opacity: 1;
        }

        .card-reveal-overlay.reveal-leaving {
            opacity: 0;
            pointer-events: none;
        }

        .card-reveal-overlay .revealed-card-wrapper {
            width: min(88vw, 360px);
            max-width: 100%;
            opacity: 0;
            transform: translateY(16px) scale(0.96);
            transition:
                opacity 0.4s ease,
                transform 0.4s ease;
        }

        .card-reveal-overlay.reveal-visible .revealed-card-wrapper {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        
        
/* Zoom da carta revelada */
.card-reveal-overlay .revealed-card-wrapper {
    transform-origin: center center;
    will-change: transform;
}

.card-reveal-overlay.card-zoomed {
    overflow-y: auto;
    perspective: 1200px;
}

.card-reveal-overlay.card-zoomed .revealed-card-wrapper {
    transform: translateY(0) scale(1.25) !important;
    z-index: 5;
}

/* Inclinação 3D durante a interação com a carta */
.card-reveal-overlay .reveal-scene {
    perspective: 1000px;
}

.card-reveal-overlay .reveal-card {
    transform-style: preserve-3d;
    transition: filter 0.25s ease;
}

.card-reveal-overlay.card-zoomed .reveal-card {
    filter: drop-shadow(0 0 20px rgba(167, 139, 250, 0.55));
}


        .reveal-click-hint {
            position: relative;
            z-index: 2;
            margin: 8px 0 0;
            padding: 12px 18px;
            border: 1px solid rgba(203, 182, 255, 0.6);
            border-radius: 999px;
            background: #2d1f46;
            color: #fff;
            font-size: 0.95rem;
            line-height: 1.5;
            pointer-events: none;
        }

        /* Tela com o resumo de todas as cartas */

        .pack-summary-overlay {
            position: fixed;
            inset: 0;
            z-index: 100001;
            overflow-y: auto;
            box-sizing: border-box;
            padding: 28px 18px;
            background: rgba(12, 8, 20, 0.98);
            color: white;
            text-align: center;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .pack-summary-overlay.summary-visible {
            opacity: 1;
        }

        .pack-summary-title {
            margin: 12px 0;
            font-size: clamp(1.5rem, 5vw, 2.2rem);
        }

        .pack-summary-description {
            margin: 0 0 24px;
            color: #d0c6e5;
        }

        .pack-summary-grid {
            display: grid;
            grid-template-columns: repeat(
                auto-fit, minmax(min(145px, 42vw), 200px)
            );
            justify-content: center;
            gap: 18px;
            max-width: 1000px;
            margin: 0 auto;
        }

        .pack-summary-card {
            position: relative;
            min-width: 0;
            animation: summaryCardEnter 0.45s ease both;
        }

        .pack-summary-card .photocard {
            height: 100%;
        }

        .pack-copy-count {
            position: absolute;
            z-index: 5;
            top: 8px;
            right: 8px;
            min-width: 42px;
            padding: 7px 10px;
            border: 2px solid #eee0ff;
            border-radius: 999px;
            background: #6d42a5;
            color: white;
            font-size: 1rem;
            font-weight: bold;
            box-shadow: 0 3px 12px #0008;
        }

        .pack-summary-hint {
            margin: 28px 0 8px;
            color: #d0c6e5;
        }

        @keyframes packFloat {
            0%, 100% { transform: translateY(0) rotateY(-8deg); }
            50% { transform: translateY(-9px) rotateY(8deg); }
        }

        @keyframes packShake {
            0%, 100% { transform: translateX(0) rotateZ(0); }
            25% { transform: translateX(-7px) rotateZ(-4deg); }
            75% { transform: translateX(7px) rotateZ(4deg); }
        }

        @keyframes packGlow {
            from { filter: brightness(1); }
            to { filter: brightness(1.8); }
        }

        @keyframes packBurst {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.7); opacity: 0; }
        }

        @keyframes summaryCardEnter {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
            .pack-3d {
                width: 130px;
                height: 180px;
            }

            .card-reveal-overlay {
                padding: 14px;
                gap: 14px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .pack-3d,
            .pack-summary-card {
                animation: none;
            }

            .pack-3d-top,
            .card-reveal-overlay,
            .revealed-card-wrapper,
            .pack-summary-overlay {
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);
}


/* CRIA A ANIMAÇÃO DO PACOTE */

function showPackOpeningAnimation() {
    installPackAnimationStyles();

    const resultsContainer = $("#pack-results");

    if (!resultsContainer) {
        throw new Error("A área #pack-results não foi encontrada.");
    }

    const stage = document.createElement("div");
    stage.className = "pack-opening-stage";

    stage.innerHTML = `
    <button type="button" class="pack-skip-button">
        Pular animação
    </button>

    <div id="current-revealed-card"></div>
`;

    resultsContainer.replaceChildren(stage);

    return stage;
}


/* ESPERA O CLIQUE PARA REVELAR A PRÓXIMA CARTA */


function waitForRevealClick(overlay, skipButton) {
    return new Promise(resolve => {
        let finished = false;
        let clickTimer = null;

        function cleanup() {
            if (clickTimer !== null) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }

            overlay.removeEventListener("click", onClick, true);
            overlay.removeEventListener("dblclick", onDoubleClick, true);
            overlay.removeEventListener("keydown", onKeyDown);
            skipButton.removeEventListener("click", onSkip);
        }

        function finish(event, skipping = false) {
            if (finished) return;

            if (
                !skipping &&
                event?.target?.closest("button")
            ) {
                return;
            }

            finished = true;

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            cleanup();

            if (skipping) {
                skipCardAnimations = true;
            }

            overlay.remove();
            resolve();
        }

        function onClick(event) {
            if (event.target.closest("button")) return;

            event.preventDefault();
            event.stopPropagation();

            // Se já houve um clique, não avança a carta:
            // o segundo clique será tratado como clique duplo.
            if (clickTimer !== null) {
                clearTimeout(clickTimer);
                clickTimer = null;
                return;
            }

            // Aguarda para verificar se haverá um segundo clique.
            clickTimer = setTimeout(() => {
                clickTimer = null;
                finish();
            }, 300);
        }

        function onDoubleClick(event) {
            if (event.target.closest("button")) return;

            event.preventDefault();
            event.stopPropagation();

            if (clickTimer !== null) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }

            overlay.classList.toggle("card-zoomed");
        }

        function onKeyDown(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                finish(event);
            }
        }

        function onSkip(event) {
            finish(event, true);
        }

        overlay.addEventListener("click", onClick, true);
        overlay.addEventListener("dblclick", onDoubleClick, true);
        overlay.addEventListener("keydown", onKeyDown);
        skipButton.addEventListener("click", onSkip);

        overlay.tabIndex = 0;
        overlay.focus({ preventScroll: true });
    });
}



/* TELA FINAL COM TODAS AS CARTAS DO PACOTE */

function showPackSummary(results) {
    return new Promise(resolve => {
        const groupedCards = new Map();

        results.forEach(card => {
            if (!groupedCards.has(card.id)) {
                groupedCards.set(card.id, {
                    card,
                    quantity: 0
                });
            }

            groupedCards.get(card.id).quantity++;
        });

        const overlay = document.createElement("div");
        overlay.className = "pack-summary-overlay";
        overlay.tabIndex = 0;
        overlay.setAttribute("role", "button");
        overlay.setAttribute(
            "aria-label",
            "Resumo do pacote. Clique para fechar."
        );

        const cardsHTML = [...groupedCards.values()].map(item => {
            return `
                <div class="pack-summary-card">
                    ${createPhotocardHTML(item.card)}
                    ${item.quantity > 1
                    ? `<span class="pack-copy-count">×${item.quantity}</span>`
                    : ""
                }
                </div>
            `;
        }).join("");

        overlay.innerHTML = `
            <h2 class="pack-summary-title">
                ✦ Cartas adquiridas ✦
            </h2>

            <p class="pack-summary-description">
                Você recebeu ${results.length} carta(s),
                incluindo ${groupedCards.size} card(s) diferente(s).
            </p>

            <div class="pack-summary-grid">
                ${cardsHTML}
            </div>

            <p class="pack-summary-hint">
                Clique em qualquer lugar da tela para continuar.
            </p>
        `;

        let finished = false;

        function closeSummary(event) {
            if (finished) return;

            finished = true;

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            overlay.removeEventListener("click", closeSummary, true);
            overlay.removeEventListener("keydown", onKeyDown);

            overlay.classList.remove("summary-visible");

            wait(400).then(() => {
                overlay.remove();
                summaryScreenOpen = false;
                resolve();
            });
        }

        function onKeyDown(event) {
            if (event.key === "Enter" || event.key === " ") {
                closeSummary(event);
            }
        }

        overlay.addEventListener("click", closeSummary, true);
        overlay.addEventListener("keydown", onKeyDown);

        document.body.appendChild(overlay);
        summaryScreenOpen = true;

        requestAnimationFrame(() => {
            overlay.classList.add("summary-visible");
        });

        overlay.focus({ preventScroll: true });
    });
}


/* PROCESSO DE ABERTURA DOS PACOTES */

async function openPack(amount) {
    if (isOpeningPack) return;

    const price = packPrices[amount];

    if (!price) return;

    if (state.cards.length === 0) {
        showToast(
            "Cadastre cards no catálogo antes de abrir pacotes.",
            "error"
        );
        showPage("catalog");
        return;
    }

    if (state.coins < price) {
        showToast("Você não tem moedas suficientes.", "error");
        return;
    }

    const results = [];

    for (let i = 0; i < amount; i++) {
        const card = drawCard();
        if (card) results.push(card);
    }

    if (results.length === 0) {
        showToast("Não foi possível abrir o pacote.", "error");
        return;
    }

    const resultsContainer = $("#pack-results");

    if (!resultsContainer) {
        showToast(
            "Não encontrei a área de abertura no index.html.",
            "error"
        );
        return;
    }

    isOpeningPack = true;
    skipCardAnimations = false;
    summaryScreenOpen = false;

    $$(".pack-button").forEach(button => {
        button.disabled = true;
    });

    try {
        showPage("packs");

        const openingStage = showPackOpeningAnimation();

        // A animação de abertura não fica presa esperando o áudio.
        // Inicia o som diretamente durante a interação do usuário.
        // A animação continua sem aguardar a reprodução.
        const openingSoundPromise = playSound("sound-open-pack", {
            showError: true
        });

        openingSoundPromise.catch(error => {
            console.warn("Erro no som de abertura:", error);
        });

        openingStage.classList.add("is-opening");

        const openingText = $("#pack-opening-text");

        if (openingText) {
            openingText.textContent = "O pacote está se abrindo...";
        }

        await wait(1200);

        openingStage.classList.remove("is-opening");
        openingStage.classList.add("is-open");

        if (openingText) {
            openingText.textContent = "Sua descoberta está pronta!";
        }

        await wait(450);

        // Cobra o pacote uma única vez.
        state.coins -= price;

        // Registra todas as cartas recebidas uma única vez.
        results.forEach(card => {
            state.inventory[card.id] = getInventoryCount(card.id) + 1;

            addActivity(
                `Card descoberto: ${card.name} (${card.rarity})`
            );
        });

        addActivity(
            `Pacote aberto: ${results.length} card(s) descoberto(s)`
        );

        saveState();
        renderAll();

        // Estrutura permanente durante todas as revelações.
        const stage = document.createElement("div");
        stage.className = "pack-opening-stage";

        stage.innerHTML = `
            <button type="button" class="pack-skip-button">
                Pular animação
            </button>

            <div id="current-revealed-card"></div>

            <p class="pack-opening-subtext" id="reveal-progress"></p>
        `;

        resultsContainer.replaceChildren(stage);

        const skipButton = stage.querySelector(".pack-skip-button");
        const cardContainer = stage.querySelector("#current-revealed-card");

        // Revela uma carta de cada vez.
        for (let i = 0; i < results.length; i++) {

            // Se o usuário pulou, não espera os próximos cliques.
            if (skipCardAnimations) break;

            const card = results[i];

            const overlay = document.createElement("div");
            overlay.className = "card-reveal-overlay";
            overlay.tabIndex = 0;
            overlay.setAttribute("role", "button");
            overlay.setAttribute(
                "aria-label",
                `Carta ${i + 1} de ${results.length}. Clique para continuar.`
            );

            const wrapper = document.createElement("div");
            wrapper.className = "revealed-card-wrapper";
            wrapper.innerHTML = createRevealHTML(card);

            overlay.appendChild(wrapper);
            cardContainer.appendChild(overlay);

            // Inicia a animação visual.
            requestAnimationFrame(() => {
                overlay.classList.add("reveal-visible");
            });

            // Toca o som da raridade sem bloquear a revelação.

            playRaritySound(card).catch(error => {
                console.error("Erro no som da carta:", error);
            });


            /*
             * PONTO PRINCIPAL:
             * O código fica parado aqui até o usuário clicar
             * na carta ou apertar "Pular animação".
             */
            await waitForRevealClick(overlay, skipButton);
        }

        // Depois das revelações, mostra o resumo do pacote.
        resultsContainer.replaceChildren();

        await showPackSummary(results);

        showToast(
            `Você descobriu ${results.length} carta(s)!`,
            "success"
        );

    } catch (error) {
        console.error("Erro durante a abertura do pacote:", error);

        document.querySelectorAll(
            ".card-reveal-overlay, .pack-summary-overlay"
        ).forEach(element => element.remove());

        const stage = document.querySelector(
            "#pack-results .pack-opening-stage"
        );

        if (stage) stage.remove();

        showToast(
            "Ocorreu um problema durante a abertura. Confira o console.",
            "error"
        );

    } finally {
        isOpeningPack = false;
        skipCardAnimations = false;
        summaryScreenOpen = false;

        $$(".pack-button").forEach(button => {
            const buttonPrice = packPrices[Number(button.dataset.pack)];

            button.disabled = state.coins < buttonPrice;
            button.title = button.disabled
                ? "Moedas insuficientes"
                : "Abrir pacote";
        });
    }
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

            showToast(
                `Missão concluída! +${mission.reward} moedas`,
                "success"
            );

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


function convertDuplicate(cardId, quantity = 1) {
    const card = state.cards.find(item => item.id === cardId);
    if (!card) return;

    const copies = getInventoryCount(cardId);
    const extraCopies = copies - 1;

    quantity = Number(quantity);

    if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > extraCopies
    ) {
        showToast("Quantidade de cópias inválida.", "error");
        return;
    }

    const pointsPerCopy = Math.max(
        1,
        Number(state.duplicatePoints) || 10
    );

    const totalPoints = pointsPerCopy * quantity;

    if (!confirm(
        `Converter ${quantity} cópia(s) extra(s) de "${card.name}"?\n\n` +
        `Cópias restantes: ${copies - quantity}\n` +
        `Pontos recebidos: ${totalPoints}`
    )) {
        return;
    }

    // Mantém pelo menos uma cópia do card.
    state.inventory[cardId] = copies - quantity;
    state.points += totalPoints;

    state.tradeHistory.unshift({
        cardName: card.name,
        cardId: card.id,
        quantity: quantity,
        points: totalPoints,
        date: new Date().toLocaleString("pt-BR")
    });

    addActivity(
        `${quantity} cópia(s) extra(s) convertida(s): ` +
        `${card.name} (+${totalPoints} pontos)`
    );

    saveState();
    renderAll();

    showToast(
        `${quantity} cópia(s) convertida(s)! +${totalPoints} pontos`,
        "success"
    );
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
            <p class="empty-message">
                Você ainda não possui duplicatas.
            </p>
        `;
    } else {
        container.innerHTML = duplicatedCards.map(card => {
            const copies = getInventoryCount(card.id);
            const extraCopies = copies - 1;

            const buttons = [1, 2, 3, 5, 10]
                .filter(quantity => quantity <= extraCopies)
                .map(quantity => {
                    const points =
                        quantity *
                        Math.max(1, Number(state.duplicatePoints) || 10);

                    return `
                        <button
                            class="primary-button"
                            data-action="convert"
                            data-id="${escapeHTML(card.id)}"
                            data-quantity="${quantity}"
                        >
                            Converter ${quantity}
                            (+${points} pts)
                        </button>
                    `;
                }).join("");

            return `
                <div class="duplicate-row">
                    <div>
                        <h3>${escapeHTML(card.name)}</h3>
                        <p>
                            ${extraCopies} cópia(s) extra(s)
                            · ${copies} no total
                        </p>
                    </div>

                    <div class="duplicate-conversion-options">
                        ${buttons}

                        <button
                            class="primary-button"
                            data-action="convert"
                            data-id="${escapeHTML(card.id)}"
                            data-quantity="${extraCopies}"
                        >
                            Converter todas
                            (+${extraCopies *
                Math.max(1, Number(state.duplicatePoints) || 10)} pts)
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    const history = $("#trade-history");

    if (state.tradeHistory.length === 0) {
        history.innerHTML = `
            <p class="empty-message">
                Nenhuma conversão realizada.
            </p>
        `;
    } else {
        history.innerHTML = state.tradeHistory.map(item => `
            <div class="duplicate-row">
                <div>
                    <h3>${escapeHTML(item.cardName)}</h3>
                    <p>
                        ${Number(item.quantity) || 1} cópia(s) convertida(s)
                        · ${escapeHTML(item.date)}
                    </p>
                </div>

                <strong class="mission-reward">
                    +${Number(item.points) || 0} pontos
                </strong>
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


/* ========================================
   MOVIMENTO 3D GLOBAL — MOUSE E TOQUE
======================================== */

let activeTiltCard = null;

function resetCardTilt(card) {
    if (!card) return;

    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
}

function getActiveCard() {
    // Prioriza a carta que está sendo revelada.
    const revealCard = document.querySelector(
        ".card-reveal-overlay .reveal-scene"
    );

    if (revealCard) return revealCard;

    // Se não houver revelação, usa uma carta da coleção.
    const cards = document.querySelectorAll(
        "#pack-results .photocard, .card-grid .photocard"
    );

    return cards.length ? cards[0] : null;
}

function moveCard3D(clientX, clientY) {
    const card = getActiveCard();

    if (!card || !card.isConnected) {
        activeTiltCard = null;
        return;
    }

    activeTiltCard = card;

    const rect = card.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    // A posição global do mouse/dedo controla a inclinação.
    const x = Math.max(
        0,
        Math.min(1, clientX / window.innerWidth)
    );

    const y = Math.max(
        0,
        Math.min(1, clientY / window.innerHeight)
    );

    const tiltY = (x - 0.5) * 16;
    const tiltX = (0.5 - y) * 16;

    card.style.setProperty("--tilt-x", `${tiltY}deg`);
    card.style.setProperty("--tilt-y", `${tiltX}deg`);
}




window.addEventListener("blur", () => {
    resetCardTilt(activeTiltCard);
    activeTiltCard = null;
});


// Restaura a posição da carta ao sair da janela.
window.addEventListener("blur", () => {
    resetCardTilt(activeTiltCard);
    activeTiltCard = null;
});

// Restaura a carta quando o ponteiro sai da janela.
window.addEventListener("blur", () => {
    resetCardTilt(activeTiltCard);
    activeTiltCard = null;
});

document.addEventListener("pointerout", event => {
    if (event.pointerType === "touch") return;

    const card = event.target.closest(".photocard, .reveal-scene");

    if (!card || card.contains(event.relatedTarget)) return;

    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
});

/* ========================================
   MOVIMENTO 3D GLOBAL — MOUSE E TOQUE
======================================== */


function getActiveCard() {
    // Durante a abertura, movimenta a carta que está sendo revelada.
    const revealedCard = document.querySelector(
        ".card-reveal-overlay .reveal-scene"
    );

    if (revealedCard) return revealedCard;

    // Fora da revelação, utiliza uma carta da página ativa.
    const activePage = document.querySelector(".page.active");

    if (!activePage) return null;

    return activePage.querySelector(".photocard");
}

function resetCardTilt(card) {
    if (!card) return;

    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
}

function moveCard3D(clientX, clientY) {
    const card = getActiveCard();

    if (!card || !card.isConnected) {
        activeTiltCard = null;
        return;
    }

    activeTiltCard = card;

    // A posição do ponteiro é calculada em relação à tela inteira,
    // e não apenas em relação à carta.
    const x = Math.max(
        0,
        Math.min(1, clientX / window.innerWidth)
    );

    const y = Math.max(
        0,
        Math.min(1, clientY / window.innerHeight)
    );

    const tiltX = (0.5 - y) * 16;
    const tiltY = (x - 0.5) * 16;

    card.style.setProperty("--tilt-x", `${tiltY}deg`);
    card.style.setProperty("--tilt-y", `${tiltX}deg`);
}

// Mouse e movimento do dedo funcionam em qualquer ponto da tela.
document.addEventListener("pointermove", event => {
    if (
        event.pointerType === "mouse" ||
        event.pointerType === "touch" ||
        event.pointerType === "pen"
    ) {
        moveCard3D(event.clientX, event.clientY);
    }
});

// Um toque sem arrastar também movimenta a carta.
document.addEventListener("pointerdown", event => {
    if (
        event.pointerType === "touch" ||
        event.pointerType === "pen"
    ) {
        moveCard3D(event.clientX, event.clientY);
    }
});

// Ao soltar o dedo, retorna à posição neutra.
document.addEventListener("pointerup", event => {
    if (event.pointerType === "touch") {
        resetCardTilt(activeTiltCard);
    }
});

document.addEventListener("pointercancel", event => {
    if (event.pointerType === "touch") {
        resetCardTilt(activeTiltCard);
    }
});

window.addEventListener("blur", () => {
    resetCardTilt(activeTiltCard);
    activeTiltCard = null;
});

