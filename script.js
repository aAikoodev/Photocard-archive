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

/* ========================================
   ABRIR PACOTES COM SONS E ANIMAÇÕES
\======================================== */

let isOpeningPack = false;

/* SONS */

const raritySoundIds = {
    "Comum": "sound-common",
    "Incomum": "sound-uncommon",
    "Rara": "sound-rare",
    "Épica": "sound-epic",
    "Lendária": "sound-legendary"
};

function findAudioElement(soundId) {
    const existing = document.getElementById(soundId);
    if (existing) return existing;

    const soundFiles = {
        "sound-open-pack": ["./sounds/open-pack.mp3", "./open-pack.mp3"],
        "sound-common": ["./sounds/common.mp3", "./sounds/sound-common.mp3"],
        "sound-uncommon": ["./sounds/uncommon.mp3", "./sounds/sound-uncommon.mp3"],
        "sound-rare": ["./sounds/rare.mp3", "./sounds/sound-rare.mp3"],
        "sound-epic": ["./sounds/epic.mp3", "./sounds/sound-epic.mp3"],
        "sound-legendary": ["./sounds/legendary.mp3", "./sounds/sound-legendary.mp3"]
    };

    const paths = soundFiles[soundId];
    if (!paths) return null;

    const audio = new Audio();
    audio.preload = "auto";
    audio.dataset.fallbackSources = JSON.stringify(paths);
    audio.src = paths[0];
    audio.id = soundId + "-generated";

    document.body.appendChild(audio);
    return audio;
}

async function playSound(soundId, options = {}) {
    const audio = findAudioElement(soundId);

    if (!audio) {
        console.warn(`Elemento de áudio não encontrado: ${soundId}`);
        return false;
    }

    const fallbackSources = audio.dataset.fallbackSources
        ? JSON.parse(audio.dataset.fallbackSources)
        : ({
            "sound-open-pack": ["./sounds/open-pack.mp3", "./open-pack.mp3"],
            "sound-common": ["./sounds/common.mp3", "./sounds/sound-common.mp3"],
            "sound-uncommon": ["./sounds/uncommon.mp3", "./sounds/sound-uncommon.mp3"],
            "sound-rare": ["./sounds/rare.mp3", "./sounds/sound-rare.mp3"],
            "sound-epic": ["./sounds/epic.mp3", "./sounds/sound-epic.mp3"],
            "sound-legendary": ["./sounds/legendary.mp3", "./sounds/sound-legendary.mp3"]
        }[soundId] || []);

    const sources = [audio.currentSrc || audio.src, ...fallbackSources]
        .filter((source, index, all) => source && all.indexOf(source) === index);

    for (const source of sources) {
        try {
            audio.pause();
            audio.currentTime = 0;

            if (audio.src !== source) audio.src = source;

            await audio.play();
            return true;
        } catch (error) {
            console.warn(`Não foi possível reproduzir ${source}:`, error);
        }
    }

    if (options.showError) {
        showToast(
            "Não consegui tocar o som de abertura. Confira se sounds/open-pack.mp3 existe no GitHub e se o nome está escrito exatamente assim.",
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

/* ANIMAÇÃO 3D DO PACOTE — estilos incluídos pelo próprio JavaScript */


function installPackAnimationStyles() {
    if (document.getElementById("pack-animation-styles")) return;

    const style = document.createElement("style");
    style.id = "pack-animation-styles";

    style.textContent = `
        /* Fundo escuro cobrindo a tela inteira */
        #pack-results .pack-opening-stage {
            position: fixed;
            inset: 0;
            z-index: 99999;

            width: 100%;
            height: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            box-sizing: border-box;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 22px;

            padding: 24px;
            text-align: center;
            perspective: 1000px;

            background: rgba(0, 0, 0, 0.68);
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);

            overflow: hidden;
        }

        /* Pacote 3D */
        #pack-results .pack-3d {
            position: relative;
            flex-shrink: 0;
            width: 150px;
            height: 205px;
            transform-style: preserve-3d;
            animation: packFloat 1.5s ease-in-out infinite;
        }

        /* Corpo do pacote */
        #pack-results .pack-3d-body {
            position: absolute;
            inset: 0;

            border: 2px solid #c8b1ff;
            border-radius: 18px;

            background: linear-gradient(
                135deg,
                #483071,
                #1b152d 68%,
                #7452b5
            );

            box-shadow:
                0 18px 45px #0008,
                inset 0 0 24px #c6a4ff33;

            transform-style: preserve-3d;
            overflow: hidden;
        }

        /* Detalhes internos do pacote */
        #pack-results .pack-3d-body:before {
            content: "";
            position: absolute;
            inset: 12px;

            border: 1px solid #cbb6ff99;
            border-radius: 11px;

            background: radial-gradient(
                circle at 50% 35%,
                #bda0ff55,
                transparent 48%
            );
        }

        /* Símbolo central */
        #pack-results .pack-3d-emblem {
            position: absolute;
            inset: 0;

            display: grid;
            place-items: center;

            font-size: 58px;
            color: #f3eaff;
            text-shadow: 0 0 22px #c6a4ff;
        }

        /* Fita vertical */
        #pack-results .pack-3d-ribbon {
            position: absolute;
            left: calc(50% - 9px);
            top: 0;

            width: 18px;
            height: 100%;

            background: linear-gradient(
                90deg,
                #a78bfa,
                #f0e7ff,
                #8b6bd6
            );

            opacity: 0.85;
            box-shadow: 0 0 12px #c7a8ff66;
        }

        /* Tampa do pacote */
        #pack-results .pack-3d-top {
            position: absolute;
            z-index: 2;

            left: -5px;
            right: -5px;
            top: -14px;

            height: 35px;

            border: 2px solid #d8c7ff;
            border-radius: 10px;

            background: linear-gradient(
                135deg,
                #9270d5,
                #382452
            );

            transform-origin: bottom center;
            transform: rotateX(0deg);

            transition:
                transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        /* Movimento ao começar a abrir */
        #pack-results .pack-opening-stage.is-opening .pack-3d {
            animation: packShake 0.55s ease-in-out 2;
        }

        #pack-results .pack-opening-stage.is-opening .pack-3d-top {
            transform: translateY(-28px) rotateX(115deg);
        }

        #pack-results .pack-opening-stage.is-opening .pack-3d-body {
            animation: packGlow 0.8s ease-in-out 2 alternate;
        }

        /* Efeito final de abertura */
        #pack-results .pack-opening-stage.is-open .pack-3d {
            animation: packBurst 0.65s ease-out forwards;
        }

        #pack-results .pack-opening-stage.is-open .pack-3d-top {
            transform: translateY(-48px) rotateX(145deg);
        }

        #pack-results .pack-opening-stage.is-open .pack-3d-body {
            box-shadow:
                0 0 55px #b99affaa,
                inset 0 0 30px #c6a4ff55;
        }

        /* Texto da animação */
        #pack-results .pack-opening-text {
            margin: 0;
            color: #f4efff;
            max-width: 100%;
        }

        #pack-results .pack-opening-subtext {
            margin: 0;
            color: #d0c6e5;
            max-width: 100%;
        }

        /* Animações */
        @keyframes packFloat {
            0%, 100% {
                transform: translateY(0) rotateY(-8deg) rotateX(4deg);
            }

            50% {
                transform: translateY(-9px) rotateY(8deg) rotateX(-3deg);
            }
        }

        @keyframes packShake {
            0%, 100% {
                transform: translateX(0) rotateZ(0);
            }

            25% {
                transform: translateX(-7px) rotateZ(-4deg);
            }

            75% {
                transform: translateX(7px) rotateZ(4deg);
            }
        }

        @keyframes packGlow {
            from {
                filter: brightness(1);
            }

            to {
                filter: brightness(1.8);
            }
        }

        @keyframes packBurst {
            0% {
                transform: scale(1) rotateY(0);
            }

            60% {
                transform: scale(1.12) rotateY(20deg);
            }

            100% {
                transform: scale(0.92) rotateY(0);
                opacity: 0.2;
            }
        }

        /* Ajustes para telas pequenas */
        @media (max-width: 480px) {
            #pack-results .pack-opening-stage {
                gap: 18px;
                padding: 16px;
            }

            #pack-results .pack-3d {
                width: 130px;
                height: 180px;
            }

            #pack-results .pack-opening-text {
                font-size: 1.1rem;
            }

            #pack-results .pack-opening-subtext {
                font-size: 0.9rem;
            }
        }

        /* Respeita a preferência por menos animações */
        @media (prefers-reduced-motion: reduce) {
            #pack-results .pack-3d,
            #pack-results .pack-opening-stage.is-opening .pack-3d {
                animation: none;
            }

            #pack-results .pack-3d-top {
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);
}


function showPackOpeningAnimation() {
    installPackAnimationStyles();

    
function installPackAnimationStyles() {
    if (document.getElementById("pack-animation-styles")) return;

    const style = document.createElement("style");
    style.id = "pack-animation-styles";

    style.textContent = `
        /* Pacote centralizado com fundo escuro */
        #pack-results .pack-opening-stage {
            position: fixed;
            inset: 0;
            z-index: 99999;
            width: 100%;
            height: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 22px;
            padding: 24px;
            text-align: center;
            perspective: 1000px;
            background: rgba(0, 0, 0, 0.68);
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
            overflow: hidden;
        }

        #pack-results .pack-3d {
            position: relative;
            flex-shrink: 0;
            width: 150px;
            height: 205px;
            transform-style: preserve-3d;
            animation: packFloat 1.5s ease-in-out infinite;
        }

        #pack-results .pack-3d-body {
            position: absolute;
            inset: 0;
            border: 2px solid #c8b1ff;
            border-radius: 18px;
            background: linear-gradient(135deg, #483071, #1b152d 68%, #7452b5);
            box-shadow: 0 18px 45px #0008, inset 0 0 24px #c6a4ff33;
            transform-style: preserve-3d;
            overflow: hidden;
        }

        #pack-results .pack-3d-body:before {
            content: "";
            position: absolute;
            inset: 12px;
            border: 1px solid #cbb6ff99;
            border-radius: 11px;
            background: radial-gradient(circle at 50% 35%, #bda0ff55, transparent 48%);
        }

        #pack-results .pack-3d-emblem {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            font-size: 58px;
            color: #f3eaff;
            text-shadow: 0 0 22px #c6a4ff;
        }

        #pack-results .pack-3d-ribbon {
            position: absolute;
            left: calc(50% - 9px);
            top: 0;
            width: 18px;
            height: 100%;
            background: linear-gradient(90deg, #a78bfa, #f0e7ff, #8b6bd6);
            opacity: 0.85;
            box-shadow: 0 0 12px #c7a8ff66;
        }

        #pack-results .pack-3d-top {
            position: absolute;
            z-index: 2;
            left: -5px;
            right: -5px;
            top: -14px;
            height: 35px;
            border: 2px solid #d8c7ff;
            border-radius: 10px;
            background: linear-gradient(135deg, #9270d5, #382452);
            transform-origin: bottom center;
            transform: rotateX(0deg);
            transition: transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        #pack-results .pack-opening-stage.is-opening .pack-3d {
            animation: packShake 0.55s ease-in-out 2;
        }

        #pack-results .pack-opening-stage.is-opening .pack-3d-top {
            transform: translateY(-28px) rotateX(115deg);
        }

        #pack-results .pack-opening-stage.is-opening .pack-3d-body {
            animation: packGlow 0.8s ease-in-out 2 alternate;
        }

        #pack-results .pack-opening-stage.is-open .pack-3d {
            animation: packBurst 0.65s ease-out forwards;
        }

        #pack-results .pack-opening-stage.is-open .pack-3d-top {
            transform: translateY(-48px) rotateX(145deg);
        }

        #pack-results .pack-opening-stage.is-open .pack-3d-body {
            box-shadow: 0 0 55px #b99affaa, inset 0 0 30px #c6a4ff55;
        }

        #pack-results .pack-opening-text {
            margin: 0;
            color: #f4efff;
        }

        #pack-results .pack-opening-subtext {
            margin: 0;
            color: #d0c6e5;
        }

        /* Fundo da revelação individual */
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
            padding: 22px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.82);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            cursor: pointer;
            text-align: center;
            animation: revealOverlayIn 0.3s ease-out both;
        }

        .card-reveal-overlay .revealed-card-wrapper {
            width: min(88vw, 360px);
            max-width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: revealCardEnter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .card-reveal-overlay .reveal-scene {
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
        }

        .card-reveal-overlay .reveal-card {
            transform-style: preserve-3d;
        }

        .card-reveal-overlay .reveal-caption {
            margin: 12px 0 0;
        }

        .reveal-click-hint {
            color: #f4efff;
            font-size: 0.95rem;
            line-height: 1.5;
            margin: 4px 0 0;
            padding: 10px 16px;
            border: 1px solid rgba(203, 182, 255, 0.45);
            border-radius: 999px;
            background: rgba(45, 31, 70, 0.82);
            box-shadow: 0 4px 24px #0005;
            animation: hintPulse 1.6s ease-in-out infinite;
            pointer-events: none;
        }

        @keyframes packFloat {
            0%, 100% { transform: translateY(0) rotateY(-8deg) rotateX(4deg); }
            50% { transform: translateY(-9px) rotateY(8deg) rotateX(-3deg); }
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
            0% { transform: scale(1) rotateY(0); }
            60% { transform: scale(1.12) rotateY(20deg); }
            100% { transform: scale(0.92) rotateY(0); opacity: 0.2; }
        }

        @keyframes revealOverlayIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes revealCardEnter {
            0% {
                opacity: 0;
                transform: translateY(24px) scale(0.88) rotateY(16deg);
            }
            65% {
                opacity: 1;
                transform: translateY(-4px) scale(1.03) rotateY(-3deg);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1) rotateY(0);
            }
        }

        @keyframes hintPulse {
            0%, 100% { opacity: 0.78; }
            50% { opacity: 1; }
        }

        @media (max-width: 480px) {
            #pack-results .pack-opening-stage {
                gap: 18px;
                padding: 16px;
            }

            #pack-results .pack-3d {
                width: 130px;
                height: 180px;
            }

            .card-reveal-overlay {
                padding: 14px;
                gap: 14px;
            }

            .card-reveal-overlay .revealed-card-wrapper {
                width: min(90vw, 330px);
            }

            .reveal-click-hint {
                font-size: 0.88rem;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            #pack-results .pack-3d,
            #pack-results .pack-opening-stage.is-opening .pack-3d,
            .reveal-click-hint {
                animation: none;
            }

            #pack-results .pack-3d-top {
                transition: none;
            }

            .card-reveal-overlay,
            .card-reveal-overlay .revealed-card-wrapper {
                animation: none;
            }
        }
    `;

    document.head.appendChild(style);
}

function waitForRevealClick(overlay) {
    return new Promise(resolve => {
        let finished = false;

        function finish() {
            if (finished) return;
            finished = true;

            overlay.removeEventListener("click", finish);
            overlay.removeEventListener("keydown", onKeyDown);

            resolve();
        }

        function onKeyDown(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                finish();
            }
        }

        overlay.addEventListener("click", finish);
        overlay.addEventListener("keydown", onKeyDown);

        overlay.tabIndex = 0;
        overlay.focus({ preventScroll: true });
    });
}
}

/* PROCESSO DE ABERTURA */


async function openPack(amount) {
    if (isOpeningPack) return;

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
        showToast("Não encontrei a área de abertura (#pack-results) no index.html.", "error");
        return;
    }

    isOpeningPack = true;

    $$(".pack-button").forEach(button => {
        button.disabled = true;
    });

    try {
        const openingStage = showPackOpeningAnimation();
        showPage("packs");

        /* Toca o som e inicia a animação do pacote */
        await playSound("sound-open-pack", { showError: true });

        if (openingStage) {
            openingStage.classList.add("is-opening");

            const openingText = $("#pack-opening-text");
            if (openingText) {
                openingText.textContent = "O pacote está se abrindo...";
            }
        }

        await wait(1200);

        if (openingStage) {
            openingStage.classList.remove("is-opening");
            openingStage.classList.add("is-open");

            const openingText = $("#pack-opening-text");
            if (openingText) {
                openingText.textContent = "Sua descoberta está pronta!";
            }
        }

        await wait(450);

        /* Cobra o pacote uma única vez */
        state.coins -= price;
        saveState();

        /* Remove a animação do pacote */
        resultsContainer.innerHTML = "";

        /* Revela uma carta por vez */
        for (let i = 0; i < results.length; i++) {
            const card = results[i];

            const overlay = document.createElement("div");
            overlay.className = "card-reveal-overlay";
            overlay.setAttribute("role", "button");
            overlay.setAttribute("aria-label",
                `Carta ${i + 1} de ${results.length}. Clique para continuar.`
            );

            const wrapper = document.createElement("div");
            wrapper.className = "revealed-card-wrapper";
            wrapper.innerHTML = createRevealHTML(card);

            overlay.appendChild(wrapper);

            const hint = document.createElement("p");
            hint.className = "reveal-click-hint";

            hint.textContent = i < results.length - 1
                ? `Carta ${i + 1} de ${results.length} — clique para revelar a próxima`
                : `Carta ${i + 1} de ${results.length} — clique para terminar`;

            overlay.appendChild(hint);
            document.body.appendChild(overlay);

            /* Inicia a animação da carta */
            requestAnimationFrame(() => {
                wrapper.classList.add("reveal-started");
            });

            /* Toca o som correspondente à raridade */
            await playRaritySound(card);

            /* Adiciona a carta à coleção quando ela é revelada */
            state.inventory[card.id] = getInventoryCount(card.id) + 1;

            addActivity(`Card descoberto: ${card.name} (${card.rarity})`);

            saveState();
            renderAll();

            /* Espera pelo clique antes de mostrar a próxima carta */
            await waitForRevealClick(overlay);

            overlay.remove();
        }

        addActivity(`Pacote aberto: ${results.length} card(s) descoberto(s)`);

        saveState();
        renderAll();

        showToast(`Você descobriu ${results.length} card(s)!`, "success");

    } catch (error) {
        console.error("Erro durante a abertura do pacote:", error);

        showToast(
            "Ocorreu um problema durante a abertura do pacote.",
            "error"
        );

    } finally {
        isOpeningPack = false;

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
