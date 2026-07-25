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