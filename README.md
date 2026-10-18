# El camino al barrio 🏘️

Juego de casilleros para el encuentro de TECHO. Los grupos responden desde el celu, estilo Kahoot, y avanzan por un barrio en 3D: el camino se bifurca en el **carril de la mesa** y el **carril de la casa**, y los dos llegan al mismo lugar.

- **Proyector:** `https://TU-DIRECCION/proyector`
- **Celus de los grupos:** `https://TU-DIRECCION/` (o escanean el QR que aparece en el proyector)

---

## Cambiar las preguntas

Todo está en **`preguntas.yaml`**. Es el único archivo que hay que tocar.

1. En GitHub, abrí `preguntas.yaml` y tocá el lápiz ✏️.
2. Cambiá lo que quieras. Las instrucciones están al principio del archivo.
3. Tocá **Commit changes**.
4. Railway vuelve a publicar el juego solo en un par de minutos.

Cada vez que guardás, GitHub revisa el archivo. Si aparece una **❌ roja** al lado del cambio, hacé clic ahí → *Details* y te dice exactamente en qué pregunta está el error. Mientras haya un error, Railway sigue mostrando la versión anterior que andaba.

En ese archivo también podés cambiar los segundos para responder, la cantidad de rondas, si la frase "para decir" aparece en el proyector y cuántos casilleros retroceden en cada trampa.

---

## Subirlo por primera vez

### 1. GitHub
1. Entrá a github.com → **New repository** → nombre `el-camino-al-barrio` → **Create repository**.
2. Tocá **uploading an existing file** y arrastrá **todo el contenido** de esta carpeta (no la carpeta en sí).
   - Ojo: la carpeta `.github` está oculta en la Mac. Si no la ves, apretá `Cmd + Shift + .` en el Finder. Sin ella el juego anda igual, pero GitHub no revisa las preguntas.
3. **Commit changes**.

### 2. Railway
1. Entrá a railway.com → **New Project** → **Deploy from GitHub repo** → elegí `el-camino-al-barrio`.
2. Railway lo detecta solo y lo arranca.
3. En el servicio, andá a **Settings → Networking → Generate Domain**. Esa es la dirección del juego.
4. *(Opcional)* Para que nadie más pueda manejar el proyector: en **Variables**, agregá `CLAVE_FACILITADORA` con una clave. Después abrís el proyector como `/proyector?clave=TU_CLAVE`.

---

## El día del encuentro

1. En la compu conectada al proyector abrí `/proyector` y poné pantalla completa (F11, o `Ctrl/Cmd + Shift + F`).
2. Elegí cuántos grupos juegan con **− / +**.
3. Cada grupo escanea el QR con un celu y elige su número. En pantalla se ve quién ya entró.
4. **Empezar el juego**.

Cada ronda:
- Los grupos tienen 1:30 para responder. Arriba se ve cuántos ya respondieron. Si responden todos, pasa solo.
- **Cortar tiempo** corta antes. **Pausa** congela el reloj.
- Aparece **¡Tiempo!** → **Ver las respuestas** → se revela grupo por grupo (o juntos, si estaban en el mismo casillero) y las fichas se mueven.
- **Siguiente grupo** / **Siguiente ronda**.

Atajos de teclado (sirven con un pasador de diapositivas): **Espacio, Enter o →** = siguiente paso. **P** = pausa.

Abajo a la izquierda, el botón **⋯** tiene *Terminar juego* y *Volver a empezar* (piden tocar dos veces para confirmar).

**Si un celu se cuelga o se cierra:** vuelven a entrar a la dirección y siguen en su grupo. Si cambian de celu, eligen el mismo número y tocan dos veces.

### Reglas
- Grupos impares → carril de la mesa. Grupos pares → carril de la casa.
- Aciertan → avanzan 1. Fallan → se quedan y la ronda siguiente les toca otra pregunta del mismo casillero.
- Trampas: si detectan la trampa, avanzan. Si se la creen, retroceden (2 en la mesa, 3 en la casa).
- Si varios grupos están en el mismo casillero, reciben la misma pregunta.
- Al final gana el que llegó más lejos; si empatan, el que llegó antes y después el que respondió más rápido.

---

## Para probarlo en tu compu (opcional)

Necesitás [Node.js](https://nodejs.org) 18 o más nuevo.

```bash
npm install
npm start          # abre en http://localhost:3000
npm run revisar    # revisa preguntas.yaml sin arrancar el juego
```
