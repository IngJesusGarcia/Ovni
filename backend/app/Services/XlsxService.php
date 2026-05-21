<?php

namespace App\Services;

use ZipArchive;

/**
 * Minimal XLSX reader/writer — no external dependencies.
 * Supports string and numeric cells for import/export.
 */
class XlsxService
{
    // ──────────────────────────────────────────────
    //  WRITER
    // ──────────────────────────────────────────────

    /**
     * Generate an XLSX file and return its binary content.
     *
     * @param  array  $headers   ['Col A', 'Col B', …]
     * @param  array  $rows      [ [val1, val2, …], … ]
     * @param  string $sheetName
     * @return string  Binary content of the .xlsx file
     */
    public function generate(array $headers, array $rows, string $sheetName = 'Hoja1'): string
    {
        $sharedStrings = [];
        $sharedIndex   = [];

        $getStringIndex = function (string $value) use (&$sharedStrings, &$sharedIndex): int {
            if (!isset($sharedIndex[$value])) {
                $sharedIndex[$value]  = count($sharedStrings);
                $sharedStrings[]      = $value;
            }
            return $sharedIndex[$value];
        };

        // Build sheet XML
        $sheetXml  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $sheetXml .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        $sheetXml .= '<sheetData>';

        $rowIndex = 1;

        // Header row
        $sheetXml .= "<row r=\"{$rowIndex}\">";
        foreach ($headers as $ci => $header) {
            $col     = $this->colLetter($ci);
            $cellRef = "{$col}{$rowIndex}";
            $si      = $getStringIndex((string) $header);
            $sheetXml .= "<c r=\"{$cellRef}\" t=\"s\"><v>{$si}</v></c>";
        }
        $sheetXml .= '</row>';
        $rowIndex++;

        // Data rows
        foreach ($rows as $row) {
            $sheetXml .= "<row r=\"{$rowIndex}\">";
            foreach (array_values($row) as $ci => $value) {
                $col     = $this->colLetter($ci);
                $cellRef = "{$col}{$rowIndex}";

                if (is_numeric($value) && $value !== '') {
                    $sheetXml .= "<c r=\"{$cellRef}\"><v>" . $value . "</v></c>";
                } else {
                    $si = $getStringIndex((string) ($value ?? ''));
                    $sheetXml .= "<c r=\"{$cellRef}\" t=\"s\"><v>{$si}</v></c>";
                }
            }
            $sheetXml .= '</row>';
            $rowIndex++;
        }

        $sheetXml .= '</sheetData></worksheet>';

        // Shared strings XML
        $ssXml  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $ssXml .= '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
        $ssXml .= ' count="' . count($sharedStrings) . '" uniqueCount="' . count($sharedStrings) . '">';
        foreach ($sharedStrings as $s) {
            $ssXml .= '<si><t>' . htmlspecialchars($s, ENT_XML1, 'UTF-8') . '</t></si>';
        }
        $ssXml .= '</sst>';

        // workbook.xml
        $wbXml  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $wbXml .= '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
        $wbXml .= ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
        $wbXml .= '<sheets><sheet name="' . htmlspecialchars($sheetName, ENT_XML1) . '" sheetId="1" r:id="rId1"/></sheets>';
        $wbXml .= '</workbook>';

        // _rels/workbook.xml.rels
        $wbRels  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $wbRels .= '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        $wbRels .= '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>';
        $wbRels .= '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>';
        $wbRels .= '</Relationships>';

        // [Content_Types].xml
        $ctXml  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $ctXml .= '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
        $ctXml .= '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
        $ctXml .= '<Default Extension="xml" ContentType="application/xml"/>';
        $ctXml .= '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';
        $ctXml .= '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        $ctXml .= '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>';
        $ctXml .= '</Types>';

        // /_rels/.rels
        $rootRels  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $rootRels .= '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        $rootRels .= '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>';
        $rootRels .= '</Relationships>';

        // Build ZIP in memory
        $tmpFile = tempnam(sys_get_temp_dir(), 'xlsx_');
        $zip = new ZipArchive();
        $zip->open($tmpFile, ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml',              $ctXml);
        $zip->addFromString('_rels/.rels',                      $rootRels);
        $zip->addFromString('xl/workbook.xml',                  $wbXml);
        $zip->addFromString('xl/_rels/workbook.xml.rels',       $wbRels);
        $zip->addFromString('xl/worksheets/sheet1.xml',         $sheetXml);
        $zip->addFromString('xl/sharedStrings.xml',             $ssXml);
        $zip->close();

        $content = file_get_contents($tmpFile);
        unlink($tmpFile);

        return $content;
    }

    // ──────────────────────────────────────────────
    //  READER
    // ──────────────────────────────────────────────

    /**
     * Parse an XLSX file and return its rows as arrays.
     *
     * @param  string $filePath  Path to the uploaded .xlsx file
     * @param  bool   $hasHeader Skip first row if true; return associative arrays
     * @return array  [ ['Col A' => val, 'Col B' => val, …], … ]
     *                or [ [val, val, …], … ] when $hasHeader = false
     */
    public function parse(string $filePath, bool $hasHeader = true): array
    {
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new \RuntimeException('No se pudo abrir el archivo XLSX.');
        }

        // Read shared strings
        $sharedStrings = [];
        $ssContent = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssContent !== false) {
            $ssXml = simplexml_load_string($ssContent);
            foreach ($ssXml->si as $si) {
                $text = '';
                if (isset($si->t)) {
                    $text = (string) $si->t;
                } elseif (isset($si->r)) {
                    foreach ($si->r as $r) {
                        if (isset($r->t)) {
                            $text .= (string) $r->t;
                        }
                    }
                }
                $sharedStrings[] = $text;
            }
        }

        // Read first sheet
        $sheetContent = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();

        if ($sheetContent === false) {
            throw new \RuntimeException('No se encontró la hoja de datos en el archivo.');
        }

        $sheetXml = simplexml_load_string($sheetContent);
        $rows = [];

        foreach ($sheetXml->sheetData->row as $row) {
            $rowData = [];
            $prevColIndex = -1;

            foreach ($row->c as $cell) {
                // Determine column index from cell reference (e.g. "A1" → 0, "B1" → 1)
                $cellRef  = (string) $cell['r'];
                $colStr   = preg_replace('/[0-9]/', '', $cellRef);
                $colIndex = $this->colIndex($colStr);

                // Fill gaps with empty strings
                while ($prevColIndex < $colIndex - 1) {
                    $rowData[] = '';
                    $prevColIndex++;
                }

                $type  = (string) ($cell['t'] ?? '');
                $value = (string) ($cell->v ?? '');

                if ($type === 's') {
                    // Shared string
                    $value = $sharedStrings[(int) $value] ?? '';
                } elseif ($type === 'inlineStr') {
                    $value = (string) ($cell->is->t ?? '');
                }
                // Numeric / date cells remain as string representation of the number

                $rowData[]    = $value;
                $prevColIndex = $colIndex;
            }

            $rows[] = $rowData;
        }

        if (empty($rows)) {
            return [];
        }

        if (!$hasHeader) {
            return $rows;
        }

        $headers = array_shift($rows);
        $result  = [];
        foreach ($rows as $row) {
            $assoc = [];
            foreach ($headers as $i => $header) {
                $assoc[$header] = $row[$i] ?? '';
            }
            $result[] = $assoc;
        }

        return $result;
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    /** Convert 0-based column index to Excel letter (0→A, 25→Z, 26→AA …) */
    private function colLetter(int $index): string
    {
        $letter = '';
        $index++;
        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)) . $letter;
            $index  = intdiv($index, 26);
        }
        return $letter;
    }

    /** Convert Excel column letters to 0-based index (A→0, Z→25, AA→26 …) */
    private function colIndex(string $col): int
    {
        $col   = strtoupper($col);
        $index = 0;
        $len   = strlen($col);
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($col[$i]) - 64);
        }
        return $index - 1;
    }
}
