// mcp-server/server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

// ─────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────
const WORKSPACE = '/workspace';
const git = simpleGit(WORKSPACE);

// ─────────────────────────────────────────
// CREAR EL SERVIDOR
// ─────────────────────────────────────────
const server = new Server(
  {
    name: 'mi-primer-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─────────────────────────────────────────
// DEFINIR LAS HERRAMIENTAS (TOOLS)
// Esto es lo que Cursor puede "pedirle" al servidor
// ─────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'crear_archivo',
        description: 'Crea o sobreescribe un archivo en el workspace',
        inputSchema: {
          type: 'object',
          properties: {
            ruta: {
              type: 'string',
              description: 'Ruta relativa del archivo (ej: web/index.html)',
            },
            contenido: {
              type: 'string',
              description: 'Contenido del archivo',
            },
          },
          required: ['ruta', 'contenido'],
        },
      },
      {
        name: 'leer_archivo',
        description: 'Lee el contenido de un archivo',
        inputSchema: {
          type: 'object',
          properties: {
            ruta: {
              type: 'string',
              description: 'Ruta relativa del archivo',
            },
          },
          required: ['ruta'],
        },
      },
      {
        name: 'git_status',
        description: 'Muestra el estado actual del repositorio git',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'git_add_commit',
        description: 'Hace git add de archivos y crea un commit',
        inputSchema: {
          type: 'object',
          properties: {
            archivos: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lista de archivos a agregar (usa ["."] para todo)',
            },
            mensaje: {
              type: 'string',
              description: 'Mensaje del commit',
            },
          },
          required: ['archivos', 'mensaje'],
        },
      },
      {
        name: 'git_push',
        description: 'Hace push de la rama actual a GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            rama: {
              type: 'string',
              description: 'Nombre de la rama (ej: feature/mi-pagina-web)',
            },
          },
          required: ['rama'],
        },
      },
      {
        name: 'listar_archivos',
        description: 'Lista los archivos de un directorio',
        inputSchema: {
          type: 'object',
          properties: {
            directorio: {
              type: 'string',
              description: 'Directorio a listar (ej: web/)',
            },
          },
          required: ['directorio'],
        },
      },
    ],
  };
});

// ─────────────────────────────────────────
// EJECUTAR LAS HERRAMIENTAS
// ─────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── CREAR ARCHIVO ──────────────────
      case 'crear_archivo': {
        const rutaCompleta = path.join(WORKSPACE, args.ruta);
        await fs.ensureDir(path.dirname(rutaCompleta));
        await fs.writeFile(rutaCompleta, args.contenido, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: `✅ Archivo creado: ${args.ruta}`,
            },
          ],
        };
      }

      // ── LEER ARCHIVO ───────────────────
      case 'leer_archivo': {
        const rutaCompleta = path.join(WORKSPACE, args.ruta);
        const contenido = await fs.readFile(rutaCompleta, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: contenido,
            },
          ],
        };
      }

      // ── GIT STATUS ─────────────────────
      case 'git_status': {
        const status = await git.status();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      // ── GIT ADD + COMMIT ───────────────
      case 'git_add_commit': {
        await git.add(args.archivos);
        const commit = await git.commit(args.mensaje);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Commit creado: ${commit.commit}\nMensaje: ${args.mensaje}`,
            },
          ],
        };
      }

      // ── GIT PUSH ───────────────────────
      case 'git_push': {
        // Configurar credenciales usando el token del environment
        const token = process.env.GITHUB_TOKEN;
        const user = process.env.GITHUB_USER;

        if (!token || !user) {
          throw new Error('GITHUB_TOKEN y GITHUB_USER deben estar configurados');
        }

        // Obtener la URL actual del remote
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');

        if (!origin) {
          throw new Error('No se encontró el remote "origin"');
        }

        // Insertar credenciales en la URL
        const repoUrl = origin.refs.push;
        const authedUrl = repoUrl.replace(
          'https://',
          `https://${user}:${token}@`
        );

        await git.push(authedUrl, args.rama, ['--set-upstream']);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Push exitoso a la rama: ${args.rama}\n🔗 Revisa tu repo en GitHub!`,
            },
          ],
        };
      }

      // ── LISTAR ARCHIVOS ────────────────
      case 'listar_archivos': {
        const rutaCompleta = path.join(WORKSPACE, args.directorio);
        const archivos = await fs.readdir(rutaCompleta);
        return {
          content: [
            {
              type: 'text',
              text: archivos.join('\n'),
            },
          ],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─────────────────────────────────────────
// INICIAR EL SERVIDOR
// ─────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Servidor MCP iniciado y esperando conexiones...');
}

main().catch(console.error);
