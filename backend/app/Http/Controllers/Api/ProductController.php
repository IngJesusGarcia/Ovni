<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Services\XlsxService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    // ──────────────────────────────────────────────
    //  CRUD original
    // ──────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Product::with('category:id,name');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('unit')) {
            $query->where('unit', $request->unit);
        }
        if ($request->filled('active_only')) {
            $query->active();
        }
        if ($request->filled('low_stock')) {
            $query->lowStock();
        }

        return response()->json(
            $query->orderBy('name')->paginate($request->get('per_page', 25))
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code'           => 'required|string|max:50|unique:products,code',
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'price'          => 'required|numeric|min:0',
            'cost'           => 'required|numeric|min:0',
            'stock'          => 'required|numeric|min:0',
            'min_stock'      => 'nullable|numeric|min:0',
            'unit'           => 'required|string|in:pieza,kg',
            'has_expiration' => 'boolean',
            'category_id'    => 'nullable|exists:categories,id',
            'use_inventory'  => 'boolean',
        ]);

        $product = Product::create($validated);

        return response()->json($product->load('category:id,name'), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load('category:id,name', 'batches'));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'code'           => "required|string|max:50|unique:products,code,{$product->id}",
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'price'          => 'required|numeric|min:0',
            'cost'           => 'required|numeric|min:0',
            'min_stock'      => 'nullable|numeric|min:0',
            'unit'           => 'required|string|in:pieza,kg',
            'has_expiration' => 'boolean',
            'category_id'    => 'nullable|exists:categories,id',
            'is_active'      => 'boolean',
            'use_inventory'  => 'boolean',
        ]);

        $product->update($validated);

        return response()->json($product->load('category:id,name'));
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Producto eliminado correctamente.']);
    }

    public function search(Request $request)
    {
        $request->validate(['q' => 'required|string|min:1']);

        $products = Product::active()
            ->search($request->q)
            ->with('category:id,name')
            ->limit(20)
            ->get();

        return response()->json($products);
    }

    public function findByBarcode(string $code)
    {
        $product = Product::where('code', $code)->active()->first();

        if (!$product) {
            return response()->json(['message' => 'Producto no encontrado.'], 404);
        }

        return response()->json($product->load('category:id,name'));
    }

    // ──────────────────────────────────────────────
    //  EXPORT
    // ──────────────────────────────────────────────

    /**
     * GET /v1/products/export
     * Exports all products (or filtered) as .xlsx
     */
    public function export(Request $request, XlsxService $xlsx)
    {
        $query = Product::with('category:id,name')->orderBy('name');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }

        $products = $query->get();

        $headers = [
            'codigo',
            'nombre',
            'descripcion',
            'precio',
            'costo',
            'stock',
            'stock_minimo',
            'unidad',
            'categoria',
            'tiene_caducidad',
            'activo',
        ];

        $rows = $products->map(function (Product $p) {
            return [
                $p->code,
                $p->name,
                $p->description ?? '',
                $p->price,
                $p->cost,
                $p->stock,
                $p->min_stock,
                $p->unit,
                $p->category?->name ?? '',
                $p->has_expiration ? 'si' : 'no',
                $p->is_active ? 'si' : 'no',
            ];
        })->toArray();

        $content  = $xlsx->generate($headers, $rows, 'Productos');
        $filename = 'productos_' . now()->format('Ymd_His') . '.xlsx';

        return response($content, 200, [
            'Content-Type'              => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition'       => "attachment; filename=\"{$filename}\"",
            'Content-Length'            => strlen($content),
            'Access-Control-Expose-Headers' => 'Content-Disposition',
        ]);
    }

    // ──────────────────────────────────────────────
    //  TEMPLATE
    // ──────────────────────────────────────────────

    /**
     * GET /v1/products/template
     * Downloads an empty .xlsx template with example row
     */
    public function template(XlsxService $xlsx)
    {
        $headers = [
            'codigo',
            'nombre',
            'descripcion',
            'precio',
            'costo',
            'stock',
            'stock_minimo',
            'unidad',
            'categoria',
            'tiene_caducidad',
        ];

        $rows = [
            [
                'PROD001',
                'Ejemplo Producto',
                'Descripción opcional',
                '25.50',
                '15.00',
                '100',
                '10',
                'pieza',
                '',
                'no',
            ],
        ];

        $content  = $xlsx->generate($headers, $rows, 'Plantilla');
        $filename = 'plantilla_productos.xlsx';

        return response($content, 200, [
            'Content-Type'              => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition'       => "attachment; filename=\"{$filename}\"",
            'Content-Length'            => strlen($content),
            'Access-Control-Expose-Headers' => 'Content-Disposition',
        ]);
    }

    // ──────────────────────────────────────────────
    //  IMPORT — PREVIEW (detecta columnas del archivo)
    // ──────────────────────────────────────────────

    /**
     * POST /v1/products/import/preview
     * Reads the file and returns:
     *  - detected_columns: column names found in the file
     *  - suggested_mapping: auto-mapped columns based on synonyms
     *  - sample_rows: first 3 data rows for visual confirmation
     */
    public function importPreview(Request $request, XlsxService $xlsx)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,zip|max:10240',
        ]);

        $path = $request->file('file')->getRealPath();

        try {
            // Parse without header conversion so we can inspect raw headers
            $allRows = $xlsx->parse($path, hasHeader: false);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al leer el archivo: ' . $e->getMessage()], 422);
        }

        if (empty($allRows)) {
            return response()->json(['message' => 'El archivo está vacío.'], 422);
        }

        $rawHeaders       = $allRows[0];
        $detectedColumns  = array_map(fn($h) => trim((string) $h), $rawHeaders);
        $dataRows         = array_slice($allRows, 1);
        $totalRows        = count($dataRows);

        // Auto-suggest mapping from file columns → system fields
        $systemFields = [
            'codigo'          => ['codigo', 'code', 'clave', 'cve', 'sku', 'id', 'barcode', 'codigobarras', 'cod', 'codbarras', 'clave producto', 'clave_producto'],
            'nombre'          => ['nombre', 'name', 'producto', 'descripcion producto', 'articulo', 'artículo', 'descripcion', 'descripción', 'nomproducto', 'nom_producto'],
            'precio'          => ['precio', 'price', 'precioventa', 'precio venta', 'p.venta', 'pventa', 'venta', 'precio_venta', 'precio de venta'],
            'costo'           => ['costo', 'cost', 'costocompra', 'costo compra', 'p.compra', 'pcompra', 'compra', 'costo_compra', 'precio compra', 'precio_costo'],
            'stock'           => ['stock', 'existencia', 'existencias', 'cantidad', 'qty', 'inventory', 'inventario', 'cant', 'cant.'],
            'stock_minimo'    => ['stock_minimo', 'stockminimo', 'stock minimo', 'min_stock', 'minstock', 'minimo', 'mínimo', 'existencia minima', 'existenciaminima'],
            'unidad'          => ['unidad', 'unit', 'um', 'unidadmedida', 'unidad medida', 'unidad_medida', 'medida', 'tipo'],
            'categoria'       => ['categoria', 'category', 'categoría', 'departamento', 'dept', 'grupo', 'linea', 'línea', 'familia'],
            'descripcion'     => ['descripcion', 'descripción', 'description', 'detalle', 'notas', 'obs', 'observaciones'],
            'tiene_caducidad' => ['tiene_caducidad', 'caducidad', 'expira', 'expiracion', 'expiración', 'vence', 'perecedero', 'caducable'],
        ];

        $suggestedMapping = [];
        $normalizeKey     = fn($s) => strtolower(preg_replace('/[\s_\-\.]+/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $s)));

        foreach ($detectedColumns as $colIndex => $colName) {
            $normalizedCol = $normalizeKey($colName);
            foreach ($systemFields as $field => $synonyms) {
                foreach ($synonyms as $synonym) {
                    if ($normalizeKey($synonym) === $normalizedCol) {
                        $suggestedMapping[$colIndex] = $field;
                        break 2;
                    }
                }
            }
        }

        // Build sample rows as associative with original column names
        $sampleRows = [];
        foreach (array_slice($dataRows, 0, 3) as $row) {
            $assoc = [];
            foreach ($detectedColumns as $i => $col) {
                $assoc[$col] = $row[$i] ?? '';
            }
            // Skip if completely empty
            if (array_filter(array_values($assoc), fn($v) => $v !== '') === []) continue;
            $sampleRows[] = $assoc;
        }

        return response()->json([
            'detected_columns'  => $detectedColumns,
            'suggested_mapping' => $suggestedMapping,
            'sample_rows'       => $sampleRows,
            'total_rows'        => $totalRows,
        ]);
    }

    // ──────────────────────────────────────────────
    //  IMPORT — EXECUTE (with explicit column mapping)
    // ──────────────────────────────────────────────

    /**
     * POST /v1/products/import
     *
     * Body (multipart):
     *   file    — .xlsx file
     *   mapping — JSON string: { "Columna Archivo": "campo_sistema", … }
     *             Required system fields: codigo, nombre, precio
     *             Optional: costo, stock, stock_minimo, unidad, categoria, descripcion, tiene_caducidad
     */
    public function import(Request $request, XlsxService $xlsx)
    {
        $request->validate([
            'file'    => 'required|file|mimes:xlsx,xls,zip|max:10240',
            'mapping' => 'required|string',
        ]);

        $mapping = json_decode($request->input('mapping'), true);
        if (!is_array($mapping) || empty($mapping)) {
            return response()->json(['message' => 'El mapeo de columnas es inválido.'], 422);
        }

        // Validate required fields are mapped
        $mappedFields = array_values($mapping);
        foreach (['codigo', 'nombre', 'precio'] as $required) {
            if (!in_array($required, $mappedFields)) {
                return response()->json([
                    'message' => "El campo requerido '{$required}' no está mapeado a ninguna columna.",
                ], 422);
            }
        }

        $path = $request->file('file')->getRealPath();

        try {
            $allRows = $xlsx->parse($path, hasHeader: false);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al leer el archivo: ' . $e->getMessage()], 422);
        }

        if (count($allRows) < 2) {
            return response()->json(['message' => 'El archivo no contiene datos.'], 422);
        }

        // Mapping is now based on column index (e.g. { "0": "codigo", "2": "nombre" })
        $colFieldMap = [];
        foreach ($mapping as $i => $field) {
            if (!empty($field)) {
                $colFieldMap[(int) $i] = $field;
            }
        }

        $dataRows = array_slice($allRows, 1);

        // Build category map
        $categoryMap = Category::pluck('id', 'name')
            ->mapWithKeys(fn($id, $name) => [strtolower($name) => $id])
            ->toArray();

        $created = 0;
        $updated = 0;
        $errors  = [];

        DB::beginTransaction();

        try {
            foreach ($dataRows as $index => $rawRow) {
                $rowNum = $index + 2;

                // Map raw values using colFieldMap
                $row = [];
                foreach ($colFieldMap as $colIdx => $field) {
                    $row[$field] = trim((string) ($rawRow[$colIdx] ?? ''));
                }

                // Skip completely empty rows
                if (array_filter(array_values($row), fn($v) => $v !== '') === []) continue;

                // Category → id
                $categoryName = strtolower($row['categoria'] ?? '');
                $categoryId   = $categoryName !== '' ? ($categoryMap[$categoryName] ?? null) : null;

                // Normalize unit
                $rawUnit = strtolower($row['unidad'] ?? '');
                $unit = match(true) {
                    in_array($rawUnit, ['kg', 'kilogramo', 'kilogramos', 'kilo', 'kilos']) => 'kg',
                    default => 'pieza',
                };

                $data = [
                    'code'           => $row['codigo']          ?? '',
                    'name'           => $row['nombre']           ?? '',
                    'description'    => ($row['descripcion']     ?? '') ?: null,
                    'price'          => $row['precio']           ?? '',
                    'cost'           => $row['costo']            ?? '0',
                    'stock'          => $row['stock']            ?? '0',
                    'min_stock'      => $row['stock_minimo']     ?? '0',
                    'unit'           => $unit,
                    'category_id'    => $categoryId,
                    'has_expiration' => in_array(strtolower($row['tiene_caducidad'] ?? 'no'), ['si', 'sí', '1', 'yes', 'true']),
                ];

                // Numeric cleanup: remove currency symbols, spaces, commas as thousands sep
                foreach (['price', 'cost', 'stock', 'min_stock'] as $numField) {
                    $val = preg_replace('/[^\d\.\-]/', '', str_replace(',', '.', $data[$numField]));
                    $data[$numField] = is_numeric($val) ? $val : '0';
                }
                if ($data['price'] === '0' || $data['price'] === '') {
                    $errors[] = ['fila' => $rowNum, 'codigo' => $data['code'], 'error' => 'El precio es 0 o está vacío'];
                    continue;
                }

                $validator = Validator::make($data, [
                    'code'        => 'required|string|max:50',
                    'name'        => 'required|string|max:255',
                    'price'       => 'required|numeric|min:0.01',
                    'cost'        => 'nullable|numeric|min:0',
                    'stock'       => 'nullable|numeric|min:0',
                    'min_stock'   => 'nullable|numeric|min:0',
                    'unit'        => 'required|in:pieza,kg',
                    'category_id' => 'nullable|exists:categories,id',
                ]);

                if ($validator->fails()) {
                    $errors[] = [
                        'fila'   => $rowNum,
                        'codigo' => $data['code'],
                        'error'  => implode('; ', $validator->errors()->all()),
                    ];
                    continue;
                }

                $existing = Product::where('code', $data['code'])->first();
                if ($existing) {
                    $updateData = $data;
                    unset($updateData['stock']);
                    $existing->update($updateData);
                    $updated++;
                } else {
                    Product::create($data);
                    $created++;
                }
            }

            if ($errors && $created === 0 && $updated === 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'No se pudo importar ningún producto. Revisa los errores.',
                    'errors'  => $errors,
                    'created' => 0,
                    'updated' => 0,
                ], 422);
            }

            DB::commit();

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error interno: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => "Importación completada: {$created} creados, {$updated} actualizados.",
            'created' => $created,
            'updated' => $updated,
            'errors'  => $errors,
        ]);
    }
}
