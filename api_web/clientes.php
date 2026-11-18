<?php
/**
 * SIAP web · API de clientes
 *
 * Recibe paquetes de clientes desde el servidor de la oficina (MySQL local)
 * y los guarda en la MySQL de la web: crea el cliente si no existe y lo
 * actualiza si ya existe. La web queda igual a lo que recibe.
 *
 * Petición:
 *   POST https://prolomer.com.mx/api_web/clientes.php
 *   Encabezado:  Authorization: Bearer <clave de 64 caracteres>
 *   Cuerpo JSON: {"clientes": [ {cliente completo}, ... ]}   (de 1 a 200)
 *
 * Respuestas:
 *   200  Paquete procesado. Trae cuántos se guardaron y la lista de
 *        rechazados con su motivo (los rechazados no detienen a los demás).
 *   400  Petición mal formada (no es JSON, no trae la lista, más de 200).
 *   403  Clave ausente o incorrecta. No se toca nada.
 *   405  Método distinto de POST.
 *   500  Falla del servidor. No se guardó NADA del paquete; reintentar.
 *
 * Los secretos (clave y acceso a MySQL) viven fuera de public_html, en
 * /home/commxprolomer/siap_config/api_web.php. Este archivo no tiene ninguno.
 */

declare(strict_types=1);

const RUTA_CONFIG  = '/home/commxprolomer/siap_config/api_web.php';
const RUTA_LOG     = '/home/commxprolomer/siap_config/api_web.log';
const MAX_CLIENTES = 200;
const MAX_BYTES    = 2000000; // 2 MB por petición

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Contesta con un código HTTP y un JSON, y termina. */
function responder(int $codigo, array $datos): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Anota un renglón en el log del servidor (fuera de public_html). */
function anotar(string $mensaje): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    error_log(date('Y-m-d H:i:s') . " [clientes] [$ip] $mensaje\n", 3, RUTA_LOG);
}

/** Lee la clave del encabezado "Authorization: Bearer ...". */
function leer_clave(): string
{
    // Según cómo corre PHP en el hosting, el encabezado llega por distintos lados.
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $nombre => $valor) {
            if (strcasecmp($nombre, 'Authorization') === 0) {
                $h = $valor;
            }
        }
    }
    if (preg_match('/^Bearer\s+(\S+)$/i', trim($h), $m)) {
        return $m[1];
    }
    return '';
}

function es_fecha(string $s): bool
{
    $d = DateTime::createFromFormat('!Y-m-d', $s);
    return $d !== false && $d->format('Y-m-d') === $s;
}

function es_fecha_hora(string $s): bool
{
    $d = DateTime::createFromFormat('Y-m-d H:i:s', $s);
    return $d !== false && $d->format('Y-m-d H:i:s') === $s;
}

/**
 * Texto opcional: null se queda null; un texto se guarda sin espacios sobrantes.
 * Devuelve [valor, motivo de error o null].
 */
function texto_opcional(array $c, string $campo, int $largo_max): array
{
    if (!array_key_exists($campo, $c) || $c[$campo] === null) {
        return [null, null];
    }
    if (!is_string($c[$campo])) {
        return [null, "$campo debe ser texto"];
    }
    $v = trim($c[$campo]);
    if (mb_strlen($v) > $largo_max) {
        return [null, "$campo mide más de $largo_max caracteres"];
    }
    return [$v, null];
}

/** Entero positivo opcional (null permitido). */
function entero_opcional(array $c, string $campo): array
{
    if (!array_key_exists($campo, $c) || $c[$campo] === null) {
        return [null, null];
    }
    $v = filter_var($c[$campo], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($v === false) {
        return [null, "$campo debe ser un número entero positivo"];
    }
    return [$v, null];
}

/**
 * Revisa un cliente. Devuelve [cliente limpio, motivo de rechazo o null].
 * $ejecutivos y $grupos son los IDs que existen en la web.
 */
function validar_cliente($c, array $ejecutivos, array $grupos): array
{
    if (!is_array($c)) {
        return [null, 'el cliente no es un objeto JSON'];
    }

    $l = [];

    // id_cliente: obligatorio, el mismo ID de Sicas
    [$l['id_cliente'], $e] = entero_opcional($c, 'id_cliente');
    if ($e) return [null, $e];
    if ($l['id_cliente'] === null) return [null, 'falta id_cliente'];

    // persona
    $persona = $c['persona'] ?? null;
    if ($persona !== 'FISICA' && $persona !== 'MORAL') {
        return [null, 'persona debe ser FISICA o MORAL'];
    }
    $l['persona'] = $persona;

    // Textos
    foreach (['nombre' => 100, 'paterno' => 100, 'materno' => 100,
              'razon_social' => 255, 'rfc' => 13, 'curp' => 18] as $campo => $max) {
        [$l[$campo], $e] = texto_opcional($c, $campo, $max);
        if ($e) return [null, $e];
    }

    // Reglas de persona física / moral
    if ($persona === 'MORAL' && ($l['razon_social'] === null || $l['razon_social'] === '')) {
        return [null, 'persona moral sin razón social'];
    }
    if ($persona === 'FISICA') {
        if ($l['nombre'] === null || $l['nombre'] === '') return [null, 'persona física sin nombre'];
        if ($l['paterno'] === null || $l['paterno'] === '') return [null, 'persona física sin apellido paterno'];
    }

    // fecha_nacimiento (en morales, fecha de constitución)
    $fn = $c['fecha_nacimiento'] ?? null;
    if ($fn !== null && (!is_string($fn) || !es_fecha($fn))) {
        return [null, 'fecha_nacimiento no es una fecha válida (AAAA-MM-DD)'];
    }
    $l['fecha_nacimiento'] = $fn;

    // genero
    $g = $c['genero'] ?? null;
    if ($g !== null && $g !== 'MASCULINO' && $g !== 'FEMENINO') {
        return [null, 'genero debe ser MASCULINO, FEMENINO o null'];
    }
    if ($persona === 'FISICA' && $g === null) {
        return [null, 'persona física sin género'];
    }
    $l['genero'] = $g;

    // id_grupo (opcional) y id_ejecutivo (obligatorio): deben existir en la web
    [$l['id_grupo'], $e] = entero_opcional($c, 'id_grupo');
    if ($e) return [null, $e];
    if ($l['id_grupo'] !== null && !isset($grupos[$l['id_grupo']])) {
        return [null, "el grupo {$l['id_grupo']} no existe en la web"];
    }

    [$l['id_ejecutivo'], $e] = entero_opcional($c, 'id_ejecutivo');
    if ($e) return [null, $e];
    if ($l['id_ejecutivo'] === null) return [null, 'falta id_ejecutivo'];
    if (!isset($ejecutivos[$l['id_ejecutivo']])) {
        return [null, "el ejecutivo {$l['id_ejecutivo']} no existe en la web"];
    }

    // id_usuario: obligatorio (todavía sin tabla usuarios)
    [$l['id_usuario'], $e] = entero_opcional($c, 'id_usuario');
    if ($e) return [null, $e];
    if ($l['id_usuario'] === null) return [null, 'falta id_usuario'];

    // estatus
    $st = $c['estatus'] ?? null;
    if ($st !== 'ACTIVO' && $st !== 'INACTIVO') {
        return [null, 'estatus debe ser ACTIVO o INACTIVO'];
    }
    $l['estatus'] = $st;

    // fecha_creacion
    $fc = $c['fecha_creacion'] ?? null;
    if ($fc !== null && (!is_string($fc) || !es_fecha_hora($fc))) {
        return [null, 'fecha_creacion no es una fecha y hora válida (AAAA-MM-DD HH:MM:SS)'];
    }
    $l['fecha_creacion'] = $fc;

    // contratante es columna generada y fecha_modificacion la pone MySQL:
    // si vienen, se ignoran.
    return [$l, null];
}

// ---------------------------------------------------------------------------
// 1. Método
// ---------------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responder(405, ['ok' => false, 'error' => 'Solo se acepta POST']);
}

// ---------------------------------------------------------------------------
// 2. Configuración
// ---------------------------------------------------------------------------

if (!is_readable(RUTA_CONFIG)) {
    anotar('No se puede leer el archivo de configuración');
    responder(500, ['ok' => false, 'error' => 'Error de configuración del servidor']);
}
$cfg = require RUTA_CONFIG;
$clave_correcta = $cfg['api_key'] ?? '';
if (!is_string($clave_correcta) || strlen($clave_correcta) !== 64) {
    anotar('La clave de la configuración no tiene 64 caracteres');
    responder(500, ['ok' => false, 'error' => 'Error de configuración del servidor']);
}

// ---------------------------------------------------------------------------
// 3. Autorización
// ---------------------------------------------------------------------------

if (!hash_equals($clave_correcta, leer_clave())) {
    anotar('Intento con clave ausente o incorrecta');
    responder(403, ['ok' => false, 'error' => 'No autorizado']);
}

// ---------------------------------------------------------------------------
// 4. Cuerpo de la petición
// ---------------------------------------------------------------------------

$cuerpo = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if ($cuerpo === false || $cuerpo === '') {
    responder(400, ['ok' => false, 'error' => 'La petición viene vacía']);
}
if (strlen($cuerpo) > MAX_BYTES) {
    responder(400, ['ok' => false, 'error' => 'La petición pesa más de 2 MB; mandar paquetes más chicos']);
}

$datos = json_decode($cuerpo, true);
if (!is_array($datos)) {
    responder(400, ['ok' => false, 'error' => 'El cuerpo no es JSON válido']);
}
$lista = $datos['clientes'] ?? null;
if (!is_array($lista) || count($lista) === 0) {
    responder(400, ['ok' => false, 'error' => 'Falta la lista "clientes" o viene vacía']);
}
if (count($lista) > MAX_CLIENTES) {
    responder(400, ['ok' => false, 'error' => 'Máximo ' . MAX_CLIENTES . ' clientes por paquete']);
}

// ---------------------------------------------------------------------------
// 5. Guardar
// ---------------------------------------------------------------------------

$sql = 'INSERT INTO clientes
          (id_cliente, persona, nombre, paterno, materno, razon_social,
           fecha_nacimiento, genero, rfc, curp, id_grupo, id_ejecutivo,
           id_usuario, estatus, fecha_creacion)
        VALUES
          (:id_cliente, :persona, :nombre, :paterno, :materno, :razon_social,
           :fecha_nacimiento, :genero, :rfc, :curp, :id_grupo, :id_ejecutivo,
           :id_usuario, :estatus, :fecha_creacion)
        ON DUPLICATE KEY UPDATE
          persona          = VALUES(persona),
          nombre           = VALUES(nombre),
          paterno          = VALUES(paterno),
          materno          = VALUES(materno),
          razon_social     = VALUES(razon_social),
          fecha_nacimiento = VALUES(fecha_nacimiento),
          genero           = VALUES(genero),
          rfc              = VALUES(rfc),
          curp             = VALUES(curp),
          id_grupo         = VALUES(id_grupo),
          id_ejecutivo     = VALUES(id_ejecutivo),
          id_usuario       = VALUES(id_usuario),
          estatus          = VALUES(estatus),
          fecha_creacion   = VALUES(fecha_creacion)';

$guardados  = 0;
$rechazados = [];

try {
    $pdo = new PDO(
        "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4",
        $cfg['db_user'],
        $cfg['db_pass'],
        [
            PDO::ATTR_ERRMODE          => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    // IDs que existen en la web, para revisar las llaves foráneas antes de guardar
    $ejecutivos = array_flip(array_map('intval',
        $pdo->query('SELECT id_ejecutivo FROM ejecutivos')->fetchAll(PDO::FETCH_COLUMN)));
    $grupos = array_flip(array_map('intval',
        $pdo->query('SELECT id_grupo FROM grupos')->fetchAll(PDO::FETCH_COLUMN)));

    $stmt = $pdo->prepare($sql);
    $pdo->beginTransaction();

    foreach ($lista as $i => $c) {
        [$limpio, $motivo] = validar_cliente($c, $ejecutivos, $grupos);
        if ($motivo !== null) {
            $id = (is_array($c) && isset($c['id_cliente']) && is_scalar($c['id_cliente']))
                ? $c['id_cliente'] : null;
            $rechazados[] = ['posicion' => $i, 'id_cliente' => $id, 'motivo' => $motivo];
            continue;
        }

        try {
            $stmt->execute($limpio);
            $guardados++;
        } catch (PDOException $e) {
            // 22xxx (dato fuera de rango) o 23xxx (llave/restricción): se rechaza
            // solo este cliente. Cualquier otro error detiene todo el paquete.
            $estado = (string)$e->getCode();
            if (strpos($estado, '22') === 0 || strpos($estado, '23') === 0) {
                $rechazados[] = [
                    'posicion'   => $i,
                    'id_cliente' => $limpio['id_cliente'],
                    'motivo'     => 'la base de datos lo rechazó (' . $estado . ')',
                ];
                anotar("Cliente {$limpio['id_cliente']} rechazado por MySQL: " . $e->getMessage());
                continue;
            }
            throw $e;
        }
    }

    $pdo->commit();
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    anotar('Falla al guardar el paquete: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'Falla del servidor; no se guardó nada de este paquete']);
}

if ($rechazados) {
    anotar(count($rechazados) . ' rechazado(s) de ' . count($lista) . ': '
        . json_encode($rechazados, JSON_UNESCAPED_UNICODE));
}

responder(200, [
    'ok'         => true,
    'recibidos'  => count($lista),
    'guardados'  => $guardados,
    'rechazados' => $rechazados,
]);
