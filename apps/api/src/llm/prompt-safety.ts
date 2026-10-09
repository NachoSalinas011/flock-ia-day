/** Tags used in the prompts to separate data from instructions. */
const RESERVED_TAGS = [
  'fuentes_del_cliente',
  'historico',
  'indicaciones_del_usuario',
  'contexto',
];
const RESERVED_TAG_RE = new RegExp(
  `<\\s*/?\\s*(?:${RESERVED_TAGS.join('|')})\\b[^>]*>`,
  'gi',
);

/**
 * Untrusted text (sources, history, user instructions) must not be able to
 * close or open our delimiter blocks and smuggle instructions into the prompt.
 */
export function neutralizePromptTags(text: string): string {
  return text.replace(RESERVED_TAG_RE, '[etiqueta omitida]');
}
