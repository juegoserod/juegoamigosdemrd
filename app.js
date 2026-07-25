import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuración de Firebase provista
const firebaseConfig = {
  apiKey: "AIzaSyDBqRMHBqMGZyjfbYV_eVp1eYVjLgs0EXU",
  authDomain: "amigosdemrd.firebaseapp.com",
  databaseURL: "https://amigosdemrd-default-rtdb.firebaseio.com",
  projectId: "amigosdemrd",
  storageBucket: "amigosdemrd.firebasestorage.app",
  messagingSenderId: "270375257685",
  appId: "1:270375257685:web:aed1bd61fea3b0dc9676dc",
  measurementId: "G-M2KCFTMLL3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Estado local
let myNick = "";

// Referencias a las pantallas
const screenLogin = document.getElementById('screen-login');
const screenLobby = document.getElementById('screen-lobby');
const screenVoting = document.getElementById('screen-voting');
const screenResults = document.getElementById('screen-results');

function showScreen(screen) {
    screenLogin.classList.add('hidden');
    screenLobby.classList.add('hidden');
    screenVoting.classList.add('hidden');
    screenResults.classList.add('hidden');
    screen.classList.remove('hidden');
}

// 1. Unirse a la sala
document.getElementById('btn-join').addEventListener('click', async () => {
    const input = document.getElementById('nickname-input').value.trim();
    if (input === "") {
        alert("¡Ponete un nick!");
        return;
    }
    myNick = input;

    const playerRef = ref(db, 'players/' + myNick);
    const snapshot = await get(playerRef);

    if (snapshot.exists()) {
        alert("Ese nick ya está en uso en esta sala. Elige otro.");
        return;
    }

    // Registrar jugador en la base de datos
    await set(playerRef, { joined: true });

    // Escuchar cambios generales del juego en tiempo real
    initGameListeners();
    showScreen(screenLobby);
});

// 2. Escuchar cambios globales (Jugadores, Estado del juego y Votos)
function initGameListeners() {
    // Sincronizar lista de jugadores
    onValue(ref(db, 'players'), (snapshot) => {
        const data = snapshot.val() || {};
        const players = Object.keys(data);
        
        document.getElementById('player-count').innerText = players.length;
        const list = document.getElementById('player-list');
        list.innerHTML = "";
        players.forEach(p => {
            const li = document.createElement('li');
            li.innerText = p;
            list.appendChild(li);
        });
    });

    // Sincronizar estado de las pantallas (Lobby -> Votación -> Resultados)
    onValue(ref(db, 'gameState'), (snapshot) => {
        const state = snapshot.val();
        if (!state) return;

        if (state.status === 'lobby') {
            showScreen(screenLobby);
        } else if (state.status === 'voting') {
            setupVotingScreen();
            showScreen(screenVoting);
        } else if (state.status === 'results') {
            showResultsScreen(state.votes || {});
            showScreen(screenResults);
        }
    });
}

// 3. Admin / Iniciar Ronda
document.getElementById('btn-start-round').addEventListener('click', async () => {
    // Cambiar estado global a votación
    await set(ref(db, 'gameState'), { status: 'voting' });
    await set(ref(db, 'votes'), {}); // Limpiar votos anteriores
});

// 4. Configurar pantalla de votación con los jugadores actuales
async function setupVotingScreen() {
    const snapshot = await get(ref(db, 'players'));
    const players = Object.keys(snapshot.val() || {});
    
    const optionsContainer = document.getElementById('voting-options');
    optionsContainer.innerHTML = "";
    document.getElementById('vote-status').classList.add('hidden');
    optionsContainer.classList.remove('hidden');

    players.forEach(p => {
        const btn = document.createElement('button');
        btn.innerText = `Votar por ${p}`;
        btn.onclick = () => castVote(p);
        optionsContainer.appendChild(btn);
    });
}

// 5. Emitir Voto (Anónimo: sumamos al contador del jugador votado)
async function castVote(votedPlayer) {
    document.getElementById('voting-options').classList.add('hidden');
    document.getElementById('vote-status').classList.remove('hidden');

    const voteRef = ref(db, `votes/${votedPlayer}`);
    const snapshot = await get(voteRef);
    const currentVotes = snapshot.exists() ? snapshot.val() : 0;

    await set(voteRef, currentVotes + 1);

    // Verificar si todos ya votaron o simplemente pasar a resultados tras un breve lapso
    // Para simplificar entre 7 amigos, pasamos a resultados tras el voto de cualquiera o un timer compartido
    setTimeout(async () => {
        // El primero que ejecute esto cambia el estado global a resultados
        const stateSnap = await get(ref(db, 'gameState/status'));
        if (stateSnap.val() === 'voting') {
            const allVotesSnap = await get(ref(db, 'votes'));
            await set(ref(db, 'gameState'), { 
                status: 'results', 
                votes: allVotesSnap.val() || {} 
            });
        }
    }, 1500);
}

// 6. Mostrar Resultados
function showResultsScreen(votesData) {
    const resultsContainer = document.getElementById('results-list');
    resultsContainer.innerHTML = "";

    const sortedResults = Object.entries(votesData).sort((a, b) => b[1] - a[1]);

    sortedResults.forEach(([nombre, cantidad], index) => {
        const p = document.createElement('p');
        if (index === 0) {
            p.innerHTML = `<strong>🏆 ${nombre}: ${cantidad} votos</strong> (¡El más amigo de mierda!)`;
            p.style.color = "#ff4757";
        } else {
            p.innerText = `${nombre}: ${cantidad} votos`;
        }
        resultsContainer.appendChild(p);
    });
}

// 7. Siguiente Ronda
document.getElementById('btn-next-round').addEventListener('click', async () => {
    await set(ref(db, 'gameState'), { status: 'lobby' });
});
