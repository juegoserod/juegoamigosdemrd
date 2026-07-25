import {
    db, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, onSnapshot, serverTimestamp
} from "./firebase.js";

import { preguntasDefault } from "./preguntas.js";

// ------------------------
// VARIABLES GLOBALES
// ------------------------
let salaID = "";
let jugadorID = "";
let nick = "";
let soyAdmin = false;
let ronda = 0;
const TOTAL_JUGADORES = 7; // Cámbialo si quieres probar con menos

// ------------------------
// ELEMENTOS DEL DOM
// ------------------------
const screens = document.querySelectorAll(".screen");
const btnCrear = document.getElementById("crearSala");
const btnUnirse = document.getElementById("unirseSala");
const btnStart = document.getElementById("startGame");
const btnEnviar = document.getElementById("enviar");
const btnNext = document.getElementById("nextRound");
const inputNick = document.getElementById("nickname");
const inputCodigo = document.getElementById("codigoSala");
const listaJugadores = document.getElementById("listaJugadores");
const codigoMostrado = document.getElementById("codigoMostrado");
const pregunta = document.getElementById("pregunta");
const respuesta = document.getElementById("respuesta");
const contador = document.getElementById("contador");
const rondaHTML = document.getElementById("ronda");
const listaRespuestas = document.getElementById("listaRespuestas");

// ------------------------
// UTILIDADES
// ------------------------
function cambiarPantalla(id) {
    screens.forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function generarCodigo() {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codigo = "";
    for (let i = 0; i < 6; i++) {
        codigo += letras[Math.floor(Math.random() * letras.length)];
    }
    return codigo;
}

// ARREGLO PARA MÓVILES: Reemplazo seguro de crypto.randomUUID()
function generarIDSeguro() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// ------------------------
// EVENT LISTENERS
// ------------------------
btnCrear.addEventListener("click", crearSala);
btnUnirse.addEventListener("click", unirseSala);
btnStart.addEventListener("click", comenzarJuego);
btnEnviar.addEventListener("click", enviarRespuesta);
btnNext.addEventListener("click", siguienteRonda);
document.getElementById("volver").addEventListener("click", () => location.reload());

// ------------------------
// FUNCIONES PRINCIPALES
// ------------------------
async function crearSala() {
    nick = inputNick.value.trim();
    if (nick === "") {
        alert("¡Poné un nick primero!");
        return;
    }

    btnCrear.innerText = "Creando...";
    btnCrear.disabled = true;

    try {
        salaID = generarCodigo();
        soyAdmin = true;
        jugadorID = generarIDSeguro(); // Usamos la función segura

        // Guardar la sala en Firebase
        await setDoc(doc(db, "salas", salaID), {
            estado: "esperando",
            ronda: 0,
            preguntas: preguntasDefault,
            creada: serverTimestamp()
        });

        // Guardar al creador como jugador
        await setDoc(doc(db, "salas", salaID, "jugadores", jugadorID), {
            nick: nick,
            admin: true,
            respondio: false
        });

        codigoMostrado.innerText = salaID;
        cambiarPantalla("waiting");
        escucharJugadores();
        escucharSala(); // IMPORTANTE: El admin también debe escuchar si cambia de estado
    } catch (error) {
        console.error("Error al crear sala:", error);
        alert("Error al conectar con la base de datos: " + error.message);
        btnCrear.innerText = "Crear Sala";
        btnCrear.disabled = false;
    }
}

async function unirseSala() {
    nick = inputNick.value.trim();
    salaID = inputCodigo.value.trim().toUpperCase();

    if (nick === "") {
        alert("Ingresá un nick");
        return;
    }
    if (salaID === "") {
        alert("Ingresá el código de la sala");
        return;
    }

    btnUnirse.innerText = "Buscando...";
    btnUnirse.disabled = true;

    try {
        const salaRef = doc(db, "salas", salaID);
        const salaSnap = await getDoc(salaRef);

        if (!salaSnap.exists()) {
            alert("Esa sala no existe o el código está mal.");
            btnUnirse.innerText = "Unirse";
            btnUnirse.disabled = false;
            return;
        }

        jugadorID = generarIDSeguro(); // Usamos la función segura

        await setDoc(doc(db, "salas", salaID, "jugadores", jugadorID), {
            nick: nick,
            admin: false,
            respondio: false
        });

        codigoMostrado.innerText = salaID;
        btnStart.style.display = "none"; // Solo el admin ve el botón
        cambiarPantalla("waiting");
        escucharJugadores();
        escucharSala();
    } catch (error) {
        console.error("Error al unirse:", error);
        alert("Ocurrió un error al unirse: " + error.message);
        btnUnirse.innerText = "Unirse";
        btnUnirse.disabled = false;
    }
}

function escucharJugadores() {
    onSnapshot(collection(db, "salas", salaID, "jugadores"), (snapshot) => {
        listaJugadores.innerHTML = "";
        let cantidad = 0;

        snapshot.forEach(docu => {
            cantidad++;
            const data = docu.data();
            const div = document.createElement("div");
            div.className = "player";
            if (data.admin) div.classList.add("admin");
            div.innerHTML = `<span>${data.nick}</span>`;
            listaJugadores.appendChild(div);
        });

        // Activamos el botón de iniciar solo al admin si hay suficientes
        if (soyAdmin) {
            if (cantidad >= TOTAL_JUGADORES) {
                btnStart.disabled = false;
                btnStart.innerText = "Comenzar";
            } else {
                btnStart.disabled = true;
                btnStart.innerText = `Esperando (${cantidad}/${TOTAL_JUGADORES})`;
            }
        }
    });
}

function escucharSala() {
    onSnapshot(doc(db, "salas", salaID), (snap) => {
        if (!snap.exists()) return;
        const sala = snap.data();
        ronda = sala.ronda || 0;

        if (sala.estado === "jugando") mostrarRonda(sala);
        if (sala.estado === "resultados") mostrarResultados();
        if (sala.estado === "finalizado") cambiarPantalla("final");
    });
}

async function comenzarJuego() {
    btnStart.disabled = true;
    try {
        await updateDoc(doc(db, "salas", salaID), {
            estado: "jugando",
            ronda: 1
        });
    } catch (error) {
        console.error("Error al iniciar juego:", error);
        alert("Error al iniciar el juego");
        btnStart.disabled = false;
    }
}

function mostrarRonda(sala) {
    cambiarPantalla("game");
    rondaHTML.innerText = "Ronda " + sala.ronda;
    pregunta.innerText = sala.preguntas[sala.ronda - 1] || "¿Pregunta no encontrada?";
    respuesta.value = "";
    btnEnviar.disabled = false;
    document.getElementById("esperando").innerText = "";
    escucharCantidadRespuestas();
}

async function enviarRespuesta() {
    const texto = respuesta.value.trim();
    if (texto === "") {
        alert("¡Escribí una respuesta primero!");
        return;
    }

    btnEnviar.disabled = true;
    document.getElementById("esperando").innerText = "Enviando...";

    try {
        await setDoc(doc(db, "salas", salaID, "rondas", String(ronda), "respuestas", jugadorID), {
            nick: nick,
            texto: texto,
            fecha: serverTimestamp()
        });

        await updateDoc(doc(db, "salas", salaID, "jugadores", jugadorID), {
            respondio: true
        });

        document.getElementById("esperando").innerText = "¡Respuesta enviada! Esperando al resto...";
    } catch (error) {
        console.error("Error al enviar respuesta:", error);
        alert("Hubo un error, intentá de nuevo.");
        btnEnviar.disabled = false;
        document.getElementById("esperando").innerText = "";
    }
}

function escucharCantidadRespuestas() {
    onSnapshot(collection(db, "salas", salaID, "rondas", String(ronda), "respuestas"), async (snapshot) => {
        contador.innerText = snapshot.size + "/" + TOTAL_JUGADORES;

        // Si todos respondieron y soy el admin, pasamos a resultados
        if (snapshot.size >= TOTAL_JUGADORES && soyAdmin) {
            try {
                await updateDoc(doc(db, "salas", salaID), { estado: "resultados" });
            } catch (error) {
                console.error("Error al pasar a resultados:", error);
            }
        }
    });
}

function mostrarResultados() {
    cambiarPantalla("results");
    listaRespuestas.innerHTML = "Cargando respuestas...";
    btnNext.style.display = soyAdmin ? "block" : "none";

    onSnapshot(collection(db, "salas", salaID, "rondas", String(ronda), "respuestas"), (snapshot) => {
        listaRespuestas.innerHTML = "";
        let respuestas = [];

        snapshot.forEach((docu) => respuestas.push(docu.data()));
        
        // Mezclar respuestas (shuffle)
        respuestas.sort(() => Math.random() - 0.5);

        respuestas.forEach((r) => {
            const div = document.createElement("div");
            div.className = "respuesta";
            div.innerHTML = `<div class="badge">Anónimo</div> ${r.texto}`;
            listaRespuestas.appendChild(div);
        });
    });
}

async function siguienteRonda() {
    btnNext.disabled = true;
    try {
        const salaSnap = await getDoc(doc(db, "salas", salaID));
        const sala = salaSnap.data();
        const totalPreguntas = sala.preguntas.length;

        if (ronda >= totalPreguntas || ronda >= 10) { // Límite de 10 rondas o lo que quieras
            await updateDoc(doc(db, "salas", salaID), { estado: "finalizado" });
            return;
        }

        // Reiniciamos el estado 'respondio' de los jugadores
        const jugadores = await getDocs(collection(db, "salas", salaID, "jugadores"));
        const promesas = jugadores.docs.map(jugador => 
            updateDoc(doc(db, "salas", salaID, "jugadores", jugador.id), { respondio: false })
        );
        await Promise.all(promesas);

        // Avanzamos de ronda
        await updateDoc(doc(db, "salas", salaID), {
            ronda: ronda + 1,
            estado: "jugando"
        });
        
        btnNext.disabled = false;
    } catch (error) {
        console.error("Error al pasar de ronda:", error);
        alert("Error al intentar pasar de ronda.");
        btnNext.disabled = false;
    }
}
