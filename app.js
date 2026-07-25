// =========================
// app.js - PARTE 1
// =========================

import {
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from "./firebase.js";

import { preguntasDefault } from "./preguntas.js";

// ------------------------

let salaID = "";
let jugadorID = "";
let nick = "";
let soyAdmin = false;

let ronda = 0;

const TOTAL_JUGADORES = 7;

// ------------------------

const screens = document.querySelectorAll(".screen");

const home = document.getElementById("home");
const waiting = document.getElementById("waiting");
const game = document.getElementById("game");
const results = document.getElementById("results");
const finalScreen = document.getElementById("final");

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

function cambiarPantalla(id){

screens.forEach(s=>s.classList.remove("active"));

document.getElementById(id).classList.add("active");

}

// ------------------------

function generarCodigo(){

const letras="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let codigo="";

for(let i=0;i<6;i++){

codigo+=letras[Math.floor(Math.random()*letras.length)];

}

return codigo;

}

// ------------------------

btnCrear.addEventListener("click",crearSala);

btnUnirse.addEventListener("click",unirseSala);

btnStart.addEventListener("click",comenzarJuego);

btnEnviar.addEventListener("click",enviarRespuesta);

btnNext.addEventListener("click",siguienteRonda);

// ------------------------

async function crearSala(){

nick=inputNick.value.trim();

if(nick==""){

alert("Poné un nick");

return;

}

salaID=generarCodigo();

soyAdmin=true;

jugadorID=crypto.randomUUID();

await setDoc(doc(db,"salas",salaID),{

estado:"esperando",

ronda:0,

preguntas:preguntasDefault,

creada:serverTimestamp()

});

await setDoc(doc(db,"salas",salaID,"jugadores",jugadorID),{

nick:nick,

admin:true,

respondio:false

});

codigoMostrado.innerText=salaID;

cambiarPantalla("waiting");

escucharJugadores();

}

// ------------------------

async function unirseSala(){

nick=inputNick.value.trim();

salaID=inputCodigo.value.trim().toUpperCase();

if(nick==""){

alert("Ingresá un nick");

return;

}

if(salaID==""){

alert("Ingresá el código");

return;

}

const sala=await getDoc(doc(db,"salas",salaID));

if(!sala.exists()){

alert("La sala no existe");

return;

}

jugadorID=crypto.randomUUID();

await setDoc(doc(db,"salas",salaID,"jugadores",jugadorID),{

nick:nick,

admin:false,

respondio:false

});

codigoMostrado.innerText=salaID;

btnStart.style.display="none";

cambiarPantalla("waiting");

escucharJugadores();

escucharSala();

}

// ------------------------

function escucharJugadores(){

onSnapshot(

collection(db,"salas",salaID,"jugadores"),

(snapshot)=>{

listaJugadores.innerHTML="";

let cantidad=0;

snapshot.forEach(docu=>{

cantidad++;

const data=docu.data();

const div=document.createElement("div");

div.className="player";

if(data.admin){

div.classList.add("admin");

}

div.innerHTML=`

<span>${data.nick}</span>

`;

listaJugadores.appendChild(div);

});

if(cantidad>=TOTAL_JUGADORES && soyAdmin){

btnStart.disabled=false;

}

}

);
}
// =========================
// app.js - PARTE 2
// =========================

function escucharSala() {

    onSnapshot(doc(db, "salas", salaID), (snap) => {

        if (!snap.exists()) return;

        const sala = snap.data();

        ronda = sala.ronda || 0;

        if (sala.estado === "jugando") {

            mostrarRonda(sala);

        }

        if (sala.estado === "resultados") {

            mostrarResultados();

        }

        if (sala.estado === "finalizado") {

            cambiarPantalla("final");

        }

    });

}

// ----------------------------

async function comenzarJuego() {

    await updateDoc(doc(db, "salas", salaID), {

        estado: "jugando",

        ronda: 1

    });

}

// ----------------------------

function mostrarRonda(sala) {

    cambiarPantalla("game");

    rondaHTML.innerText = "Ronda " + sala.ronda;

    pregunta.innerText = sala.preguntas[sala.ronda - 1];

    respuesta.value = "";

    escucharCantidadRespuestas();

}

// ----------------------------

async function enviarRespuesta() {

    const texto = respuesta.value.trim();

    if (texto === "") {

        alert("Escribí una respuesta.");

        return;

    }

    btnEnviar.disabled = true;

    await setDoc(

        doc(db, "salas", salaID, "rondas", String(ronda), "respuestas", jugadorID),

        {

            nick,

            texto,

            fecha: serverTimestamp()

        }

    );

    await updateDoc(

        doc(db, "salas", salaID, "jugadores", jugadorID),

        {

            respondio: true

        }

    );

    document.getElementById("esperando").innerText =
        "Respuesta enviada. Esperando al resto...";

}

// ----------------------------

function escucharCantidadRespuestas() {

    onSnapshot(

        collection(db, "salas", salaID, "rondas", String(ronda), "respuestas"),

        async (snapshot) => {

            contador.innerText =
                snapshot.size + "/" + TOTAL_JUGADORES;

            if (
                snapshot.size >= TOTAL_JUGADORES &&
                soyAdmin
            ) {

                await updateDoc(

                    doc(db, "salas", salaID),

                    {

                        estado: "resultados"

                    }

                );

            }

        }

    );

}

// ----------------------------

function mostrarResultados() {

    cambiarPantalla("results");

    listaRespuestas.innerHTML = "";

    onSnapshot(

        collection(
            db,
            "salas",
            salaID,
            "rondas",
            String(ronda),
            "respuestas"
        ),

        (snapshot) => {

            listaRespuestas.innerHTML = "";

            let respuestas = [];

            snapshot.forEach((docu) => {

                respuestas.push(docu.data());

            });

            respuestas.sort(() => Math.random() - 0.5);

            respuestas.forEach((r) => {

                const div = document.createElement("div");

                div.className = "respuesta";

                div.innerHTML = `

<div class="badge">
Respuesta anónima
</div>

${r.texto}

`;

                listaRespuestas.appendChild(div);

            });

        }

    );

}

// ----------------------------

async function siguienteRonda() {

    const salaSnap = await getDoc(

        doc(db, "salas", salaID)

    );

    const sala = salaSnap.data();

    const totalPreguntas = sala.preguntas.length;

    if (ronda >= totalPreguntas) {

        await updateDoc(

            doc(db, "salas", salaID),

            {

                estado: "finalizado"

            }

        );

        return;

    }

    const jugadores = await getDocs(

        collection(db, "salas", salaID, "jugadores")

    );

    for (const jugador of jugadores.docs) {

        await updateDoc(

            doc(
                db,
                "salas",
                salaID,
                "jugadores",
                jugador.id
            ),

            {

                respondio: false

            }

        );

    }

    await updateDoc(

        doc(db, "salas", salaID),

        {

            ronda: ronda + 1,

            estado: "jugando"

        }

    );

}

// ----------------------------

document
    .getElementById("volver")
    .addEventListener("click", () => {

        location.reload();

    });