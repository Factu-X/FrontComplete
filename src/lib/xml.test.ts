// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { formatXml, summarizeInvoiceXml, tokenizeXmlLine } from './xml';

const xml = '<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" '
  + 'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" '
  + 'xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" '
  + 'xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1" '
  + 'xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">'
  + '<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><sts:QRCode>https://x/?documentkey=abc</sts:QRCode></ext:ExtensionContent></ext:UBLExtension>'
  + '<ext:UBLExtension><ext:ExtensionContent><ds:Signature Id="s1"><xades:SigningTime>2026-10-22T17:34:00Z</xades:SigningTime>'
  + '<xades:SigPolicyId><xades:Identifier>https://dian/politicadefirmav2.pdf</xades:Identifier></xades:SigPolicyId></ds:Signature></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>'
  + '<cbc:ID>SETP990000001</cbc:ID><cbc:UUID schemeName="CUFE-SHA384">abc</cbc:UUID>'
  + '<cbc:IssueDate>2026-10-22</cbc:IssueDate><cbc:IssueTime>12:34:00-05:00</cbc:IssueTime>'
  + '<cbc:PayableAmount currencyID="COP">164220.00</cbc:PayableAmount><ext:Empty/></Invoice>';

describe('formatXml', () => {
  it('indents nested elements and keeps text inline', () => {
    const lines = formatXml(xml).split('\n');
    expect(lines[0]).toMatch(/^<Invoice /);
    expect(lines).toContain('  <cbc:ID>SETP990000001</cbc:ID>');
    expect(lines).toContain('  <ext:Empty/>');
    expect(lines.at(-1)).toBe('</Invoice>');
  });

  it('returns the original text when it is not valid XML', () => {
    expect(formatXml('<a><b></a>')).toBe('<a><b></a>');
  });
});

describe('summarizeInvoiceXml', () => {
  it('extracts the data to compare with the invoice', () => {
    expect(summarizeInvoiceXml(xml)).toEqual({
      numero: 'SETP990000001',
      cufe: 'abc',
      fecha: '2026-10-22 12:34:00-05:00',
      total: '164220.00',
      qr: 'https://x/?documentkey=abc',
      firmado: true,
      fechaFirma: '2026-10-22T17:34:00Z',
      politica: 'https://dian/politicadefirmav2.pdf',
    });
  });
});

describe('tokenizeXmlLine', () => {
  it('separates tags, attributes and text', () => {
    expect(tokenizeXmlLine('<cbc:UUID schemeName="CUFE-SHA384">abc</cbc:UUID>')).toEqual([
      { text: '<cbc:UUID', kind: 'tag' },
      { text: ' ', kind: 'text' },
      { text: 'schemeName="CUFE-SHA384"', kind: 'attr' },
      { text: '>', kind: 'tag' },
      { text: 'abc', kind: 'text' },
      { text: '</cbc:UUID', kind: 'tag' },
      { text: '>', kind: 'tag' },
    ]);
  });
});
