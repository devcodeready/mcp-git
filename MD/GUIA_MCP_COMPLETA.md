# 🚀 Guía Completa: MCP-Git Server

## 📋 Tabla de Contenidos

- [¿Está listo el proyecto?](#-está-listo-el-proyecto)
- [¿Qué es un MCP?](#-qué-es-un-mcp-analogía-simple)
- [Arquitectura: ¿Cómo se conecta todo?](#-arquitectura-cómo-se-conecta-todo)
- [¿El server debe estar corriendo?](#-el-server-debe-estar-corriendo)
- [¿Cómo llega el cliente al servidor?](#-cómo-llega-el-cliente-al-servidor)
- [Pasos para echarlo a andar](#-pasos-para-echarlo-a-andar)
- [Herramientas disponibles](#-herramientas-disponibles)
- [Preguntas frecuentes](#-preguntas-frecuentes)

---

## ✅ ¿Está listo el proyecto?

### Checklist de lo que ya tienes:

| Componente | Estado | Archivo |
|---|---|---|
| 🐳 Dockerfile | ✅ Listo | `.devcontainer/Dockerfile` |
| ⚙️ DevContainer config | ✅ Listo | `.devcontainer/devcontainer.json` |
| 🧠 Servidor MCP | ✅ Listo | `mcp-server/server.js` |
| 📦 Dependencias | ✅ Listo | `mcp-server/package.json` |
| 🔑 Token de GitHub | ✅ Configurado | `.env` |
| 🔑 Usuario de GitHub | ✅ Configurado | `.env` |

### ⚠️ Lo que falta antes de funcionar:

| Pendiente | Detalle |
|---|---|
| 📦 `npm install` | Las dependencias NO están instaladas (no hay `node_modules/`) |
| 🐳 Reopen in Container | Debes abrir el proyecto dentro del contenedor |
| 🔧 Configurar el cliente | Tu landing page necesita saber dónde está el MCP |

> **Veredicto: El código está LISTO ✅, pero necesita ser "encendido" dentro del contenedor.**

---

## 🧠 ¿Qué es un MCP? (Analogía Simple)

Piénsalo así:

```
🍕 ANALOGÍA: EL RESTAURANTE

Tu Landing Page  = El cliente que tiene hambre (quiere hacer git push, commit, etc.)
El MCP Server    = El mesero del restaurante (recibe pedidos y los ejecuta)
Git / GitHub     = La cocina (donde realmente se hace el trabajo)
Las Tools        = El menú (lo que puedes pedir: git_status, git_push, etc.)
El Protocolo MCP = El idioma que hablan cliente y mesero (JSON sobre stdio)
```

**MCP = Model Context Protocol**
Es un estándar creado por Anthropic para que los **editores de código inteligentes** (como Cursor, VS Code + Copilot) puedan hablar con **servidores externos** que les dan superpoderes.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  "Oye MCP, ¿cuál es el status de mi repo?"                  │
│  "Oye MCP, haz commit de todos los archivos"                │
│  "Oye MCP, haz push a la rama main"                         │
│                                                              │
│  👆 Eso es lo que un CLIENTE le pide al MCP Server           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura: ¿Cómo se conecta todo?

### 🔑 Concepto clave: Tu MCP usa transporte STDIO

Tu servidor usa `StdioServerTransport`. Esto significa que **NO es un servidor HTTP** que escucha en un puerto. En su lugar, se comunica por **entrada/salida estándar** (stdin/stdout), como si fuera una conversación por tubo (pipe):

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║   🖥️ TU MÁQUINA LOCAL                                                  ║
║                                                                        ║
║   ┌─────────────────────┐         ┌─────────────────────┐              ║
║   │                     │  stdin   │                     │              ║
║   │   🎯 CURSOR / IDE   │ ──────► │  🧠 MCP SERVER      │              ║
║   │   (El Cliente)      │         │  (server.js)        │              ║
║   │                     │ ◄────── │                     │              ║
║   │                     │  stdout  │                     │              ║
║   └─────────────────────┘         └────────┬────────────┘              ║
║                                            │                            ║
║                                            │ usa simple-git            ║
║                                            │ + GITHUB_TOKEN            ║
║                                            ▼                            ║
║                                   ┌─────────────────────┐              ║
║                                   │                     │              ║
║                                   │  📁 /workspace      │              ║
║                                   │  (tu repo git)      │              ║
║                                   │                     │              ║
║                                   └────────┬────────────┘              ║
║                                            │                            ║
╚════════════════════════════════════════════│════════════════════════════╝
                                             │ git push
                                             ▼
                                    ┌─────────────────────┐
                                    │                     │
                                    │  ☁️  GITHUB.COM      │
                                    │                     │
                                    └─────────────────────┘
```

### 🔑 ¿Y qué tiene que ver STDIO?

```
Analogía del TUBO:

  ┌────────┐      ┌═══════════════════╗      ┌────────┐
  │ CURSOR │ ───► ║  TUBO (stdin)     ║ ───► │ SERVER │
  │  (IDE) │      ╚═══════════════════╝      │  MCP   │
  │        │      ┌═══════════════════╗      │        │
  │        │ ◄─── ║  TUBO (stdout)    ║ ◄─── │        │
  └────────┘      ╚═══════════════════╝      └────────┘

  💡 No hay puerto, no hay URL, no hay HTTP.
  💡 Cursor LANZA el proceso del server y le habla por stdin/stdout.
  💡 Es como hablar por un walkie-talkie privado.
```

---

## 🔌 ¿El server debe estar corriendo?

### Respuesta corta: **NO lo arrancas tú, lo arranca el CLIENTE (Cursor).**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ❌ INCORRECTO:                                              │
│     "Voy a prender el server y luego abro mi landing page"  │
│                                                              │
│  ✅ CORRECTO:                                                │
│     "Configuro Cursor para que ÉL arranque el server         │
│      cuando lo necesite"                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Cuando Cursor detecta una configuración MCP, **él mismo ejecuta** `node server.js` y establece la comunicación por stdin/stdout automáticamente. Tú no necesitas tener una terminal con el server corriendo.

---

## 🔗 ¿Cómo llega el cliente al servidor?

### Paso crucial: El archivo de configuración MCP

En tu **otro proyecto** (la landing page) o en la configuración global de Cursor, necesitas un archivo que le diga a Cursor: *"Oye, existe un servidor MCP, ejecútalo así"*.

### Opción A: Configuración por proyecto (RECOMENDADA)

Crea este archivo en la raíz de tu proyecto landing page:

📁 **`tu-landing-page/.cursor/mcp.json`**

```json
{
  "mcpServers": {
    "mi-mcp-git": {
      "command": "node",
      "args": [
        "/ruta/absoluta/a/mcp-git/mcp-server/server.js"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_TU_TOKEN_AQUI",
        "GITHUB_USER": "devcodeready"
      }
    }
  }
}
```

### Opción B: Configuración global de Cursor

Archivo: **`~/.cursor/mcp.json`**

```json
{
  "mcpServers": {
    "mi-mcp-git": {
      "command": "node",
      "args": [
        "/home/noxtla/.gemini/antigravity/scratch/mcp-git/mcp-server/server.js"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_TU_TOKEN_AQUI",
        "GITHUB_USER": "devcodeready"
      }
    }
  }
}
```

### 📊 Diagrama del flujo de conexión:

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║  📁 tu-landing-page/                                                ║
║  ├── .cursor/                                                       ║
║  │   └── mcp.json  ◄──── "Oye Cursor, aquí hay un MCP server"      ║
║  ├── index.html                                                     ║
║  ├── style.css                                                      ║
║  └── ...                                                            ║
║                                                                     ║
║  Cuando abres este proyecto en Cursor:                              ║
║                                                                     ║
║  1️⃣  Cursor lee .cursor/mcp.json                                    ║
║  2️⃣  Cursor ejecuta: node /ruta/a/mcp-server/server.js              ║
║  3️⃣  Se abre el "tubo" stdin/stdout                                 ║
║  4️⃣  Cursor pregunta: "¿Qué tools tienes?"                         ║
║  5️⃣  Server responde: "Tengo git_status, git_push, etc."           ║
║  6️⃣  ¡Listo! Ya puedes usar las tools desde el chat de Cursor       ║
║                                                                     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 📝 Pasos para echarlo a andar

### 🅰️ Opción SIN Dev Container (más simple para empezar)

```
PASO 1 ─ Instalar dependencias
──────────────────────────────────────
📂 Abrir terminal en: mcp-git/mcp-server/
$ npm install

PASO 2 ─ Verificar que el server funciona
──────────────────────────────────────
$ echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node server.js

   Si ves una respuesta JSON ─► ✅ El server funciona

PASO 3 ─ Configurar Cursor en tu landing page
──────────────────────────────────────
📂 En tu proyecto landing page:
$ mkdir -p .cursor
$ touch .cursor/mcp.json
   Editar mcp.json con la configuración de arriba ☝️

PASO 4 ─ Reiniciar Cursor
──────────────────────────────────────
   Cerrar y abrir Cursor, o Cmd+Shift+P → "Reload Window"

PASO 5 ─ Verificar en Cursor
──────────────────────────────────────
   Ve a Settings → MCP → Debes ver "mi-mcp-git" con status verde ✅
```

### 🅱️ Opción CON Dev Container

```
PASO 1 ─ Reopen in Container
──────────────────────────────────────
   En el proyecto mcp-git:
   Cmd+Shift+P → "Dev Containers: Reopen in Container"
   ⏳ Esperar a que se construya el contenedor...
   📦 npm install se ejecuta automáticamente (postCreateCommand)

PASO 2 ─ Configurar Cursor en tu landing page
──────────────────────────────────────
   ⚠️ IMPORTANTE: Si el server corre DENTRO del container,
   necesitas configurar la ruta DENTRO del container:

   .cursor/mcp.json:
   {
     "mcpServers": {
       "mi-mcp-git": {
         "command": "docker",
         "args": [
           "exec", "-i", "NOMBRE_DEL_CONTAINER",
           "node", "/workspace/mcp-server/server.js"
         ],
         "env": {
           "GITHUB_TOKEN": "...",
           "GITHUB_USER": "..."
         }
       }
     }
   }

PASO 3 ─ Reiniciar Cursor y verificar
──────────────────────────────────────
   Mismo que Opción A, pasos 4 y 5.
```

> 💡 **Recomendación:** Empieza con la **Opción A (sin container)** para probar rápido. Luego migra al container cuando todo funcione.

---

## 🛠️ Herramientas disponibles

Tu MCP Server expone estas 6 herramientas que Cursor puede usar:

```
┌────────────────────┬─────────────────────────────────────────┐
│ 🔧 Tool            │ 📝 ¿Qué hace?                          │
├────────────────────┼─────────────────────────────────────────┤
│ crear_archivo      │ Crea/sobreescribe un archivo            │
│ leer_archivo       │ Lee el contenido de un archivo          │
│ git_status         │ Muestra estado del repo (modified, etc) │
│ git_add_commit     │ Hace git add + commit con mensaje       │
│ git_push           │ Push a GitHub con autenticación         │
│ listar_archivos    │ Lista archivos de un directorio         │
└────────────────────┴─────────────────────────────────────────┘
```

### Ejemplo de uso desde Cursor Chat:

```
TÚ: "Revisa el estado de mi repo y haz commit de todo con el
     mensaje 'landing page v1'"

CURSOR: Voy a usar las herramientas del MCP...
        → Ejecuta git_status
        → Ejecuta git_add_commit con archivos ["."] y mensaje "landing page v1"
        → Resultado: ✅ Commit creado: abc1234
```

---

## ❓ Preguntas frecuentes

### "¿El MCP es un API REST?"
**No.** Tu MCP usa STDIO (stdin/stdout), no HTTP. No hay endpoints, no hay puertos, no hay URLs. Cursor ejecuta el proceso directamente.

### "¿Puedo usar el MCP desde un navegador?"
**No directamente.** MCP está diseñado para que un IDE inteligente (Cursor, VS Code) lo use. Tu landing page no llama al MCP—Cursor es el intermediario.

### "¿El server consume recursos si no lo uso?"
**No.** Cursor lo arranca solo cuando lo necesita y lo detiene cuando ya no.

### "¿Puedo tener varios MCP servers?"
**Sí.** Puedes configurar múltiples servers en `mcp.json`:

```json
{
  "mcpServers": {
    "mi-mcp-git": { ... },
    "otro-mcp-database": { ... },
    "mcp-deploy": { ... }
  }
}
```

### "¿Necesito el Dev Container para que funcione?"
**No es obligatorio.** El Dev Container es útil para tener un entorno aislado y reproducible, pero puedes correr el server directamente en tu máquina si tienes Node.js instalado.

---

## 🎯 Diagrama resumen final

```
╔═══════════════════════════════════════════════════════════════════╗
║                     TU SETUP COMPLETO                            ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │                 VENTANA 1 DE CURSOR                         │  ║
║  │                                                             │  ║
║  │  📁 tu-landing-page/                                        │  ║
║  │  ├── .cursor/mcp.json  ←── config que apunta al MCP        │  ║
║  │  ├── index.html                                             │  ║
║  │  └── ...                                                    │  ║
║  │                                                             │  ║
║  │  💬 Chat de Cursor:                                         │  ║
║  │  "Haz push de mi landing page a GitHub"                     │  ║
║  │      │                                                      │  ║
║  │      ▼                                                      │  ║
║  │  Cursor lee mcp.json → lanza node server.js                 │  ║
║  │      │                                                      │  ║
║  │      ▼ (stdin/stdout)                                       │  ║
║  │  ┌──────────────────────────────────┐                       │  ║
║  │  │ 🧠 MCP Server (server.js)       │                       │  ║
║  │  │   → git_add_commit(["."]),       │                       │  ║
║  │  │     "landing page v1")           │                       │  ║
║  │  │   → git_push("main")            │                       │  ║
║  │  └──────────────┬───────────────────┘                       │  ║
║  │                 │                                            │  ║
║  └─────────────────│───────────────────────────────────────────┘  ║
║                    │                                              ║
║                    │ git push (con GITHUB_TOKEN)                 ║
║                    ▼                                              ║
║           ┌─────────────────┐                                    ║
║           │  ☁️  GitHub.com  │                                    ║
║           │  tu-repo/       │                                    ║
║           └─────────────────┘                                    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🔐 Nota de seguridad

> ⚠️ **IMPORTANTE:** Tu archivo `.env` contiene tu token de GitHub en texto plano. Asegúrate de:
> - Tener `.env` en tu `.gitignore` para que NO se suba al repo
> - No compartir el token con nadie
> - Si el token se filtra, revócalo inmediatamente en GitHub → Settings → Developer Settings → Personal Access Tokens

---

## 📚 Resumen en una frase

> **Tu landing page NO se conecta directamente al MCP. Cursor es el intermediario: tú le pides cosas en lenguaje natural desde el chat de Cursor, él ejecuta el MCP server automáticamente, y el MCP ejecuta los comandos de git.**

---

*Creado el 27 de Marzo de 2026 🗓️*
*Proyecto: mcp-git por devcodeready*
