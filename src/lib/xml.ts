// Utilidades para mostrar el XML firmado de una factura. Solo son para lectura: el archivo
// que se descarga sigue siendo el original, porque reindentar un XML firmado invalida la firma.

const NS = {
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  sts: 'dian:gov:co:facturaelectronica:Structures-2-1',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  xades: 'http://uri.etsi.org/01903/v1.3.2#',
};

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (value: string) => escapeText(value).replace(/"/g, '&quot;');

const formatNode = (node: Node, depth: number, lines: string[]) => {
  const pad = '  '.repeat(depth);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (text) lines.push(pad + escapeText(text));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const attrs = Array.from(el.attributes).map(a => ` ${a.name}="${escapeAttr(a.value)}"`).join('');
  const children = Array.from(el.childNodes).filter(
    child => child.nodeType === Node.ELEMENT_NODE || (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()),
  );

  if (children.length === 0) {
    lines.push(`${pad}<${el.tagName}${attrs}/>`);
  } else if (children.length === 1 && children[0]!.nodeType === Node.TEXT_NODE) {
    lines.push(`${pad}<${el.tagName}${attrs}>${escapeText(children[0]!.textContent!.trim())}</${el.tagName}>`);
  } else {
    lines.push(`${pad}<${el.tagName}${attrs}>`);
    children.forEach(child => formatNode(child, depth + 1, lines));
    lines.push(`${pad}</${el.tagName}>`);
  }
};

export const formatXml = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return xml;
  const lines: string[] = [];
  formatNode(doc.documentElement, 0, lines);
  return lines.join('\n');
};

export type XmlSummary = {
  numero: string | null;
  cufe: string | null;
  fecha: string | null;
  total: string | null;
  qr: string | null;
  firmado: boolean;
  fechaFirma: string | null;
  politica: string | null;
};

const first = (doc: Document, ns: string, name: string) =>
  doc.getElementsByTagNameNS(ns, name)[0]?.textContent?.trim() || null;

// Datos clave que se pueden contrastar con el detalle de la factura y el PDF.
export const summarizeInvoiceXml = (xml: string): XmlSummary => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const fecha = first(doc, NS.cbc, 'IssueDate');
  const hora = first(doc, NS.cbc, 'IssueTime');

  return {
    numero: first(doc, NS.cbc, 'ID'),
    cufe: first(doc, NS.cbc, 'UUID'),
    fecha: fecha && hora ? `${fecha} ${hora}` : fecha,
    total: first(doc, NS.cbc, 'PayableAmount'),
    qr: first(doc, NS.sts, 'QRCode'),
    firmado: doc.getElementsByTagNameNS(NS.ds, 'Signature').length > 0,
    fechaFirma: first(doc, NS.xades, 'SigningTime'),
    politica: doc.getElementsByTagNameNS(NS.xades, 'SigPolicyId')[0]
      ?.getElementsByTagNameNS(NS.xades, 'Identifier')[0]?.textContent?.trim() ?? null,
  };
};

// Parte una línea del XML formateado en marcas y texto, para colorearla sin usar HTML crudo.
export const tokenizeXmlLine = (line: string) =>
  line.split(/(<\/?[\w:.-]+|\/?>|[\w:.-]+="[^"]*")/).filter(Boolean).map(part => ({
    text: part,
    kind: part.startsWith('<') || part.endsWith('>') ? 'tag' : /^[\w:.-]+="/.test(part) ? 'attr' : 'text',
  }) as const);
